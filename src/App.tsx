/**
 * App root: global providers + every route (URL -> page) in the app.
 *
 * Route map:
 *   Public:     /  /login  /signup  /forgot-password  /reset-password
 *   Logged in:  /onboarding
 *   Logged in + onboarded (inside the sidebar layout):
 *               /dashboard, /dashboard/study-plan, /dashboard/quiz,
 *               /dashboard/exam-prep, /dashboard/upload-syllabus, /dashboard/settings
 *   Anything else -> 404 page
 */
// Two toast (popup notification) systems from shadcn; most pages use Sonner's `toast()`.
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import StudyPlan from "./pages/StudyPlan";
import QuizMe from "./pages/QuizMe";
import ExamPrep from "./pages/ExamPrep";
import SettingsPage from "./pages/SettingsPage";
import UploadSyllabus from "./pages/UploadSyllabus";
import NotFound from "./pages/NotFound";

// React Query cache, available app-wide (pages currently call Supabase directly).
const queryClient = new QueryClient();

const App = () => (
  // Provider order matters: AuthProvider sits inside BrowserRouter so auth code can navigate.
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public pages: anyone can visit */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Needs login, but not finished onboarding (this IS onboarding) */}
            <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />

            {/* The app itself: login + onboarding required. DashboardLayout draws the
                sidebar, and the child route's page renders inside it via <Outlet />. */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="study-plan" element={<StudyPlan />} />
              <Route path="quiz" element={<QuizMe />} />
              <Route path="exam-prep" element={<ExamPrep />} />
              <Route path="upload-syllabus" element={<UploadSyllabus />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all: any unknown URL shows the 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
