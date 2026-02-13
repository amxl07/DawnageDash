import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PackageSelectDialog, PackageType } from "@/components/PackageSelectDialog";
import { CoachClientTable } from "@/components/CoachClientTable";
import { ClientDetailsSheet } from "@/components/ClientDetailsSheet";
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
import { subDays } from "date-fns";
import { Loader2 } from "lucide-react";

export default function CoachClientsPage() {
    const { user, setViewedUserId } = useAuth();
    const { toast } = useToast();

    // Edit/Unassign State
    const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);
    const [editInitialValues, setEditInitialValues] = useState<{ package: PackageType, duration: number, startDate?: string | null } | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedClientName, setSelectedClientName] = useState("");
    const [clientToUnassign, setClientToUnassign] = useState<{ id: string, name: string } | null>(null);
    const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Client Sheet State
    const [selectedClientForSheet, setSelectedClientForSheet] = useState<any | null>(null);
    const [isClientSheetOpen, setIsClientSheetOpen] = useState(false);

    // Fetch assigned clients
    const { data: clients, isLoading: isClientsLoading, refetch } = useQuery({
        queryKey: ['coach-clients', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'client')
                .eq('coach_id', user?.id);

            if (error) throw error;
            return data;
        },
        enabled: !!user?.id
    });

    // Fetch Check-ins for assigned clients (last 30 days)
    const { data: recentCheckIns, isLoading: isCheckInsLoading } = useQuery({
        queryKey: ['coach-client-checkins', user?.id],
        queryFn: async () => {
            if (!clients?.length) return [];

            const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

            const { data, error } = await supabase
                .from('daily_check_ins')
                .select('user_id, date')
                .gte('date', thirtyDaysAgo);

            if (error) {
                console.error("Error fetching check-ins:", error);
                return [];
            }
            return data;
        },
        enabled: !!clients?.length
    });

    // Fetch Weekly Check-ins for assigned clients
    const { data: recentWeeklyCheckIns, isLoading: isWeeklyCheckInsLoading } = useQuery({
        queryKey: ['coach-client-weekly-checkins', user?.id],
        queryFn: async () => {
            if (!clients?.length) return [];

            const tenDaysAgo = subDays(new Date(), 10).toISOString();

            const { data, error } = await supabase
                .from('weekly_check_ins')
                .select('user_id, created_at')
                .gte('created_at', tenDaysAgo);

            if (error) {
                console.error("Error fetching weekly check-ins:", error);
                return [];
            }
            return data;
        },
        enabled: !!clients?.length
    });

    // Fetch Body Measurements (latest per user would be ideal, but fetching all recent is easier)
    // Optimization: we could create a view or RPC, but for now fetch last 30 days
    const { data: recentMeasurements } = useQuery({
        queryKey: ['coach-client-measurements', user?.id],
        queryFn: async () => {
            if (!clients?.length) return [];
            // Fetch checks from last 60 days to be safe for "Latest"
            const sixtyDaysAgo = subDays(new Date(), 60).toISOString();

            const { data, error } = await supabase
                .from('body_measurements')
                .select('user_id, date')
                .gte('date', sixtyDaysAgo); // We only need date to show "Last: [Date]"

            if (error) {
                console.error("Error fetching measurements:", error);
                return [];
            }
            return data;
        },
        enabled: !!clients?.length
    });

    // Fetch Progress Photos (latest)
    const { data: recentPhotos } = useQuery({
        queryKey: ['coach-client-photos', user?.id],
        queryFn: async () => {
            if (!clients?.length) return [];
            const sixtyDaysAgo = subDays(new Date(), 60).toISOString();

            const { data, error } = await supabase
                .from('weekly_progress_photos')
                .select('user_id, date')
                .gte('date', sixtyDaysAgo);

            if (error) {
                console.error("Error fetching photos:", error);
                return [];
            }
            return data;
        },
        enabled: !!clients?.length

    });

    const isLoading = isClientsLoading;

    const handleViewClient = (clientId: string) => {
        // Full dashboard view
        setViewedUserId(clientId);
    };

    const handleOpenClientSheet = (client: any) => {
        setSelectedClientForSheet(client);
        setIsClientSheetOpen(true);
    };

    const openEditPackageDialog = (client: any) => {
        setSelectedClientId(client.id);
        setSelectedClientName(client.full_name || "Client");
        // Map legacy values if present
        const rawPackage = client.package_type;
        const mappedPackage =
            rawPackage === 'premium' ? 'elite' :
                rawPackage === 'intermediate' ? 'standard' :
                    rawPackage === 'basic' ? 'beginner' :
                        (rawPackage as PackageType);

        setEditInitialValues({
            package: mappedPackage || 'standard',
            duration: client.package_duration || 3,
            startDate: client.package_start_date || null
        });
        setIsEditPackageDialogOpen(true);
    };

    const confirmUnassignClient = (client: any) => {
        setClientToUnassign({ id: client.id, name: client.full_name || "Client" });
        setIsUnassignDialogOpen(true);
    };

    const handleEditPackageConfirmation = async (packageType: PackageType, duration: number, startDate?: string) => {
        if (!selectedClientId) return;

        setIsProcessing(true);
        try {
            const updatePayload: any = {
                package_type: packageType,
                package_duration: duration
            };
            if (startDate) {
                updatePayload.package_start_date = startDate;
            }
            const { error } = await supabase
                .from('users')
                .update(updatePayload)
                .eq('id', selectedClientId);

            if (error) throw error;

            toast({
                title: "Package Updated",
                description: `Client package updated to ${packageType} (${duration} months).`,
            });
            setIsEditPackageDialogOpen(false);
            refetch();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to update package",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnassign = async () => {
        if (!clientToUnassign) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    coach_id: null,
                })
                .eq('id', clientToUnassign.id);

            if (error) throw error;

            toast({
                title: "Client Unassigned",
                description: `${clientToUnassign.name} has been removed from your roster.`,
            });
            setIsUnassignDialogOpen(false);
            setClientToUnassign(null);
            refetch();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to unassign client",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading clients...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">My Clients</h1>
                <p className="text-muted-foreground">Manage your active training roster.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-xl shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{clients?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Clients Table */}
            <div>
                {/* @ts-ignore - types mismatch slightly between supabase return and table props but fields match */}
                <CoachClientTable
                    clients={clients || []}
                    checkIns={recentCheckIns || []}
                    weeklyCheckIns={recentWeeklyCheckIns || []}
                    measurements={recentMeasurements || []}
                    photos={recentPhotos || []}
                    onViewDashboard={handleOpenClientSheet}
                    onEditPackage={openEditPackageDialog}
                    onMessage={() => toast({ title: "Coming Soon", description: "Messaging feature is under development." })}
                />
            </div>

            <ClientDetailsSheet
                open={isClientSheetOpen}
                onOpenChange={setIsClientSheetOpen}
                client={selectedClientForSheet}
                onViewDashboard={handleViewClient}
            />

            <PackageSelectDialog
                open={isEditPackageDialogOpen}
                onOpenChange={setIsEditPackageDialogOpen}
                onConfirm={handleEditPackageConfirmation}
                isLoading={isProcessing}
                clientName={selectedClientName}
                mode="edit"
                initialPackage={editInitialValues?.package}
                initialDuration={editInitialValues?.duration}
                initialStartDate={editInitialValues?.startDate}
            />

            <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unassign Client</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{clientToUnassign?.name}</strong> from your roster?
                            They will become available for other coaches to claim.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnassign} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing ? "Unassigning..." : "Unassign Client"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
