import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/dashboard_1762285477469.png";
import { LogOut } from "lucide-react";

export default function CoachDashboard() {
    const { user, setViewedUserId, signOut } = useAuth();
    const { toast } = useToast();

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

    const handleClaimClient = async (clientId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ coach_id: user?.id })
                .eq('id', clientId);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Client assigned to your roster!",
            });
            refetch();
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to claim client",
                variant: "destructive",
            });
        }
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
                            assignedClients.map((client) => (
                                <Card key={client.id} className="rounded-2xl">
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
                                                <p className="text-sm text-muted-foreground">{client.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full"
                                            onClick={() => handleViewClient(client.id)}
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
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
                                            onClick={() => handleClaimClient(client.id)}
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
        </div>
    );
}
