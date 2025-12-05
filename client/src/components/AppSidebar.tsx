import { Home, ClipboardList, Ruler, Calendar, BarChart3, Image, User, LogOut, Dumbbell } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoUrl from "@assets/dashboard_1762285477469.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Check-Ins", url: "/check-ins", icon: ClipboardList },
  { title: "Measurements", url: "/measurements", icon: Ruler },
  { title: "Plans", url: "/plans", icon: Calendar },
  { title: "Workout Logs", url: "/workout-logs", icon: Dumbbell },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Media", url: "/media", icon: Image },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-6 py-6">
          <img src={logoUrl} alt="Dawnage AI" className="w-full max-w-[180px]" data-testid="img-logo" />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-4 border-t">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={signOut}
            data-testid="button-sign-out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
