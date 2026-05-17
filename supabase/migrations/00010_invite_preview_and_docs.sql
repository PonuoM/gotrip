-- ==========================================================================
-- Two changes:
-- 1. RPC for invite preview (lets non-members see invite + trip basics
--    without breaking the strict trip_invites SELECT policy)
-- 2. Extend documents: display_name, description, group_id (for bundling
--    multiple files under one entry — e.g. several hotel confirmations)
-- ==========================================================================


-- ===== 1. Invite preview RPC ============================================

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_code text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'id',          ti.id,
    'code',        ti.code,
    'role',        ti.role,
    'max_uses',    ti.max_uses,
    'used_count',  ti.used_count,
    'expires_at',  ti.expires_at,
    'trip', json_build_object(
      'id',          t.id,
      'name',        t.name,
      'destination', t.destination,
      'start_date',  t.start_date,
      'end_date',    t.end_date,
      'cover_url',   t.cover_url,
      'owner_id',    t.owner_id
    ),
    'owner', json_build_object(
      'display_name', up.display_name,
      'avatar_url',   up.avatar_url
    )
  )
  FROM public.trip_invites ti
  JOIN public.trips t          ON t.id = ti.trip_id
  LEFT JOIN public.user_profiles up ON up.id = t.owner_id
  WHERE ti.code = p_code;
$$;


-- ===== 2. Documents — bundle support ====================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS group_id     uuid;

-- Backfill display_name from filename for existing rows
UPDATE public.documents
   SET display_name = filename
 WHERE display_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_group ON public.documents(group_id);
