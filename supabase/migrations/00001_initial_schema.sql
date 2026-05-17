-- ==========================================================================
-- TripPal — Initial Schema
-- Migration 00001 · 17 May 2026
--
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ==========================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==========================================================================
-- USER PROFILES (extends Supabase auth.users)
-- ==========================================================================
CREATE TABLE public.user_profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text NOT NULL,
  avatar_url       text,
  phone            text,
  date_of_birth    date,
  preferred_lang   text DEFAULT 'th',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_user_profiles_display_name ON public.user_profiles(display_name);


-- ==========================================================================
-- TRIPS
-- ==========================================================================
CREATE TABLE public.trips (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             text NOT NULL,
  destination      text,
  description      text,
  cover_url        text,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  status           text NOT NULL DEFAULT 'planning'
                   CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  default_currency text NOT NULL DEFAULT 'THB',
  budget_amount    numeric(12, 2),
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX idx_trips_owner ON public.trips(owner_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_dates ON public.trips(start_date, end_date);


-- ==========================================================================
-- TRIP MEMBERS
-- ==========================================================================
CREATE TABLE public.trip_members (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id             uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                text NOT NULL DEFAULT 'editor'
                      CHECK (role IN ('owner', 'editor', 'viewer')),
  display_name        text,                  -- override for this trip (nullable)
  passport_no         text,                  -- TODO: encrypt
  nationality         text,
  phone               text,
  allergies           text,
  dietary             text,
  emergency_contact   text,
  joined_at           timestamptz DEFAULT now(),

  UNIQUE(trip_id, user_id)
);

CREATE INDEX idx_trip_members_trip ON public.trip_members(trip_id);
CREATE INDEX idx_trip_members_user ON public.trip_members(user_id);


-- ==========================================================================
-- ACTIVITY TYPES (configurable!)
-- ==========================================================================
CREATE TABLE public.activity_types (
  id              text PRIMARY KEY,           -- 'flight', 'hotel', 'food', ...
  label_th        text NOT NULL,
  label_en        text NOT NULL,
  icon            text NOT NULL,              -- emoji or icon name
  color           text NOT NULL DEFAULT '#1A1A1A',
  sort_order      int DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);


-- ==========================================================================
-- ACTIVITIES
-- ==========================================================================
CREATE TABLE public.activities (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type_id         text REFERENCES public.activity_types(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  day_number      int,                        -- 1, 2, 3...
  start_at        timestamptz,
  end_at          timestamptz,
  location_name   text,
  address         text,
  latitude        numeric(10, 7),
  longitude       numeric(10, 7),
  cost_amount     numeric(12, 2),
  cost_currency   text DEFAULT 'THB',
  status          text NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('idea', 'planned', 'booked', 'done', 'cancelled')),
  url             text,
  booking_ref     text,
  notes           text,
  sort_order      int DEFAULT 0,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_activities_trip_day ON public.activities(trip_id, day_number);
CREATE INDEX idx_activities_start ON public.activities(start_at);
CREATE INDEX idx_activities_status ON public.activities(status);


-- ==========================================================================
-- ACTIVITY ASSIGNMENTS (who's going to which activity)
-- ==========================================================================
CREATE TABLE public.activity_assignments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id     uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  member_id       uuid NOT NULL REFERENCES public.trip_members(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'going'
                  CHECK (status IN ('going', 'maybe', 'skip')),
  created_at      timestamptz DEFAULT now(),

  UNIQUE(activity_id, member_id)
);

CREATE INDEX idx_activity_assignments_activity ON public.activity_assignments(activity_id);
CREATE INDEX idx_activity_assignments_member ON public.activity_assignments(member_id);


-- ==========================================================================
-- EXPENSE CATEGORIES (configurable!)
-- ==========================================================================
CREATE TABLE public.expense_categories (
  id              text PRIMARY KEY,           -- 'food', 'transport', ...
  label_th        text NOT NULL,
  label_en        text NOT NULL,
  icon            text NOT NULL,
  color           text NOT NULL DEFAULT '#1A1A1A',
  sort_order      int DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);


-- ==========================================================================
-- EXPENSES
-- ==========================================================================
CREATE TABLE public.expenses (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id           uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  activity_id       uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  category_id       text REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description       text NOT NULL,
  amount            numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'THB',
  fx_rate_to_thb    numeric(10, 4),           -- snapshot of conversion rate
  paid_by           uuid REFERENCES public.trip_members(id) ON DELETE SET NULL,
  paid_at           date DEFAULT CURRENT_DATE,
  receipt_url       text,
  notes             text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_expenses_trip ON public.expenses(trip_id);
CREATE INDEX idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);


-- ==========================================================================
-- EXPENSE SPLITS (who owes what)
-- ==========================================================================
CREATE TABLE public.expense_splits (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id      uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  member_id       uuid NOT NULL REFERENCES public.trip_members(id) ON DELETE CASCADE,
  share_amount    numeric(12, 2) NOT NULL,
  is_settled      boolean DEFAULT false,
  settled_at      timestamptz,

  UNIQUE(expense_id, member_id)
);

CREATE INDEX idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_member ON public.expense_splits(member_id);


-- ==========================================================================
-- DOCUMENTS (files attached to trip/activity)
-- ==========================================================================
CREATE TABLE public.documents (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  activity_id     uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  filename        text NOT NULL,
  file_url        text NOT NULL,             -- Supabase Storage URL
  file_size       int,                       -- bytes
  mime_type       text,
  category        text DEFAULT 'other'
                  CHECK (category IN ('ticket', 'hotel', 'insurance', 'id', 'receipt', 'other')),
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_trip ON public.documents(trip_id);
CREATE INDEX idx_documents_activity ON public.documents(activity_id);


-- ==========================================================================
-- CHECKLISTS
-- ==========================================================================
CREATE TABLE public.checklists (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title           text NOT NULL,
  is_shared       boolean DEFAULT true,      -- true = everyone has same items
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_checklists_trip ON public.checklists(trip_id);


-- ==========================================================================
-- CHECKLIST ITEMS
-- ==========================================================================
CREATE TABLE public.checklist_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id    uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  member_id       uuid REFERENCES public.trip_members(id) ON DELETE CASCADE, -- null = everyone
  is_done         boolean DEFAULT false,
  done_at         timestamptz,
  sort_order      int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_checklist_items_list ON public.checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_member ON public.checklist_items(member_id);


-- ==========================================================================
-- TRIP INVITES (shareable links)
-- ==========================================================================
CREATE TABLE public.trip_invites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  code            text UNIQUE NOT NULL,      -- short slug e.g. "abc123xyz"
  role            text NOT NULL DEFAULT 'editor'
                  CHECK (role IN ('editor', 'viewer')),
  max_uses        int,                       -- null = unlimited
  used_count      int DEFAULT 0,
  expires_at      timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_trip_invites_code ON public.trip_invites(code);
CREATE INDEX idx_trip_invites_trip ON public.trip_invites(trip_id);


-- ==========================================================================
-- DONE! 11 tables created.
-- Run 00002_rls_policies.sql next.
-- ==========================================================================
