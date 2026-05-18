-- ==========================================================================
-- 1. Expense splits with placeholder slots
--    - member_id becomes nullable: an empty slot ("ว่าง") that's reserved
--      for someone not yet in the trip.
--    - slot_label: optional human label ("เพื่อนพี่ตูน", "+1") shown until
--      claimed.
--    - settled_proof_url: photo of bank transfer / cash hand-off for the
--      moment a settle is marked.
--
-- 2. Per-member checklist ticks
--    - For shared items (member_id IS NULL on checklist_items), each crew
--      member ticks independently. The item is "fully done" only when all
--      approved members have ticked.
-- ==========================================================================


-- ===== Expense splits =====================================================

ALTER TABLE public.expense_splits
  ADD COLUMN IF NOT EXISTS slot_label text,
  ADD COLUMN IF NOT EXISTS settled_proof_url text;

-- Was NOT NULL; relax so we can have placeholder slots
ALTER TABLE public.expense_splits
  ALTER COLUMN member_id DROP NOT NULL;

-- Unique constraint (expense_id, member_id) becomes too strict when many
-- slots have member_id=NULL — drop it, replace with partial unique index
-- that only enforces uniqueness when member_id is set.
ALTER TABLE public.expense_splits
  DROP CONSTRAINT IF EXISTS expense_splits_expense_id_member_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_splits_unique_member
  ON public.expense_splits(expense_id, member_id)
  WHERE member_id IS NOT NULL;


-- RPC: claim an empty slot for a member (atomic + permission-checked)
CREATE OR REPLACE FUNCTION public.claim_expense_slot(
  p_split_id uuid,
  p_member_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_split     record;
  v_member    record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT es.id, es.expense_id, es.member_id, e.trip_id
    INTO v_split
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
   WHERE es.id = p_split_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'split not found'; END IF;
  IF v_split.member_id IS NOT NULL THEN RAISE EXCEPTION 'slot already claimed'; END IF;

  SELECT id, user_id, trip_id, status
    INTO v_member
    FROM public.trip_members
   WHERE id = p_member_id;

  IF NOT FOUND OR v_member.trip_id <> v_split.trip_id THEN
    RAISE EXCEPTION 'member not in trip';
  END IF;

  -- Caller must be an approved member of the same trip
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = v_split.trip_id AND user_id = v_caller AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Prevent assigning same person twice to same expense
  IF EXISTS (
    SELECT 1 FROM public.expense_splits
    WHERE expense_id = v_split.expense_id AND member_id = p_member_id
  ) THEN
    RAISE EXCEPTION 'member already has a split on this expense';
  END IF;

  UPDATE public.expense_splits
     SET member_id = p_member_id,
         slot_label = NULL
   WHERE id = p_split_id;

  RETURN json_build_object('claimed', true, 'split_id', p_split_id, 'member_id', p_member_id);
END;
$$;


-- ===== Checklist per-member ticks =========================================

CREATE TABLE IF NOT EXISTS public.checklist_item_ticks (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.trip_members(id)   ON DELETE CASCADE,
  ticked_at   timestamptz DEFAULT now(),
  UNIQUE(item_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_ticks_item   ON public.checklist_item_ticks(item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_ticks_member ON public.checklist_item_ticks(member_id);

ALTER TABLE public.checklist_item_ticks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_item_ticks_select" ON public.checklist_item_ticks;
CREATE POLICY "checklist_item_ticks_select"
  ON public.checklist_item_ticks FOR SELECT
  USING (
    item_id IN (
      SELECT ci.id FROM public.checklist_items ci
      JOIN public.checklists c ON c.id = ci.checklist_id
      WHERE public.is_trip_member(c.trip_id)
    )
  );

-- Members can tick / untick on behalf of themselves only
DROP POLICY IF EXISTS "checklist_item_ticks_insert" ON public.checklist_item_ticks;
CREATE POLICY "checklist_item_ticks_insert"
  ON public.checklist_item_ticks FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM public.trip_members WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

DROP POLICY IF EXISTS "checklist_item_ticks_delete" ON public.checklist_item_ticks;
CREATE POLICY "checklist_item_ticks_delete"
  ON public.checklist_item_ticks FOR DELETE
  USING (
    member_id IN (
      SELECT id FROM public.trip_members WHERE user_id = auth.uid() AND status = 'approved'
    )
  );
