import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CoachSidebar } from "@/components/CoachSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import CoachClientsPage from "@/pages/CoachClientsPage";
import CoachClaimPage from "@/pages/CoachClaimPage";
import CheckIns from "@/pages/CheckIns";
import Measurements from "@/pages/Measurements";
import Plans from "@/pages/Plans";
import WeeklyFeedback from "@/pages/WeeklyFeedback";
import Media from "@/pages/Media";
import Profile from "@/pages/Profile";
import WorkoutLogs from "@/pages/WorkoutLogs";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function CoachRouter() {
  return (
    <Switch>
      <Route path="/" component={CoachClientsPage} />
      <Route path="/claim-clients" component={CoachClaimPage} />
      <Route component={CoachClientsPage} />
    </Switch>
  );
}

function Router() {
  const { user, viewedUserId } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          {user?.user_metadata?.role === 'coach' && !viewedUserId ? (
            <CoachClientsPage />
          ) : (
            <Dashboard />
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/check-ins">
        <ProtectedRoute>
          <CheckIns />
        </ProtectedRoute>
      </Route>
      <Route path="/measurements">
        <ProtectedRoute>
          <Measurements />
        </ProtectedRoute>
      </Route>
      <Route path="/plans">
        <ProtectedRoute>
          <Plans />
        </ProtectedRoute>
      </Route>
      <Route path="/weekly-feedback">
        <ProtectedRoute>
          <WeeklyFeedback />
        </ProtectedRoute>
      </Route>
      <Route path="/media">
        <ProtectedRoute>
          <Media />
        </ProtectedRoute>
      </Route>
      <Route path="/workout-logs">
        <ProtectedRoute>
          <WorkoutLogs />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // IMPORTANT: All hooks must be called unconditionally at the top
  const { user, loading, viewedUserId } = useAuth();

  // Show full-screen loader while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show minimal layout for login page (no sidebar/header) - centered
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Router />
      </div>
    );
  }

  // Now we can use viewedUserId safely since it was extracted above
  const isCoachDashboard = user?.user_metadata?.role === 'coach' && !viewedUserId;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  // Coach Dashboard (With Sidebar)
  if (isCoachDashboard) {
    return (
      <SidebarProvider style={sidebarStyle}>
        <div className="flex h-screen w-full bg-background">
          <CoachSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-4 border-b sticky top-0 z-50 bg-background md:hidden">
              <SidebarTrigger />
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-8">
              <CoachRouter />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Authenticated layout with sidebar
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
