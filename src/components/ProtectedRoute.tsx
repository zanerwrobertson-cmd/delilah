import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { user, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const lastCheckedUserId = useRef<string | null>(null);

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
        setOnboardingCompleted(data?.onboarding_completed ?? false);
        setCheckingOnboarding(false);
      });
  }, [user]);

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireOnboarding && onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
