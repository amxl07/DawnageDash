import { Users, UserPlus, LogOut } from "lucide-react";
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
  { title: "My Clients", url: "/coach/clients", icon: Users },
  { title: "Claim Clients", url: "/coach/claim", icon: UserPlus },
];

export function CoachSidebar() {
  const [location, setLocation] = useLocation();
  const { signOut, user } = useAuth();

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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
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
            <p className="text-xs text-muted-foreground">Coach</p>
          </div>
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
