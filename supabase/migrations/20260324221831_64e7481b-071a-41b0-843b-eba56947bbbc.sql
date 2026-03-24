
CREATE TABLE public.quiz_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course text NOT NULL,
  mode text NOT NULL,
  questions jsonb NOT NULL,
  user_answers jsonb NOT NULL,
  current_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz_progress" ON public.quiz_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz_progress" ON public.quiz_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz_progress" ON public.quiz_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz_progress" ON public.quiz_progress FOR DELETE USING (auth.uid() = user_id);
