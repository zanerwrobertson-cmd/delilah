-- Add onboarding fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN learning_style TEXT,
  ADD COLUMN struggle_subjects TEXT,
  ADD COLUMN grades JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;