
-- Assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_name text NOT NULL,
  assignment_name text NOT NULL,
  deadline timestamp with time zone,
  type text NOT NULL DEFAULT 'assignment',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assignments" ON public.assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assignments" ON public.assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assignments" ON public.assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assignments" ON public.assignments FOR DELETE USING (auth.uid() = user_id);

-- Topics table
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_name text NOT NULL,
  week_number integer,
  topic_name text NOT NULL,
  is_weak_area boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE USING (auth.uid() = user_id);

-- Study sessions table
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_name text NOT NULL,
  topic_name text NOT NULL,
  weak_areas text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own study_sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study_sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own study_sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for syllabi PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabi', 'syllabi', false);
CREATE POLICY "Users can upload own syllabi" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own syllabi" ON storage.objects FOR SELECT USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own syllabi" ON storage.objects FOR DELETE USING (bucket_id = 'syllabi' AND auth.uid()::text = (storage.foldername(name))[1]);
