-- ==========================================================================
-- TripPal — Helper Functions & Triggers
-- Migration 00003 · 17 May 2026
-- ==========================================================================


-- ==========================================================================
-- Auto-create user_profile when user signs up
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================================================
-- Auto-add owner as trip_member when trip is created
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip();


-- ==========================================================================
-- Auto-update updated_at timestamp
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==========================================================================
-- Calculate debt summary for a trip (RPC function)
-- Returns: who owes whom, net amounts
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.calculate_trip_debts(p_trip_id uuid)
RETURNS TABLE (
  from_member_id uuid,
  from_member_name text,
  to_member_id uuid,
  to_member_name text,
  amount numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH balances AS (
    -- For each member, calculate (paid - owed)
    SELECT
      tm.id AS member_id,
      COALESCE(SUM(CASE WHEN e.paid_by = tm.id THEN e.amount ELSE 0 END), 0) AS total_paid,
      COALESCE(SUM(es.share_amount) FILTER (WHERE NOT es.is_settled), 0) AS total_owed
    FROM public.trip_members tm
    LEFT JOIN public.expenses e ON e.trip_id = tm.trip_id
    LEFT JOIN public.expense_splits es ON es.member_id = tm.id
    WHERE tm.trip_id = p_trip_id
    GROUP BY tm.id
  ),
  net_balances AS (
    SELECT
      member_id,
      (total_paid - total_owed) AS net_balance
    FROM balances
  )
  -- Simplified pairwise debt (advanced minimization algo can be added)
  SELECT
    es.member_id AS from_member_id,
    up_from.display_name AS from_member_name,
    e.paid_by AS to_member_id,
    up_to.display_name AS to_member_name,
    SUM(es.share_amount) AS amount
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  JOIN public.trip_members tm_from ON tm_from.id = es.member_id
  JOIN public.trip_members tm_to ON tm_to.id = e.paid_by
  JOIN public.user_profiles up_from ON up_from.id = tm_from.user_id
  JOIN public.user_profiles up_to ON up_to.id = tm_to.user_id
  WHERE e.trip_id = p_trip_id
    AND NOT es.is_settled
    AND es.member_id != e.paid_by
  GROUP BY es.member_id, up_from.display_name, e.paid_by, up_to.display_name
  ORDER BY amount DESC;
$$;


-- ==========================================================================
-- Calculate trip stats (RPC function)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.get_trip_stats(p_trip_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_spent', COALESCE((SELECT SUM(amount) FROM public.expenses WHERE trip_id = p_trip_id), 0),
    'total_activities', (SELECT COUNT(*) FROM public.activities WHERE trip_id = p_trip_id),
    'booked_activities', (SELECT COUNT(*) FROM public.activities WHERE trip_id = p_trip_id AND status = 'booked'),
    'total_members', (SELECT COUNT(*) FROM public.trip_members WHERE trip_id = p_trip_id),
    'currency', (SELECT default_currency FROM public.trips WHERE id = p_trip_id),
    'budget', (SELECT budget_amount FROM public.trips WHERE id = p_trip_id)
  );
$$;


-- ==========================================================================
-- Accept invite (RPC function)
-- Atomically: validate invite + add member + increment used_count
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.accept_invite(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_existing uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch and lock invite
  SELECT * INTO v_invite
  FROM public.trip_invites
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  -- Check expiration
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Check max uses
  IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Invite usage limit reached';
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing
  FROM public.trip_members
  WHERE trip_id = v_invite.trip_id AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('already_member', true, 'trip_id', v_invite.trip_id);
  END IF;

  -- Add as member
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_invite.trip_id, v_user_id, v_invite.role);

  -- Increment used_count
  UPDATE public.trip_invites
  SET used_count = used_count + 1
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'trip_id', v_invite.trip_id,
    'role', v_invite.role
  );
END;
$$;


-- ==========================================================================
-- DONE! Helpers ready.
-- Now run seed.sql to add activity_types and expense_categories.
-- ==========================================================================
