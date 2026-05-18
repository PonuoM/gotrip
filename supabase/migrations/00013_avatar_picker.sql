-- ==========================================================================
-- Custom avatar: pick an animal sticker + a background colour. Renders
-- as a coloured circle with the PNG overlaid (see AvatarBadge component).
-- Falls back to the first letter of display_name when avatar_animal is null.
-- ==========================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_animal text,
  ADD COLUMN IF NOT EXISTS avatar_bg_color text;
