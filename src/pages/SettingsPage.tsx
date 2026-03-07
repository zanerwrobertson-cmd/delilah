import { useAuth } from "@/hooks/useAuth";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <span className="text-sm text-muted-foreground">Email</span>
          <p className="text-foreground">{user?.email}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Display Name</span>
          <p className="text-foreground">{user?.user_metadata?.display_name || "Not set"}</p>
        </div>
      </div>
    </div>
  );
}
