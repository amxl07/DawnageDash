import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CoachSidebar } from "@/components/CoachSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import CoachClientsPage from "@/pages/CoachClientsPage";
import CoachClaimPage from "@/pages/CoachClaimPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminCoachesPage from "@/pages/AdminCoachesPage";
import AdminClientsPage from "@/pages/AdminClientsPage";
import CheckIns from "@/pages/CheckIns";
import Measurements from "@/pages/Measurements";
import Plans from "@/pages/Plans";
import WeeklyFeedback from "@/pages/WeeklyFeedback";
import Media from "@/pages/Media";
import Profile from "@/pages/Profile";
import WorkoutLogs from "@/pages/WorkoutLogs";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, viewedUserId, viewedCoachId } = useAuth();
  const role = user?.user_metadata?.role;

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          {role === 'admin' && !viewedCoachId ? (
            <Redirect to="/admin/dashboard" />
          ) : role === 'admin' && viewedCoachId && !viewedUserId ? (
            <Redirect to="/coach/clients" />
          ) : role === 'coach' && !viewedUserId ? (
            <Redirect to="/coach/clients" />
          ) : (
            <Dashboard />
          )}
        </ProtectedRoute>
      </Route>
      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/coaches">
        <ProtectedRoute>
          <AdminCoachesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/clients">
        <ProtectedRoute>
          <AdminClientsPage />
        </ProtectedRoute>
      </Route>
      {/* Coach Routes */}
      <Route path="/coach/clients">
        <ProtectedRoute>
          <CoachClientsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/coach/claim">
        <ProtectedRoute>
          <CoachClaimPage />
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
  const { user, loading, viewedUserId, viewedCoachId } = useAuth();

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

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Now we can use viewedUserId safely since it was extracted above
  const userRole = user?.user_metadata?.role;
  const isAdminViewingCoach = userRole === 'admin' && !!viewedCoachId;
  const isAdminDashboard = userRole === 'admin' && !viewedCoachId;
  const isCoachDashboard = (userRole === 'coach' && !viewedUserId) || (isAdminViewingCoach && !viewedUserId);

  // Admin Dashboard with AdminSidebar
  if (isAdminDashboard) {
    return (
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AdminSidebar />
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

  // Coach Dashboard with CoachSidebar
  if (isCoachDashboard) {
    return (
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <CoachSidebar />
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

  // Authenticated layout with client sidebar (also used when coach views a client)
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
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
