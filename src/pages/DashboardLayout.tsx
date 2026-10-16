import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

/**
 * The shell around every /dashboard/* page: sidebar on the left, a top bar
 * with the collapse button, and the current page in the main area.
 */
export default function DashboardLayout() {
  return (
    // SidebarProvider tracks whether the sidebar is open or collapsed.
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4">
            {/* Button that collapses/expands the sidebar */}
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6">
            {/* React Router renders the matching child route (Dashboard, Quiz Me, ...) here */}
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
