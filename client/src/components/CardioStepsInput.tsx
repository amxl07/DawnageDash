import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, TrendingUp, Loader2, Save } from "lucide-react";

interface CardioStepsInputProps {
    userId: string;
    isCoach: boolean;
}

export function CardioStepsInput({ userId, isCoach }: CardioStepsInputProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [cardio, setCardio] = useState("");
    const [steps, setSteps] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ['cardioSteps', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('cardio_note, steps_note')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (data) {
            setCardio(data.cardio_note || "");
            setSteps(data.steps_note || "");
        }
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('users')
                .update({
                    cardio_note: cardio,
                    steps_note: steps
                })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cardioSteps', userId] });
            toast({
                title: "Success",
                description: "Cardio and steps targets updated",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update",
                variant: "destructive",
            });
        }
    });

    const handleSave = () => {
        updateMutation.mutate();
    };

    const hasChanges = cardio !== (data?.cardio_note || "") || steps !== (data?.steps_note || "");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            <div className="flex items-end gap-3 max-w-2xl">
                <div className="space-y-1.5 flex-1 max-w-[200px]">
                    <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Activity className="w-3.5 h-3.5" />
                        Cardio
                    </Label>
                    <Input
                        value={cardio}
                        onChange={(e) => setCardio(e.target.value)}
                        placeholder={isCoach ? "e.g., 30 mins" : "Not set"}
                        disabled={!isCoach}
                        className="h-9 text-sm"
                    />
                </div>

                <div className="space-y-1.5 flex-1 max-w-[200px]">
                    <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Steps Target
                    </Label>
                    <Input
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        placeholder={isCoach ? "e.g., 10000" : "Not set"}
                        disabled={!isCoach}
                        className="h-9 text-sm"
                    />
                </div>

                {isCoach && (
                    <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending || !hasChanges}
                        size="sm"
                        variant="outline"
                        className="h-9"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Save
                    </Button>
                )}
            </div>
        </div>
    );
}
