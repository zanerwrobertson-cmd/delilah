# Delilah — Your AI Study Companion

Delilah turns a course syllabus into a plan for actually studying it. Upload your syllabus and Delilah pulls out the assignments and topics, builds a study plan around your deadlines, and quizzes you on the material — powered by Claude.

## Features

- **Syllabus upload** — drop in a PDF; Delilah extracts assignments, due dates, and topics automatically.
- **Study plans** — personalized, deadline-aware schedules generated from your courses.
- **Quiz Me** — AI-generated quizzes on your topics, with saved quizzes and progress tracking.
- **Exam prep** — focused review ahead of exams.
- **Accounts** — sign up, log in, password reset, and onboarding; each user's data is private to them.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query
- **Backend:** Supabase (Postgres with row-level security, Auth, Storage, Edge Functions)
- **AI:** Anthropic Claude, called from Supabase Edge Functions so the API key never reaches the browser
- **PDF parsing:** pdf.js

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project
- An Anthropic API key

### 1. Install

```sh
git clone https://github.com/zanerwrobertson-cmd/delilah.git
cd delilah
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

The anon key is in the Supabase dashboard under **Project Settings → API Keys**. `.env` is gitignored.

### 3. Set up Supabase

```sh
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push                                  # tables, RLS policies, storage bucket
npx supabase functions deploy                         # AI edge functions
npx supabase secrets set CLAUDE_API_KEY=your-anthropic-key
```

### 4. Run

```sh
npm run dev
```

The app runs at http://localhost:8080.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run tests with Vitest |

## Project structure

```
src/
  pages/                 # Landing, auth, dashboard, study plan, quiz, exam prep, syllabus upload
  components/            # UI components (shadcn/ui under components/ui)
  integrations/supabase/ # Supabase client and generated types
supabase/
  migrations/            # Database schema and RLS policies
  functions/
    claude-proxy/        # Syllabus extraction
    generate-quiz/       # Quiz generation
    generate-study-plan/ # Study plan generation
```
