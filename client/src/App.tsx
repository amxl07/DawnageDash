import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import CheckIns from "@/pages/CheckIns";
import Measurements from "@/pages/Measurements";
import Plans from "@/pages/Plans";
import Analytics from "@/pages/Analytics";
import Media from "@/pages/Media";
import Profile from "@/pages/Profile";
import WorkoutLogs from "@/pages/WorkoutLogs";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
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
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
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
  const { user, loading } = useAuth();

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

  // Authenticated layout with sidebar
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto p-8">
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
