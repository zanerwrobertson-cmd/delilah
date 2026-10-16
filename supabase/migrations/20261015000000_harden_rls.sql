-- Lock every app table to its owner: RLS on, only own-row policies, signed-in users only.
-- Safe to re-run.
BEGIN;

-- Drop every existing policy on these tables (including any added by hand in the dashboard)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('assignments','profiles','quiz_progress','quiz_results','study_sessions','topics')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics         ENABLE ROW LEVEL SECURITY;

-- assignments
CREATE POLICY "Users can view own assignments"   ON public.assignments FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own assignments" ON public.assignments FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own assignments" ON public.assignments FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own assignments" ON public.assignments FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- profiles (no DELETE: a profile lives and dies with its auth user via ON DELETE CASCADE)
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- quiz_progress
CREATE POLICY "Users can view own quiz_progress"   ON public.quiz_progress FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own quiz_progress" ON public.quiz_progress FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own quiz_progress" ON public.quiz_progress FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own quiz_progress" ON public.quiz_progress FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- quiz_results
CREATE POLICY "Users can view own quiz_results"   ON public.quiz_results FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own quiz_results" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own quiz_results" ON public.quiz_results FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own quiz_results" ON public.quiz_results FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- study_sessions
CREATE POLICY "Users can view own study_sessions"   ON public.study_sessions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own study_sessions" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own study_sessions" ON public.study_sessions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own study_sessions" ON public.study_sessions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- topics
CREATE POLICY "Users can view own topics"   ON public.topics FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

COMMIT;
