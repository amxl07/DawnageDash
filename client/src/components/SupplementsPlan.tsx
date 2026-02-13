import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X, Plus, Trash2, Loader2, Pill } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Supplement {
    id: string;
    name: string;
    serving: string;
    timing: string;
}

interface SupplementsPlanProps {
    userId: string;
    isCoach: boolean;
}

const TIMING_OPTIONS = [
    "Morning",
    "Pre-Workout",
    "Post-Workout",
    "Afternoon",
    "Evening",
    "Before Bed",
    "With Meals",
    "Between Meals"
];

export function SupplementsPlan({ userId, isCoach }: SupplementsPlanProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [supplements, setSupplements] = useState<Supplement[]>([]);

    const { data, isLoading } = useQuery({
        queryKey: ['supplements', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('supplements_data')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data?.supplements_data || null;
        },
        enabled: !!userId
    });

    useEffect(() => {
        if (data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                setSupplements(Array.isArray(parsed) ? parsed : []);
            } catch {
                setSupplements([]);
            }
        } else {
            setSupplements([]);
        }
    }, [data]);

    const saveMutation = useMutation({
        mutationFn: async (supplementsData: Supplement[]) => {
            const { error } = await supabase
                .from('users')
                .update({ supplements_data: JSON.stringify(supplementsData) })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplements', userId] });
            toast({
                title: "Success",
                description: "Supplements plan saved successfully",
            });
            setIsEditing(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to save supplements plan",
                variant: "destructive",
            });
        }
    });

    const handleAddSupplement = () => {
        setSupplements([
            ...supplements,
            {
                id: crypto.randomUUID(),
                name: "",
                serving: "",
                timing: "Morning"
            }
        ]);
    };

    const handleRemoveSupplement = (id: string) => {
        setSupplements(supplements.filter(s => s.id !== id));
    };

    const handleUpdateSupplement = (id: string, field: keyof Supplement, value: string) => {
        setSupplements(supplements.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ));
    };

    const handleSave = () => {
        // Filter out empty supplements
        const validSupplements = supplements.filter(s => s.name.trim() !== "");
        saveMutation.mutate(validSupplements);
    };

    const handleCancel = () => {
        // Reset to original data
        if (data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                setSupplements(Array.isArray(parsed) ? parsed : []);
            } catch {
                setSupplements([]);
            }
        } else {
            setSupplements([]);
        }
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-primary" />
                        <CardTitle className="text-xl">Supplements Plan</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCoach && (
                            isEditing ? (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        size="sm"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        size="sm"
                                        disabled={saveMutation.isPending}
                                    >
                                        {saveMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Save Plan
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditing(true)}
                                    size="sm"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Plan
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {supplements.length === 0 && !isEditing ? (
                    <div className="text-center py-12">
                        <Pill className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">
                            {isCoach
                                ? "No supplements added yet. Click 'Edit Plan' to add supplements."
                                : "No supplements plan has been assigned yet."}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold w-[40%]">Name</TableHead>
                                    <TableHead className="font-semibold w-[25%]">Serving</TableHead>
                                    <TableHead className="font-semibold w-[25%]">Timing</TableHead>
                                    {isEditing && <TableHead className="w-[10%]"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supplements.map((supplement, index) => (
                                    <TableRow key={supplement.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium">
                                            {isEditing ? (
                                                <Input
                                                    value={supplement.name}
                                                    onChange={(e) => handleUpdateSupplement(supplement.id, 'name', e.target.value)}
                                                    placeholder="e.g., Whey Protein"
                                                    className="h-9"
                                                />
                                            ) : (
                                                <span className="text-foreground">{supplement.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    value={supplement.serving}
                                                    onChange={(e) => handleUpdateSupplement(supplement.id, 'serving', e.target.value)}
                                                    placeholder="e.g., 30g"
                                                    className="h-9"
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">{supplement.serving}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Select
                                                    value={supplement.timing}
                                                    onValueChange={(value) => handleUpdateSupplement(supplement.id, 'timing', value)}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TIMING_OPTIONS.map(option => (
                                                            <SelectItem key={option} value={option}>
                                                                {option}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-muted-foreground">{supplement.timing}</span>
                                            )}
                                        </TableCell>
                                        {isEditing && (
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveSupplement(supplement.id)}
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {isEditing && (
                    <Button
                        variant="outline"
                        onClick={handleAddSupplement}
                        className="mt-4 w-full border-dashed"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Supplement
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
