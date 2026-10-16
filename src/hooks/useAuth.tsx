/**
 * Auth state for the whole app.
 *
 * <AuthProvider> wraps the app (see App.tsx) and keeps track of who is logged in.
 * Any component can call useAuth() to get:
 *   - user / session: the logged-in user, or null when logged out
 *   - loading:        true until we know for sure whether someone is logged in
 *   - signUp / signIn / signOut: thin wrappers around Supabase Auth
 *
 * Doing this once in a React context means every page sees the same login state
 * and updates instantly when the user logs in or out.
 */
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Everything useAuth() hands back to components.
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Flips to true the first time we learn the login state, so `loading` is only cleared once.
  const initialized = useRef(false);

  useEffect(() => {
    // Set up the auth listener FIRST so no login/logout event is missed while
    // the initial session is still loading. It fires on sign in, sign out,
    // token refresh, and password recovery.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Only update state if the session actually changed (different user or signed out).
      // Token refreshes fire this every hour; returning the same object avoids
      // re-rendering every page that uses useAuth().
      setSession((prev) => {
        const prevUserId = prev?.user?.id;
        const newUserId = newSession?.user?.id;
        if (prevUserId === newUserId && !!prev === !!newSession) return prev;
        return newSession;
      });
      setUser((prev) => {
        const newUser = newSession?.user ?? null;
        if (prev?.id === newUser?.id) return prev;
        return newUser;
      });
      if (!initialized.current) {
        initialized.current = true;
        setLoading(false);
      }
    });

    // Then read any session already saved in localStorage (user was logged in before).
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (!initialized.current) {
        initialized.current = true;
        setLoading(false);
      }
    });

    // Stop listening when the provider unmounts.
    return () => subscription.unsubscribe();
  }, []);

  // Create an account. display_name is stored in the user's metadata; the
  // handle_new_user database trigger copies it into the new profiles row.
  // emailRedirectTo is where the email-confirmation link sends the user.
  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  // Log in with email + password. On success the auth listener above updates `user`.
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  // Log out and clear state right away, so ProtectedRoute redirects to /login immediately.
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use inside any component: const { user, signOut } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
