/**
 * Route guard for pages that need a logged-in user.
 *
 * Wrap a route's element with it (see App.tsx):
 *   <ProtectedRoute><DashboardLayout /></ProtectedRoute>
 *
 * It decides between three outcomes:
 *   1. Not logged in                    -> redirect to /login
 *   2. Logged in, onboarding unfinished -> redirect to /onboarding
 *   3. Logged in and onboarded          -> show the page
 *
 * Pass requireOnboarding={false} to skip check 2. The /onboarding route itself
 * uses that, otherwise it would keep redirecting to itself.
 */
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { user, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  // Remembers whose onboarding status we already fetched, to avoid repeat queries.
  const lastCheckedUserId = useRef<string | null>(null);

  // Whenever the user changes, look up profiles.onboarding_completed for them.
  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      setOnboardingCompleted(null);
      lastCheckedUserId.current = null;
      return;
    }

    // Don't re-query if we already checked this user
    if (lastCheckedUserId.current === user.id) return;
    lastCheckedUserId.current = user.id;

    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        // No profile row (or a failed query) counts as "not onboarded yet".
        setOnboardingCompleted(data?.onboarding_completed ?? false);
        setCheckingOnboarding(false);
      });
  }, [user]);

  // Show a spinner while we don't know yet. Redirecting too early would bounce
  // logged-in users to /login for a split second on every page refresh.
  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // `replace` swaps the history entry, so the Back button doesn't return to the blocked page.
  if (!user) return <Navigate to="/login" replace />;
  if (requireOnboarding && onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
