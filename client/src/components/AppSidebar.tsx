import { Home, ClipboardList, Ruler, Calendar, BarChart3, Image, User, LogOut, Dumbbell } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoUrl from "@assets/dashboard_1762285477469.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Check-Ins", url: "/check-ins", icon: ClipboardList },
  { title: "Measurements", url: "/measurements", icon: Ruler },
  { title: "Plans", url: "/plans", icon: Calendar },
  { title: "Workout Logs", url: "/workout-logs", icon: Dumbbell },
  { title: "Weekly Feedback", url: "/weekly-feedback", icon: BarChart3 },
  { title: "Media", url: "/media", icon: Image },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { signOut, user, viewedUserId, setViewedUserId, viewedCoachId, setViewedCoachId } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const isAdminViewing = user?.user_metadata?.role === 'admin' && !!viewedCoachId;

  // Fetch viewed user details if in view mode
  const { data: viewedClient } = useQuery({
    queryKey: ['viewedClient', viewedUserId],
    queryFn: async () => {
      if (!viewedUserId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', viewedUserId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!viewedUserId,
  });

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <img src={logoUrl} alt="Dawnage AI" className="w-full max-w-[140px] sm:max-w-[180px]" data-testid="img-logo" />
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
                    <Link href={item.url} onClick={() => isMobile && setOpenMobile(false)}>
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

      {/* View Mode Banner */}
      {viewedUserId && (
        <div className="px-4 py-2 bg-amber-100 border-t border-b border-amber-200">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-800">
              <User className="w-4 h-4" />
              <span className="text-xs font-semibold">Viewing: {viewedClient?.full_name || 'Client'}</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs h-8 bg-amber-200 hover:bg-amber-300 text-amber-900 border-none"
              onClick={() => {
                setViewedUserId(null);
                if (isAdminViewing) {
                  setLocation('/coach/clients');
                } else {
                  setViewedCoachId(null);
                  setLocation('/');
                }
              }}
            >
              {isAdminViewing ? 'Back to Coach View' : 'Exit View Mode'}
            </Button>
            {isAdminViewing && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8 bg-red-200 hover:bg-red-300 text-red-900 border-none"
                onClick={() => {
                  setViewedUserId(null);
                  setViewedCoachId(null);
                  setLocation('/admin/coaches');
                }}
              >
                Back to Admin
              </Button>
            )}
          </div>
        </div>
      )}

      <SidebarFooter>
        <div className="px-4 py-4 border-t">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={async () => {
              await signOut();
              setLocation('/login');
            }}
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
