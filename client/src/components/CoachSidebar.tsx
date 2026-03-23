import { Users, UserPlus, LogOut, ArrowLeft, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoUrl from "@assets/logo.png";
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
  { title: "My Clients", url: "/coach/clients", icon: Users },
  { title: "Claim Clients", url: "/coach/claim", icon: UserPlus },
];

export function CoachSidebar() {
  const [location, setLocation] = useLocation();
  const { signOut, user, viewedCoachId, setViewedCoachId } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const isAdminViewing = user?.user_metadata?.role === 'admin' && !!viewedCoachId;

  // Fetch viewed coach details if admin is viewing
  const { data: viewedCoach } = useQuery({
    queryKey: ['viewedCoach', viewedCoachId],
    queryFn: async () => {
      if (!viewedCoachId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', viewedCoachId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!viewedCoachId,
  });

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <img
            src={logoUrl}
            alt="Dawnage AI"
            className="w-full max-w-[140px] sm:max-w-[180px]"
          />
        </div>

        {/* Admin viewing banner */}
        {isAdminViewing && (
          <div className="px-4 py-2 bg-amber-100 border-t border-b border-amber-200">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-800">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  Viewing: {viewedCoach?.full_name || viewedCoach?.email || 'Coach'}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-8 bg-amber-200 hover:bg-amber-300 text-amber-900 border-none"
                onClick={() => {
                  setViewedCoachId(null);
                  setLocation('/admin/coaches');
                }}
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Admin
              </Button>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
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

      <SidebarFooter>
        <div className="px-4 py-4 border-t">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">{isAdminViewing ? 'Admin' : 'Coach'}</p>
          </div>
          {!isAdminViewing && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                await signOut();
                setLocation("/login");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
