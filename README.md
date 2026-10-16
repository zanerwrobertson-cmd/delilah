# Delilah — Your AI Study Companion

Delilah turns a course syllabus into a plan for actually studying it. Upload your syllabus and Delilah pulls out the assignments and topics, builds a study plan around your deadlines, and quizzes you on the material, powered by Claude.

## Features

- **Syllabus upload:** drop in a PDF and Delilah extracts assignments, due dates and weekly topics. Flag any topic as a weak area.
- **Study plans:** week-by-week plans per course, built around your deadlines, weak areas, learning style and how many days a week you want to study.
- **Quiz Me:** 10 AI-written multiple-choice questions per quiz, in three modes (standard, 30-second time crunch, easy-to-hard exam prep). Save a quiz mid-way and resume later.
- **Onboarding:** a 3-step setup (learning style, struggle subjects, grades) that personalises the AI.
- **Accounts:** sign up, log in, password reset. Every user only ever sees their own data.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router |
| Backend | Supabase: Postgres with row-level security, Auth, Edge Functions (Deno) |
| AI | Anthropic Claude, called only from edge functions so the API key never reaches the browser |
| PDF parsing | pdf.js, runs in the browser |

## How it works

### Architecture

```
 Browser (React app)                         Supabase
 ┌─────────────────────────┐      ┌───────────────────────────────────────┐
 │ pages/ + components/    │─────>│ Auth          (accounts, sessions)    │
 │                         │      │ Postgres      (tables + RLS policies) │
 │ supabase client         │      │ Edge Functions ──────────────────┐    │
 │ (integrations/supabase) │─────>│   claude-proxy                   │    │
 └─────────────────────────┘      │   generate-quiz                  │    │
                                  │   generate-study-plan            │    │
                                  └──────────────────────────────────┼────┘
                                                                     v
                                                            Anthropic Claude API
```

The browser talks to Supabase directly for login and data. Anything that needs Claude goes through an edge function, because that's the only place the `CLAUDE_API_KEY` lives.

### User journey

1. **Sign up** (`Signup.tsx`). Supabase creates the account, and the `handle_new_user` database trigger creates a matching `profiles` row.
2. **Onboarding** (`Onboarding.tsx`) saves learning style, struggle subjects and grades to that profile and sets `onboarding_completed = true`.
3. **Upload a syllabus** (`UploadSyllabus.tsx`). pdf.js reads the PDF's text in the browser, Claude turns it into JSON, and each assignment and topic is saved to the database.
4. **Build a study plan** (`StudyPlan.tsx`). For each course, the topics, deadlines and weak areas go to `generate-study-plan`, and Claude returns a week-by-week plan. If the AI call fails, a simple template plan is built instead.
5. **Take a quiz** (`QuizMe.tsx`). `generate-quiz` writes 10 questions for the chosen course and mode. Results go to `quiz_results`; unfinished quizzes go to `quiz_progress`.

### Access control

- **`ProtectedRoute`** (`src/components/ProtectedRoute.tsx`) wraps every logged-in page. It sends logged-out users to `/login`, and users who haven't onboarded to `/onboarding`.
- **`useAuth`** (`src/hooks/useAuth.tsx`) keeps the current user in a React context, so every page sees the same login state.
- **Row-level security** on every table means the database itself only returns rows where `user_id` is the logged-in user, whatever the frontend asks for.

### Database

All tables are in `supabase/migrations/`. Each row belongs to one user (`user_id`), and RLS policies limit users to their own rows.

| Table | What it stores | Written by |
|---|---|---|
| `profiles` | Display name, learning style, struggle subjects, grades, onboarding flag | sign-up trigger, Onboarding |
| `assignments` | Assignment/exam/quiz names, type, deadline per course | Upload Syllabus |
| `topics` | Weekly topics per course, plus the `is_weak_area` flag | Upload Syllabus, Study Plan |
| `study_sessions` | One row per generated plan week (history) | Study Plan |
| `quiz_results` | Score, mode, weak areas and time for each finished quiz | Quiz Me |
| `quiz_progress` | Questions, answers and position of unfinished quizzes | Quiz Me |

There is also a private `syllabi` storage bucket with per-user folders. The app doesn't use it yet, because PDFs are read in the browser and never uploaded.

### Edge functions

| Function | Input | Output | Used by |
|---|---|---|---|
| `claude-proxy` | a finished prompt | Claude's text reply | Upload Syllabus |
| `generate-quiz` | course, topics, weak areas, learning style, mode | 10 questions as JSON | Quiz Me |
| `generate-study-plan` | course, topics, assignments, weak areas, days/week | weekly plan as JSON | Study Plan |

## Project structure

```
src/
  App.tsx                  # All routes (URL -> page), wrapped in global providers
  main.tsx                 # Entry point: mounts <App /> into index.html
  pages/                   # One file per screen
    Landing.tsx            #   public home page
    Login / Signup / ForgotPassword / ResetPassword.tsx
    Onboarding.tsx         #   3-step setup wizard
    DashboardLayout.tsx    #   sidebar shell around all /dashboard pages
    Dashboard.tsx          #   home screen after login
    UploadSyllabus.tsx     #   PDF -> assignments + topics
    StudyPlan.tsx          #   AI weekly study plans
    QuizMe.tsx             #   quiz flow (state + data); screens in components/quiz
    ExamPrep.tsx, SettingsPage.tsx, NotFound.tsx
  components/
    ProtectedRoute.tsx     # Login/onboarding guard
    AppSidebar.tsx         # Sidebar navigation
    quiz/                  # Quiz screens: course picker, mode picker, questions, results, saved list
    ui/                    # shadcn/ui building blocks (buttons, cards, dialogs...); library code
  hooks/useAuth.tsx        # Login state + signUp/signIn/signOut
  integrations/supabase/
    client.ts              # The shared Supabase client
    types.ts               # Database types, generated from the schema
  lib/                     # Quiz types and helpers, the cn() class-name helper
supabase/
  migrations/              # Database schema, triggers and RLS policies, in order
  functions/               # Edge functions (server-side, call Claude)
```

Every app file starts with a comment explaining what it does, and the code is commented throughout. Start with `App.tsx` to see every route, then open the page you care about.

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
npx supabase db push                                  # tables, RLS policies, trigger, storage bucket
npx supabase functions deploy                         # the three AI edge functions
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
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run tests with Vitest |

## Status and roadmap

Working: accounts, onboarding, syllabus extraction, AI study plans, AI quizzes with save/resume.

Not built yet:
- **Dashboard stats** show placeholder zeros. They should count rows in `quiz_results` / `study_sessions`.
- **Exam Prep page** is a placeholder. Quiz Me's exam-prep mode is the working version for now.
- **Settings** is read-only.

Known issues:
- **Time-crunch timer:** in time-crunch mode, an answer can be wiped if the timer runs out after you answer but before you click Next (see the comment in `QuizInterface.tsx`).
- **`claude-proxy` is open:** it accepts any prompt from any holder of the public anon key. It should check for a logged-in user and limit prompt size before a public launch.
- **Missing user links:** `assignments`, `topics`, `study_sessions` and `quiz_progress` have no foreign key to `auth.users`, so a deleted user's rows stay behind.
