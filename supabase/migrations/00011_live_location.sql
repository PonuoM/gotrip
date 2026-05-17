-- ==========================================================================
-- Live GPS sharing per trip member
-- - current_lat / current_lng: latest reported position
-- - current_location_at: when the position was reported (TTL on display)
--
-- The member can stop sharing by clearing these (we set them to NULL on stop).
-- Position is updated client-side via navigator.geolocation.
-- ==========================================================================

ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS current_lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS current_lng numeric(10, 7),
  ADD COLUMN IF NOT EXISTS current_location_at timestamptz;

-- Updating own position is allowed by existing trip_members_update policy
-- (user_id = auth.uid()), so no new policy is needed.

-- Helper RPC: bulk-clear stale positions older than N hours
CREATE OR REPLACE FUNCTION public.clear_stale_locations(p_hours int DEFAULT 6)
RETURNS int
LANGUAGE sql
AS $$
  WITH updated AS (
    UPDATE public.trip_members
       SET current_lat = NULL, current_lng = NULL, current_location_at = NULL
     WHERE current_location_at IS NOT NULL
       AND current_location_at < now() - (p_hours || ' hours')::interval
     RETURNING id
  )
  SELECT COUNT(*)::int FROM updated;
$$;
