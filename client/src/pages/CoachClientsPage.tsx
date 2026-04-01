import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchCoachClientsFullList,
  fetchClientCheckIns,
  fetchClientWeeklyCheckIns,
  fetchClientMeasurements,
  fetchClientPhotos,
  saveCoachNote,
  updateClientPackage,
  unassignClient,
} from "@/lib/api";
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
  const { user, setViewedUserId, viewedCoachId } = useAuth();
  const effectiveCoachId = viewedCoachId || user?.id || null;
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
    queryKey: ["coach-clients", effectiveCoachId],
    queryFn: async () => {
      const data = await fetchCoachClientsFullList();
      // Map camelCase API response to snake_case for existing UI components
      return (data || []).map((c: any) => ({
        ...c,
        full_name: c.fullName ?? c.full_name,
        coach_id: c.coachId ?? c.coach_id,
        package_type: c.packageType ?? c.package_type,
        package_duration: c.packageDuration ?? c.package_duration,
        package_start_date: c.packageStartDate ?? c.package_start_date,
        active_workout_plan: c.activeWorkoutPlan ?? c.active_workout_plan,
        active_meal_plan: c.activeMealPlan ?? c.active_meal_plan,
        avatar_url: c.avatarUrl ?? c.avatar_url,
        coach_note: c.coachNote ?? c.coach_note,
        country_code: c.countryCode ?? c.country_code,
        created_at: c.createdAt ?? c.created_at,
      }));
    },
    enabled: !!effectiveCoachId,
  });

  // Fetch recent check-ins for all assigned clients (last 30 days)
  const clientIds = useMemo(
    () => (clients || []).map((c: any) => c.id),
    [clients]
  );

  const { data: checkInsData } = useQuery({
    queryKey: ["coach-client-checkins", clientIds],
    queryFn: () => fetchClientCheckIns(clientIds, 60),
    enabled: clientIds.length > 0,
  });

  // Fetch weekly check-ins — no date filter so we always get the latest entry per client
  const { data: weeklyData } = useQuery({
    queryKey: ["coach-client-weekly", clientIds],
    queryFn: () => fetchClientWeeklyCheckIns(clientIds),
    enabled: clientIds.length > 0,
  });

  // Fetch body measurements — no date filter so we always get the latest entry per client
  const { data: measurementsData } = useQuery({
    queryKey: ["coach-client-measurements", clientIds],
    queryFn: () => fetchClientMeasurements(clientIds),
    enabled: clientIds.length > 0,
  });

  // Fetch weekly progress photos — no date filter
  const { data: progressPhotosData } = useQuery({
    queryKey: ["coach-client-photos", clientIds],
    queryFn: () => fetchClientPhotos(clientIds),
    enabled: clientIds.length > 0,
  });

  // Coach notes state
  const [savingNoteFor, setSavingNoteFor] = useState<string | null>(null);

  const handleSaveNote = async (clientId: string, note: string) => {
    setSavingNoteFor(clientId);
    try {
      await saveCoachNote(clientId, note);
      toast({ title: "Note saved" });
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
    } catch {
      toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
    } finally {
      setSavingNoteFor(null);
    }
  };

  // Group check-ins by userId (Drizzle camelCase)
  const checkInsByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (checkInsData || []).forEach((c: any) => {
      const uid = c.userId ?? c.user_id;
      if (!map[uid]) map[uid] = [];
      map[uid].push(c);
    });
    return map;
  }, [checkInsData]);

  // Weekly check-ins come from raw SQL (snake_case user_id)
  const weeklyByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (weeklyData || []).forEach((w: any) => {
      const uid = w.userId ?? w.user_id;
      if (!map[uid]) map[uid] = [];
      map[uid].push(w);
    });
    return map;
  }, [weeklyData]);

  const measurementsByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (measurementsData || []).forEach((m: any) => {
      const uid = m.userId ?? m.user_id;
      if (!map[uid]) map[uid] = [];
      map[uid].push(m);
    });
    return map;
  }, [measurementsData]);

  const photosByClient = useMemo(() => {
    const map: Record<string, any[]> = {};
    (progressPhotosData || []).forEach((p: any) => {
      const uid = p.userId ?? p.user_id;
      if (!map[uid]) map[uid] = [];
      map[uid].push(p);
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
      await updateClientPackage(editClientId, {
        packageType,
        packageDuration: duration,
        ...(startDate ? { packageStartDate: startDate } : {}),
      });

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
    if (!clientToUnassign || !effectiveCoachId) return;
    setIsUnassigning(true);
    try {
      await unassignClient(clientToUnassign.id);

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
