-- ==========================================================================
-- TripPal — Row-Level Security Policies
-- Migration 00002 · 17 May 2026
--
-- Run after 00001_initial_schema.sql
-- ==========================================================================

-- ==========================================================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================================================
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites           ENABLE ROW LEVEL SECURITY;


-- ==========================================================================
-- USER PROFILES
-- ==========================================================================

-- Anyone can view profiles of members in trips they're in
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM public.trip_members
      WHERE trip_id IN (
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can only insert/update their own profile
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "user_profiles_update" ON public.user_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "user_profiles_delete" ON public.user_profiles FOR DELETE USING (id = auth.uid());


-- ==========================================================================
-- TRIPS
-- ==========================================================================

-- Can see trips where you're a member
CREATE POLICY "trips_select"
  ON public.trips FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

-- Only authenticated users can create trips (they become owner)
CREATE POLICY "trips_insert"
  ON public.trips FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only owner can update trip
CREATE POLICY "trips_update"
  ON public.trips FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owner can delete trip
CREATE POLICY "trips_delete"
  ON public.trips FOR DELETE
  USING (owner_id = auth.uid());


-- ==========================================================================
-- TRIP MEMBERS
-- ==========================================================================

-- Can see members of trips you're in
CREATE POLICY "trip_members_select"
  ON public.trip_members FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

-- Owner can add members, or user can add themselves (via invite)
CREATE POLICY "trip_members_insert"
  ON public.trip_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()    -- joining yourself (via invite flow)
    OR trip_id IN (         -- owner adding others
      SELECT id FROM public.trips WHERE owner_id = auth.uid()
    )
  );

-- Owner can update any member, or member can update themselves
CREATE POLICY "trip_members_update"
  ON public.trip_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

-- Owner can remove anyone, or member can remove themselves
CREATE POLICY "trip_members_delete"
  ON public.trip_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );


-- ==========================================================================
-- ACTIVITY TYPES (public read, no write from clients)
-- ==========================================================================
CREATE POLICY "activity_types_select" ON public.activity_types FOR SELECT USING (true);


-- ==========================================================================
-- ACTIVITIES
-- ==========================================================================

-- Can see activities of trips you're in
CREATE POLICY "activities_select"
  ON public.activities FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

-- Editors+ can insert
CREATE POLICY "activities_insert"
  ON public.activities FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Editors+ can update
CREATE POLICY "activities_update"
  ON public.activities FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Editors+ can delete
CREATE POLICY "activities_delete"
  ON public.activities FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );


-- ==========================================================================
-- ACTIVITY ASSIGNMENTS
-- ==========================================================================
CREATE POLICY "activity_assignments_select"
  ON public.activity_assignments FOR SELECT
  USING (
    activity_id IN (
      SELECT id FROM public.activities WHERE trip_id IN (
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "activity_assignments_all"
  ON public.activity_assignments FOR ALL
  USING (
    member_id IN (SELECT id FROM public.trip_members WHERE user_id = auth.uid())
  );


-- ==========================================================================
-- EXPENSE CATEGORIES (public read)
-- ==========================================================================
CREATE POLICY "expense_categories_select" ON public.expense_categories FOR SELECT USING (true);


-- ==========================================================================
-- EXPENSES
-- ==========================================================================
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "expenses_update"
  ON public.expenses FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );


-- ==========================================================================
-- EXPENSE SPLITS
-- ==========================================================================
CREATE POLICY "expense_splits_select"
  ON public.expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE trip_id IN (
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "expense_splits_all"
  ON public.expense_splits FOR ALL
  USING (
    expense_id IN (
      SELECT id FROM public.expenses WHERE trip_id IN (
        SELECT trip_id FROM public.trip_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );


-- ==========================================================================
-- DOCUMENTS
-- ==========================================================================
CREATE POLICY "documents_select"
  ON public.documents FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "documents_all"
  ON public.documents FOR ALL
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );


-- ==========================================================================
-- CHECKLISTS
-- ==========================================================================
CREATE POLICY "checklists_select"
  ON public.checklists FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "checklists_all"
  ON public.checklists FOR ALL
  USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );


-- ==========================================================================
-- CHECKLIST ITEMS
-- ==========================================================================
CREATE POLICY "checklist_items_select"
  ON public.checklist_items FOR SELECT
  USING (
    checklist_id IN (
      SELECT id FROM public.checklists WHERE trip_id IN (
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "checklist_items_all"
  ON public.checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT id FROM public.checklists WHERE trip_id IN (
        SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid()
      )
    )
  );


-- ==========================================================================
-- TRIP INVITES (everyone in trip can see, only owner can create)
-- ==========================================================================
CREATE POLICY "trip_invites_select"
  ON public.trip_invites FOR SELECT
  USING (
    trip_id IN (SELECT trip_id FROM public.trip_members WHERE user_id = auth.uid())
    -- Or anyone with the code can read (for accepting invite)
    -- (handled via service role in API)
  );

CREATE POLICY "trip_invites_insert"
  ON public.trip_invites FOR INSERT
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

CREATE POLICY "trip_invites_delete"
  ON public.trip_invites FOR DELETE
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );


-- ==========================================================================
-- DONE! All RLS policies in place.
-- Run 00003_helpers.sql next.
-- ==========================================================================
