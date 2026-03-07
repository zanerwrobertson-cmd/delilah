-- Create quiz_results table
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  mode TEXT NOT NULL,
  weak_areas TEXT[] DEFAULT '{}',
  time_taken_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quiz results" ON public.quiz_results FOR DELETE USING (auth.uid() = user_id);