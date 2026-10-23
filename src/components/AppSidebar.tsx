import { LayoutDashboard, CalendarDays, HelpCircle, GraduationCap, Settings, LogOut, BookOpen, Upload, Brain } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

/**
 * Left-hand navigation for the logged-in app.
 * To add a page to the menu: add an entry here and a matching <Route> in App.tsx.
 */
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Study Plan", url: "/dashboard/study-plan", icon: CalendarDays },
  { title: "Quiz Me", url: "/dashboard/quiz", icon: HelpCircle },
  { title: "Exam Prep", url: "/dashboard/exam-prep", icon: GraduationCap },
  { title: "Learn", url: "/dashboard/learn", icon: Brain },
  { title: "Upload Syllabus", url: "/dashboard/upload-syllabus", icon: Upload },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  // When collapsed, the sidebar shows icons only, so labels are hidden below.
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-4 mt-2">
            {!collapsed && (
              <span className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                Delilah
              </span>
            )}
            {collapsed && <BookOpen className="h-5 w-5 text-primary" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {/* `end` on /dashboard stops it highlighting on every /dashboard/* page */}
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Sign out: clears the session; ProtectedRoute then redirects to /login */}
      <SidebarFooter className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
