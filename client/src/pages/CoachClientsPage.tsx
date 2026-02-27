import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { PackageSelectDialog, PackageType } from "@/components/PackageSelectDialog";
import { CoachClientTable } from "@/components/CoachClientTable";
import { ClientDetailsSheet } from "@/components/ClientDetailsSheet";
import { mapLegacyPackage } from "@/lib/coach-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CoachClientsPage() {
  const { user, setViewedUserId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Sheet state
  const [sheetClient, setSheetClient] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Edit package state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editInitialValues, setEditInitialValues] = useState<{
    package: PackageType;
    duration: number;
    startDate?: string | null;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Unassign state
  const [clientToUnassign, setClientToUnassign] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Fetch assigned clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["coach-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "client")
        .eq("coach_id", user?.id);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent check-ins for all assigned clients (last 30 days)
  const clientIds = useMemo(
    () => (clients || []).map((c: any) => c.id),
    [clients]
  );

  const { data: checkInsData } = useQuery({
    queryKey: ["coach-client-checkins", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const isoDate = sixtyDaysAgo.toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_check_ins")
        .select("id, user_id, date, nutrition_score, morning_weight, workout_status")
        .in("user_id", clientIds)
        .gte("date", isoDate);
      if (error) throw error;
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  // Fetch weekly check-ins — no date filter so we always get the latest entry per client
  const { data: weeklyData } = useQuery({
    queryKey: ["coach-client-weekly", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("weekly_check_ins")
        .select("id, user_id, created_at, joint_pain, missed_sessions, recovery_issues, training_progress")
        .in("user_id", clientIds)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch weekly check-ins:", error);
        throw error;
      }
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  // Fetch body measurements — no date filter so we always get the latest entry per client
  const { data: measurementsData } = useQuery({
    queryKey: ["coach-client-measurements", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("body_measurements")
        .select("id, user_id, date")
        .in("user_id", clientIds)
        .order("date", { ascending: false });
      if (error) {
        console.error("Failed to fetch body measurements:", error);
        throw error;
      }
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  // Fetch weekly progress photos — no date filter
  const { data: progressPhotosData } = useQuery({
    queryKey: ["coach-client-photos", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from("weekly_progress_photos")
        .select("id, user_id, date")
        .in("user_id", clientIds)
        .order("date", { ascending: false });
      if (error) {
        console.error("Failed to fetch progress photos:", error);
        return [];
      }
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  // Coach notes state
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);

  const handleSaveNote = async (clientId: string, note: string) => {
    setSavingNoteFor(clientId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ coach_note: note })
        .eq("id", clientId);
      if (error) throw error;
      toast({ title: "Note saved" });
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
    } catch {
      toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
    } finally {
      setSavingNoteFor(null);
    }
  };

  // Group check-ins by user_id
  const checkInsByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (checkInsData || []).forEach((c: any) => {
      if (!map[c.user_id]) map[c.user_id] = [];
      map[c.user_id].push(c);
    });
    return map;
  }, [checkInsData]);

  const weeklyByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (weeklyData || []).forEach((w: any) => {
      if (!map[w.user_id]) map[w.user_id] = [];
      map[w.user_id].push(w);
    });
    return map;
  }, [weeklyData]);

  const measurementsByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (measurementsData || []).forEach((m: any) => {
      if (!map[m.user_id]) map[m.user_id] = [];
      map[m.user_id].push(m);
    });
    return map;
  }, [measurementsData]);

  const photosByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (progressPhotosData || []).forEach((p: any) => {
      if (!map[p.user_id]) map[p.user_id] = [];
      map[p.user_id].push(p);
    });
    return map;
  }, [progressPhotosData]);

  // Handlers
  const handleRowClick = (client: any) => {
    setSheetClient(client);
    setIsSheetOpen(true);
  };

  const handleViewDashboard = (clientId: string) => {
    setViewedUserId(clientId);
    setLocation("/");
  };

  const handleEditPackage = (client: any) => {
    setEditClientId(client.id);
    setEditClientName(client.full_name || "Client");
    const mapped = mapLegacyPackage(client.package_type);
    setEditInitialValues({
      package: mapped,
      duration: client.package_duration || 3,
      startDate: client.package_start_date || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditConfirmation = async (
    packageType: PackageType,
    duration: number,
    startDate?: string
  ) => {
    if (!editClientId) return;
    setIsUpdating(true);
    try {
      const updatePayload: any = {
        package_type: packageType,
        package_duration: duration,
      };
      if (startDate) {
        updatePayload.package_start_date = startDate;
      }
      const { error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", editClientId);
      if (error) throw error;

      toast({
        title: "Package Updated",
        description: `Client package updated to ${packageType} (${duration} months).`,
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update package",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnassignClick = (client: any) => {
    setClientToUnassign({
      id: client.id,
      name: client.full_name || "Client",
    });
    setIsUnassignDialogOpen(true);
  };

  const handleUnassign = async () => {
    if (!clientToUnassign) return;
    setIsUnassigning(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ coach_id: null })
        .eq("id", clientToUnassign.id);
      if (error) throw error;

      toast({
        title: "Client Unassigned",
        description: `${clientToUnassign.name} has been removed from your roster.`,
      });
      setIsUnassignDialogOpen(false);
      setClientToUnassign(null);
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-clients"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to unassign client",
        variant: "destructive",
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">My Clients</h1>
        <p className="text-muted-foreground mt-1">
          Manage and monitor your assigned clients
        </p>
      </div>

      {/* Stats */}
      <Card className="rounded-2xl w-fit">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clients?.length || 0}</div>
          <p className="text-xs text-muted-foreground">In your roster</p>
        </CardContent>
      </Card>

      {/* Client Table */}
      <CoachClientTable
        clients={clients || []}
        checkIns={checkInsByClient}
        weeklyCheckIns={weeklyByClient}
        bodyMeasurements={measurementsByClient}
        progressPhotos={photosByClient}
        onRowClick={handleRowClick}
        onViewDashboard={handleViewDashboard}
        onEditPackage={handleEditPackage}
        onUnassign={handleUnassignClick}
        onSaveNote={handleSaveNote}
        savingNoteFor={savingNoteFor}
      />

      {/* Client Details Sheet */}
      <ClientDetailsSheet
        client={sheetClient}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onOpenDashboard={handleViewDashboard}
      />

      {/* Edit Package Dialog */}
      <PackageSelectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onConfirm={handleEditConfirmation}
        isLoading={isUpdating}
        clientName={editClientName}
        mode="edit"
        initialPackage={editInitialValues?.package}
        initialDuration={editInitialValues?.duration}
        initialStartDate={editInitialValues?.startDate}
      />

      {/* Unassign Confirmation */}
      <AlertDialog
        open={isUnassignDialogOpen}
        onOpenChange={setIsUnassignDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{clientToUnassign?.name}</strong> from your roster? They
              will become available for other coaches to claim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassign}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUnassigning ? "Unassigning..." : "Unassign Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
