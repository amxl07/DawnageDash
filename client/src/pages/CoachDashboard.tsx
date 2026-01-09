import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ArrowRight, WalletCards, MoreVertical, Settings, UserX, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/dashboard_1762285477469.png";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { PackageSelectDialog, PackageType } from "@/components/PackageSelectDialog";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function CoachDashboard() {
    const { user, setViewedUserId, signOut } = useAuth();
    const { toast } = useToast();

    // Dialog state
    const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedClientName, setSelectedClientName] = useState("");
    const [isClaiming, setIsClaiming] = useState(false);

    // Edit/Unassign State
    const [isEditPackageDialogOpen, setIsEditPackageDialogOpen] = useState(false);
    const [editInitialValues, setEditInitialValues] = useState<{ package: PackageType, duration: number } | null>(null);
    const [clientToUnassign, setClientToUnassign] = useState<{ id: string, name: string } | null>(null);
    const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
    const [isUnassigning, setIsUnassigning] = useState(false);

    // Fetch all clients (both assigned and unassigned)
    const { data: clients, isLoading, refetch } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            // Fetch all users who are clients
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'client'); // detailed filter is done below or via another query if RLS restricts

            if (error) throw error;
            return data;
        },
    });

    const handleViewClient = (clientId: string) => {
        setViewedUserId(clientId);
    };

    const assignedClients = clients?.filter(c => c.coach_id === user?.id) || [];
    const unassignedClients = clients?.filter(c => !c.coach_id) || [];

    const openClaimDialog = (clientId: string, clientName: string) => {
        setSelectedClientId(clientId);
        setSelectedClientName(clientName || "Client");
        setIsClaimDialogOpen(true);
    };

    const openEditPackageDialog = (client: any) => {
        setSelectedClientId(client.id);
        setSelectedClientName(client.full_name || "Client");
        setEditInitialValues({
            package: client.package_type as PackageType || 'intermediate',
            duration: client.package_duration || 3
        });
        setIsEditPackageDialogOpen(true);
    };

    const confirmUnassignClient = (client: any) => {
        setClientToUnassign({ id: client.id, name: client.full_name || "Client" });
        setIsUnassignDialogOpen(true);
    };

    const handleClaimConfirmation = async (packageType: PackageType, duration: number) => {
        if (!selectedClientId) return;

        setIsClaiming(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    coach_id: user?.id,
                    package_type: packageType,
                    package_duration: duration,
                    // Note: package_start_date is handled by trigger/logic elsewhere usually
                    // If it's a new claim, let's assume valid start checks are done.
                })
                .eq('id', selectedClientId);

            if (error) throw error;

            toast({
                title: "Success",
                description: `Client assigned with ${packageType} package for ${duration} months!`,
            });
            setIsClaimDialogOpen(false);
            refetch();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to claim client",
                variant: "destructive",
            });
        } finally {
            setIsClaiming(false);
        }
    };

    const handleEditPackageConfirmation = async (packageType: PackageType, duration: number) => {
        if (!selectedClientId) return;

        setIsClaiming(true); // Re-use loading state
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    package_type: packageType,
                    package_duration: duration
                })
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
            setIsClaiming(false);
        }
    };

    const handleUnassign = async () => {
        if (!clientToUnassign) return;

        setIsUnassigning(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    coach_id: null,
                    // Optionally clear package details? Usually keep them for record or clear them.
                    // User request says "unassign", let's just nullify coach_id.
                    // But if they are unassigned, they go back to the pool.
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
            setIsUnassigning(false);
        }
    };

    const getPackageStyle = (packageType: string | null) => {
        switch (packageType) {
            case 'premium':
                return "border-gold border-2 shadow-gold/10 shadow-lg";
            case 'intermediate':
                return "border-blue-500 border-2 shadow-blue-500/10 shadow-lg";
            case 'basic':
                return "border-muted border-2";
            default:
                return "";
        }
    };

    const calculateEndDate = (startDate: string | null, duration: number | null) => {
        if (!startDate || !duration) return null;
        const start = new Date(startDate);
        // Add duration months
        const end = new Date(start.setMonth(start.getMonth() + duration));
        return end.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            {/* Header for Full Screen Mode */}
            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <img src={logoUrl} alt="Dawnage AI" className="w-[150px]" />
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">{user?.email}</p>
                        <p className="text-xs text-muted-foreground">Coach Dashboard</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={signOut}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-2">Coach Dashboard</h1>
                <p className="text-sm md:text-base text-muted-foreground">Manage your clients and training rosters</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{assignedClients.length}</div>
                        <p className="text-xs text-muted-foreground">Active in your roster</p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unassignedClients.length}</div>
                        <p className="text-xs text-muted-foreground">Looking for a coach</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assigned Clients */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        My Clients
                    </h2>
                    <div className="space-y-4">
                        {assignedClients.length === 0 ? (
                            <Card className="rounded-2xl border-dashed">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                                    <p className="text-muted-foreground mb-4">You haven't assigned any clients yet.</p>
                                    <Button variant="outline" className="rounded-xl">Browse Unassigned Users</Button>
                                </CardContent>
                            </Card>
                        ) : (
                            assignedClients.map((client) => {
                                // @ts-ignore - package_type is dynamically added
                                const packageStyle = getPackageStyle(client.package_type);
                                // @ts-ignore
                                const startDate = client.package_start_date;
                                // @ts-ignore
                                const duration = client.package_duration;
                                const endDate = calculateEndDate(startDate, duration);

                                return (
                                    <Card key={client.id} className={cn("rounded-2xl transition-all", packageStyle)}>
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {client.avatar_url ? (
                                                    <img src={client.avatar_url} alt={client.full_name} className="w-10 h-10 rounded-full bg-muted" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {client.full_name?.charAt(0) || "U"}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-bold">{client.full_name || "Unknown User"}</h3>
                                                    <p className="text-sm text-muted-foreground mb-1">{client.email}</p>
                                                    <div className="text-xs space-y-0.5 text-muted-foreground">
                                                        {/* @ts-ignore */}
                                                        <div>Package: <span className="font-medium text-foreground capitalize">{client.package_type || 'None'}</span></div>
                                                        <div>Start: <span className="font-medium text-foreground">{startDate ? new Date(startDate).toLocaleDateString() : 'Not yet started'}</span></div>
                                                        {endDate && <div>End: <span className="font-medium text-foreground">{endDate}</span></div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full"
                                                    onClick={() => handleViewClient(client.id)}
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                                            <MoreVertical className="w-4 h-4" />
                                                            <span className="sr-only">Open menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleViewClient(client.id)}>
                                                            View Dashboard
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openEditPackageDialog(client)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit Package
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => confirmUnassignClient(client)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <UserX className="w-4 h-4 mr-2" />
                                                            Unassign Client
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Unassigned Clients */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <UserPlus className="w-6 h-6" />
                        Unassigned Clients
                    </h2>
                    <div className="space-y-4">
                        {unassignedClients.length === 0 ? (
                            <p className="text-muted-foreground">No new clients looking for a coach right now.</p>
                        ) : (
                            unassignedClients.map((client) => (
                                <Card key={client.id} className="rounded-2xl">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground font-bold">
                                                {client.full_name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{client.full_name || "Unknown User"}</h3>
                                                <p className="text-sm text-muted-foreground">{client.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            className="rounded-xl"
                                            onClick={() => openClaimDialog(client.id, client.full_name || "")}
                                        >
                                            Claim Client
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <PackageSelectDialog
                open={isClaimDialogOpen}
                onOpenChange={setIsClaimDialogOpen}
                onConfirm={handleClaimConfirmation}
                isLoading={isClaiming}
                clientName={selectedClientName}
                mode="claim"
            />

            <PackageSelectDialog
                open={isEditPackageDialogOpen}
                onOpenChange={setIsEditPackageDialogOpen}
                onConfirm={handleEditPackageConfirmation}
                isLoading={isClaiming}
                clientName={selectedClientName}
                mode="edit"
                initialPackage={editInitialValues?.package}
                initialDuration={editInitialValues?.duration}
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
                            {isUnassigning ? "Unassigning..." : "Unassign Client"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
