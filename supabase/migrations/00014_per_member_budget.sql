-- ==========================================================================
-- Per-member budget. Each trip member can set their own budget (e.g. ธนู
-- 30,000 ฿ but Poom 50,000 ฿). The existing trips.budget_amount remains
-- available as an optional "group" budget but the primary UI shows each
-- viewer's own budget vs their own share of expenses.
-- ==========================================================================

ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS budget_amount numeric(12, 2);
