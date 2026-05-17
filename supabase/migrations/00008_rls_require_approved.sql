-- ==========================================================================
-- Tighten RLS: pending members must NOT see trip data
--
-- Problem: most select policies use
--   trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
-- which returns pending memberships too (since trip_members_select returns
-- own rows regardless of status). That lets pending users read activities,
-- expenses, etc. of trips they're awaiting approval for.
--
-- Fix: route all "is the caller a real member?" checks through the
-- is_trip_member() / is_trip_editor() helpers, which already require
-- status='approved'.
-- ==========================================================================


-- ----- ACTIVITIES ---------------------------------------------------------
DROP POLICY IF EXISTS "activities_select" ON public.activities;
CREATE POLICY "activities_select"
  ON public.activities FOR SELECT
  USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "activities_insert" ON public.activities;
CREATE POLICY "activities_insert"
  ON public.activities FOR INSERT
  WITH CHECK (public.is_trip_editor(trip_id));

DROP POLICY IF EXISTS "activities_update" ON public.activities;
CREATE POLICY "activities_update"
  ON public.activities FOR UPDATE
  USING (public.is_trip_editor(trip_id));

DROP POLICY IF EXISTS "activities_delete" ON public.activities;
CREATE POLICY "activities_delete"
  ON public.activities FOR DELETE
  USING (public.is_trip_editor(trip_id));


-- ----- ACTIVITY ASSIGNMENTS ----------------------------------------------
DROP POLICY IF EXISTS "activity_assignments_select" ON public.activity_assignments;
CREATE POLICY "activity_assignments_select"
  ON public.activity_assignments FOR SELECT
  USING (
    activity_id IN (
      SELECT id FROM public.activities WHERE public.is_trip_member(trip_id)
    )
  );

DROP POLICY IF EXISTS "activity_assignments_all" ON public.activity_assignments;
CREATE POLICY "activity_assignments_all"
  ON public.activity_assignments FOR ALL
  USING (
    activity_id IN (
      SELECT id FROM public.activities WHERE public.is_trip_member(trip_id)
    )
  );


-- ----- EXPENSES -----------------------------------------------------------
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT
  USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (public.is_trip_editor(trip_id));

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update"
  ON public.expenses FOR UPDATE
  USING (public.is_trip_editor(trip_id));

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  USING (public.is_trip_editor(trip_id));


-- ----- EXPENSE SPLITS -----------------------------------------------------
DROP POLICY IF EXISTS "expense_splits_select" ON public.expense_splits;
CREATE POLICY "expense_splits_select"
  ON public.expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.is_trip_member(trip_id)
    )
  );

DROP POLICY IF EXISTS "expense_splits_all" ON public.expense_splits;
CREATE POLICY "expense_splits_all"
  ON public.expense_splits FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE public.is_trip_editor(trip_id)
    )
  );


-- ----- DOCUMENTS ----------------------------------------------------------
DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select"
  ON public.documents FOR SELECT
  USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "documents_all" ON public.documents;
CREATE POLICY "documents_all"
  ON public.documents FOR ALL
  USING (public.is_trip_editor(trip_id));


-- ----- CHECKLISTS ---------------------------------------------------------
DROP POLICY IF EXISTS "checklists_select" ON public.checklists;
CREATE POLICY "checklists_select"
  ON public.checklists FOR SELECT
  USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "checklists_all" ON public.checklists;
CREATE POLICY "checklists_all"
  ON public.checklists FOR ALL
  USING (public.is_trip_editor(trip_id));


-- ----- CHECKLIST ITEMS ----------------------------------------------------
DROP POLICY IF EXISTS "checklist_items_select" ON public.checklist_items;
CREATE POLICY "checklist_items_select"
  ON public.checklist_items FOR SELECT
  USING (
    checklist_id IN (
      SELECT id FROM public.checklists WHERE public.is_trip_member(trip_id)
    )
  );

DROP POLICY IF EXISTS "checklist_items_all" ON public.checklist_items;
CREATE POLICY "checklist_items_all"
  ON public.checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT id FROM public.checklists WHERE public.is_trip_editor(trip_id)
    )
  );


-- ----- TRIP INVITES (members can see, only owner can create/delete) -------
DROP POLICY IF EXISTS "trip_invites_select" ON public.trip_invites;
CREATE POLICY "trip_invites_select"
  ON public.trip_invites FOR SELECT
  USING (public.is_trip_member(trip_id));


-- ----- TRIPS --------------------------------------------------------------
-- Allow seeing the trip if you're the owner, an approved member, OR have any
-- (pending) membership — so the waiting screen can still load trip basics.
DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select"
  ON public.trips FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_trip_member(id)
    OR id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

-- Note: the last clause looks recursive but isn't — trip_members_select
-- already short-circuits on user_id = auth.uid() without re-entering trips.
