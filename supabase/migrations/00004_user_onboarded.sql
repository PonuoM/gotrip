-- ==========================================================================
-- Add onboarded flag to user_profiles
-- Tracks whether user has completed first-time setup (chose display_name)
-- ==========================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Backfill existing rows as not onboarded (they'll go through flow on next login)
-- Default false is fine for both old and new rows.
