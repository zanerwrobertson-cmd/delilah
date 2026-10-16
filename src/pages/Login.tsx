import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

/**
 * Login page (/login).
 * Email + password form. On success it sends the user to /dashboard, where
 * ProtectedRoute redirects to /onboarding instead if they haven't finished it.
 */
export default function Login() {
  // Form fields, plus `loading` to disable the button while the request runs.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    // Stop the browser's default full-page form submit; we handle it in JS.
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      // e.g. "Invalid login credentials" or "Email not confirmed", shown as a popup.
      toast.error(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo (links home) and heading */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">Delilah</span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to continue learning</p>
        </div>
        {/* `required` and type="email" give free browser validation before submit */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {/* Links to the other auth pages */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link to="/forgot-password" className="text-primary hover:underline">Forgot your password?</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
