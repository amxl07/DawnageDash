import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PackageSelectDialog, PackageType } from "@/components/PackageSelectDialog";

export default function CoachClaimPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Dialog state
    const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedClientName, setSelectedClientName] = useState("");
    const [isClaiming, setIsClaiming] = useState(false);

    // Fetch unassigned clients
    const { data: unassignedClients, isLoading, refetch } = useQuery({
        queryKey: ['coach-unassigned-clients'],
        queryFn: async () => {
            // Fetch users who are clients and have NO coach_id
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'client')
                .is('coach_id', null);

            if (error) throw error;
            return data;
        },
    });

    const openClaimDialog = (clientId: string, clientName: string) => {
        setSelectedClientId(clientId);
        setSelectedClientName(clientName || "Client");
        setIsClaimDialogOpen(true);
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
                })
                .eq('id', selectedClientId);

            if (error) throw error;

            toast({
                title: "Success",
                description: `Client assigned with ${packageType} package for ${duration} months!`,
            });

            // Send Welcome Email via Edge Function
            try {
                const client = unassignedClients?.find(c => c.id === selectedClientId);
                if (client && client.email) {
                    const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                        body: {
                            email: client.email,
                            name: client.full_name || "Valued Client",
                            packageType: packageType,
                            coachName: user?.user_metadata?.full_name || "Your Coach",
                            duration: duration
                        }
                    });
                    if (emailError) {
                        console.error("Failed to send welcome email:", emailError);
                    }
                }
            } catch (emailErr) {
                console.error("Error invoking email function:", emailErr);
            }

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading potential clients...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Claim Clients</h1>
                <p className="text-muted-foreground">Claim new clients and add them to your roster.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-xl shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Available Clients</CardTitle>
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unassignedClients?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Unassigned Clients Grid */}
            <div>
                {unassignedClients && unassignedClients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unassignedClients.map((client) => (
                            <Card key={client.id} className="rounded-xl border-dashed">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                                            {client.full_name?.charAt(0) || "U"}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-bold text-sm truncate w-[120px]">{client.full_name || "Unknown"}</h3>
                                            {/* @ts-ignore */}
                                            {client.country && <p className="text-[10px] text-muted-foreground truncate">📍 {client.country}</p>}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg h-8"
                                        onClick={() => openClaimDialog(client.id, client.full_name || "")}
                                    >
                                        Claim
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border rounded-xl bg-muted/10">
                        <p className="text-muted-foreground">No unassigned clients found at the moment.</p>
                    </div>
                )}
            </div>

            <PackageSelectDialog
                open={isClaimDialogOpen}
                onOpenChange={setIsClaimDialogOpen}
                onConfirm={handleClaimConfirmation}
                isLoading={isClaiming}
                clientName={selectedClientName}
                mode="claim"
            />
        </div>
    );
}
