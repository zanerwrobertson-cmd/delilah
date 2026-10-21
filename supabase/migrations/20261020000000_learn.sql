-- Learn feature: study_sets, study_materials, study_messages
-- Each table is RLS-protected to own rows only, matching the pattern in harden_rls.sql.
BEGIN;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.study_sets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title       text        NOT NULL,
  course_name text,
  guide       jsonb,
  flashcards  jsonb,
  practice    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_materials (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id     uuid        NOT NULL REFERENCES public.study_sets ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  file_name  text        NOT NULL,
  kind       text        NOT NULL CHECK (kind IN ('pdf','docx','pptx','text','paste')),
  content    text        NOT NULL,
  char_count integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id     uuid        NOT NULL REFERENCES public.study_sets ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user','assistant')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX ON public.study_materials (set_id, created_at);
CREATE INDEX ON public.study_messages  (set_id, created_at);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.study_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_messages  ENABLE ROW LEVEL SECURITY;

-- study_sets
CREATE POLICY "Users can view own study_sets"
  ON public.study_sets FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own study_sets"
  ON public.study_sets FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own study_sets"
  ON public.study_sets FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own study_sets"
  ON public.study_sets FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- study_materials
CREATE POLICY "Users can view own study_materials"
  ON public.study_materials FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own study_materials"
  ON public.study_materials FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own study_materials"
  ON public.study_materials FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own study_materials"
  ON public.study_materials FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- study_messages
CREATE POLICY "Users can view own study_messages"
  ON public.study_messages FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own study_messages"
  ON public.study_messages FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own study_messages"
  ON public.study_messages FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own study_messages"
  ON public.study_messages FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

COMMIT;
