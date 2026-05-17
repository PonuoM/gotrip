-- ==========================================================================
-- Fix recursion reintroduced by 00006
--
-- 00006 added: `OR trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())`
-- to trip_members_select. That subquery hits trips_select policy, which hits
-- trip_members_select, which hits trips_select... → infinite loop.
--
-- The clause was redundant anyway: owners are always inserted into
-- trip_members with status='approved' by the handle_new_trip trigger, so
-- is_trip_member(trip_id) already returns true for them.
-- ==========================================================================

DROP POLICY IF EXISTS "trip_members_select" ON public.trip_members;

CREATE POLICY "trip_members_select"
  ON public.trip_members FOR SELECT
  USING (
    user_id = auth.uid()                  -- always see your own row (pending or approved)
    OR public.is_trip_member(trip_id)      -- or others (only if you're an approved member yourself)
  );
