-- ==========================================================================
-- Member approval flow
--
-- Joiners via invite link go into 'pending' state.
-- Trip owner must explicitly approve before they see trip data.
-- Owners themselves are always auto-approved.
-- ==========================================================================


-- 1. Add status column to trip_members
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved'));

-- Backfill existing rows (anyone already in trip_members before this is approved)
UPDATE public.trip_members SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trip_members_status ON public.trip_members(trip_id, status);


-- 2. Tighten helper functions: only count approved members
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_editor(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
      AND status = 'approved'
  );
$$;


-- 3. Update trip_members policies
DROP POLICY IF EXISTS "trip_members_select" ON public.trip_members;
CREATE POLICY "trip_members_select"
  ON public.trip_members FOR SELECT
  USING (
    user_id = auth.uid()                           -- always see your own row (pending or approved)
    OR public.is_trip_member(trip_id)               -- or other members of trips you're approved in
    OR trip_id IN (                                 -- or owner sees everyone (incl. pending)
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
    )
  );

-- Owners can approve/reject pending members
DROP POLICY IF EXISTS "trip_members_update" ON public.trip_members;
CREATE POLICY "trip_members_update"
  ON public.trip_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );


-- 4. Owner trigger: insert as 'approved' (the new default is 'pending')
CREATE OR REPLACE FUNCTION public.handle_new_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'approved');
  RETURN NEW;
END;
$$;


-- 5. accept_invite now creates a pending row instead of joining outright
CREATE OR REPLACE FUNCTION public.accept_invite(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_existing record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.trip_invites
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Invite usage limit reached';
  END IF;

  -- Already in trip_members?
  SELECT id, status INTO v_existing
  FROM public.trip_members
  WHERE trip_id = v_invite.trip_id AND user_id = v_user_id;

  IF v_existing.id IS NOT NULL THEN
    RETURN json_build_object(
      'already_member', true,
      'status', v_existing.status,
      'trip_id', v_invite.trip_id
    );
  END IF;

  -- New: insert as pending
  INSERT INTO public.trip_members (trip_id, user_id, role, status)
  VALUES (v_invite.trip_id, v_user_id, v_invite.role, 'pending');

  UPDATE public.trip_invites
  SET used_count = used_count + 1
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'pending', true,
    'trip_id', v_invite.trip_id,
    'role', v_invite.role
  );
END;
$$;


-- 6. RPC for owner approval (atomic, with permission check)
CREATE OR REPLACE FUNCTION public.approve_trip_member(p_member_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_member record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT tm.id, tm.trip_id, tm.user_id, tm.status, t.owner_id
  INTO v_member
  FROM public.trip_members tm
  JOIN public.trips t ON t.id = tm.trip_id
  WHERE tm.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_member.owner_id <> v_caller THEN
    RAISE EXCEPTION 'Only trip owner can approve members';
  END IF;

  UPDATE public.trip_members
  SET status = 'approved'
  WHERE id = p_member_id;

  RETURN json_build_object('approved', true, 'trip_id', v_member.trip_id);
END;
$$;
