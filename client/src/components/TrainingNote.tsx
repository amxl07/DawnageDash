import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchNote, updateNote } from "@/lib/api";
import { Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TrainingNoteProps {
    userId: string;
    noteType: 'cardio' | 'steps' | 'supplements' | 'training' | 'nutrition';
    title: string;
    isCoach: boolean;
}

export function TrainingNote({ userId, noteType, title, isCoach }: TrainingNoteProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [noteJson, setNoteJson] = useState("");

    let dbColumn = 'cardio_note';
    if (noteType === 'steps') dbColumn = 'steps_note';
    if (noteType === 'supplements') dbColumn = 'supplements_note';
    if (noteType === 'training') dbColumn = 'training_note';
    if (noteType === 'nutrition') dbColumn = 'nutrition_note';

    const { data: noteData, isLoading } = useQuery({
        queryKey: ['trainingNote', userId, noteType],
        queryFn: async () => {
            const result = await fetchNote(userId, dbColumn);
            return result?.value || "";
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (noteData !== undefined) {
            setNoteJson(noteData);
        }
    }, [noteData]);

    const updateNoteMutation = useMutation({
        mutationFn: async (newNote: string) => {
            await updateNote(userId, dbColumn, newNote);
            return newNote;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trainingNote', userId, noteType] });
            toast({
                title: "Success",
                description: "Note updated successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update note",
                variant: "destructive",
            });
        }
    });

    const handleSave = () => {
        updateNoteMutation.mutate(noteJson);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Textarea
                            value={noteJson}
                            onChange={(e) => setNoteJson(e.target.value)}
                            placeholder={isCoach ? `Add ${title.toLowerCase()} notes here...` : `No ${title.toLowerCase()} notes added yet.`}
                            className="min-h-[200px] resize-none"
                            disabled={!isCoach}
                        />

                        {isCoach && (
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSave}
                                    disabled={updateNoteMutation.isPending || noteJson === noteData}
                                >
                                    {updateNoteMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save Notes
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
