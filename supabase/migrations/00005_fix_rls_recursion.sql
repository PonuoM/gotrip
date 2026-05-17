-- ==========================================================================
-- Fix infinite recursion in trip_members RLS policy
--
-- Problem: trip_members_select USING clause queried trip_members itself,
-- causing Postgres to recursively evaluate the policy.
--
-- Fix: introduce a SECURITY DEFINER helper that bypasses RLS when checking
-- membership, then rewrite the policy to use it.
-- ==========================================================================


-- Helper: is the current user a member of this trip?
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid()
  );
$$;


-- Helper: is the current user an editor/owner of this trip?
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
  );
$$;


-- Replace the recursive SELECT policy
DROP POLICY IF EXISTS "trip_members_select" ON public.trip_members;

CREATE POLICY "trip_members_select"
  ON public.trip_members FOR SELECT
  USING (public.is_trip_member(trip_id));
