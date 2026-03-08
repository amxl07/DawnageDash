import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PackageSelectDialog, PackageType } from "@/components/PackageSelectDialog";

export default function CoachClaimPage() {
  const { user, viewedCoachId } = useAuth();
  const effectiveCoachId = viewedCoachId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  // Fetch only unassigned clients
  const { data: unassignedClients, isLoading } = useQuery({
    queryKey: ["unassigned-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "client")
        .is("coach_id", null);
      if (error) throw error;
      return data;
    },
  });

  const openClaimDialog = (clientId: string, clientName: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName || "Client");
    setIsClaimDialogOpen(true);
  };

  const handleClaimConfirmation = async (
    packageType: PackageType,
    duration: number
  ) => {
    if (!selectedClientId) return;

    setIsClaiming(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          coach_id: effectiveCoachId,
          package_type: packageType,
          package_duration: duration,
        })
        .eq("id", selectedClientId);

      if (error) throw error;

      // Log assignment in history for retention tracking
      await supabase.from("coach_client_history").insert({
        coach_id: effectiveCoachId,
        client_id: selectedClientId,
        event_type: "assigned",
        package_type: packageType,
        package_duration: duration,
      });

      toast({
        title: "Success",
        description: `Client assigned with ${packageType} package for ${duration} months!`,
      });

      // Send welcome email
      try {
        const client = unassignedClients?.find(
          (c) => c.id === selectedClientId
        );
        if (client?.email) {
          const { error: emailError } = await supabase.functions.invoke(
            "send-welcome-email",
            {
              body: {
                email: client.email,
                name: client.full_name || "Valued Client",
                packageType,
                coachName:
                  user?.user_metadata?.full_name || "Your Coach",
                duration,
              },
            }
          );
          if (emailError) {
            console.error("Failed to send welcome email:", emailError);
            toast({
              title: "Email Error",
              description:
                "Client claimed, but welcome email failed to send.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Email Sent",
              description: "Welcome email with resources sent to client.",
            });
          }
        }
      } catch (emailErr) {
        console.error("Error invoking email function:", emailErr);
      }

      setIsClaimDialogOpen(false);
      // Invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["unassigned-clients"] });
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Claim Clients</h1>
        <p className="text-muted-foreground mt-1">
          Assign unassigned clients to your coaching roster
        </p>
      </div>

      {/* Stats */}
      <Card className="rounded-2xl w-fit">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            Available Clients
          </CardTitle>
          <UserPlus className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {unassignedClients?.length || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Looking for a coach
          </p>
        </CardContent>
      </Card>

      {/* Client Grid */}
      {!unassignedClients || unassignedClients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No unassigned clients at the moment.</p>
          <p className="text-sm mt-1">
            Check back later for new clients looking for a coach.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unassignedClients.map((client) => (
            <Card key={client.id} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground font-bold shrink-0">
                    {client.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">
                      {client.full_name || "Unknown User"}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {client.email}
                    </p>
                    {client.country && (
                      <p className="text-xs text-muted-foreground">
                        {client.country}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full rounded-xl"
                  onClick={() =>
                    openClaimDialog(client.id, client.full_name || "")
                  }
                >
                  Claim Client
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
