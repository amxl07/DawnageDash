import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Save, Plus, Trash2, Dumbbell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


interface WorkoutLogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ExerciseRow {
    id: string;
    name: string;
    sets: WorkoutSet[];
}

interface WorkoutSet {
    reps: string;
    weight: string;
    rpe: string;
}

export function WorkoutLogDialog({ open, onOpenChange }: WorkoutLogDialogProps) {
    const { user, viewedUserId } = useAuth();
    const targetUserId = viewedUserId || user?.id;
    const queryClient = useQueryClient();
    const [date, setDate] = useState<Date>(new Date());
    const [selectedPlanId, setSelectedPlanId] = useState<string>("custom");
    const [workoutTitle, setWorkoutTitle] = useState("");
    const [exercises, setExercises] = useState<ExerciseRow[]>([]);
    const [existingLogId, setExistingLogId] = useState<string | null>(null);
    const [isLoadingLog, setIsLoadingLog] = useState(false);

    // Fetch user's workout plans
    const { data: workoutPlans } = useQuery({
        queryKey: ['workoutPlans', targetUserId],
        queryFn: async () => {
            if (!targetUserId) return [];
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('user_id', targetUserId)
                .order('day_number', { ascending: true }); // Ensure ordered by day number
            if (error) throw error;
            return data;
        },
        enabled: !!targetUserId,
    });

    // Check for existing log when date or user changes
    useEffect(() => {
        const checkExistingLog = async () => {
            if (!targetUserId || !date) return;

            setIsLoadingLog(true);
            try {
                const formattedDate = format(date, 'yyyy-MM-dd');
                const { data, error } = await supabase
                    .from('workout_logs')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .eq('date', formattedDate)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    // Existing log found
                    setExistingLogId(data.id);
                    setWorkoutTitle(data.title);

                    // Parse content
                    try {
                        let parsedContent = typeof data.content === 'string'
                            ? JSON.parse(data.content)
                            : data.content;

                        // Map stored structure to UI structure
                        if (Array.isArray(parsedContent)) {
                            const loadedExercises: ExerciseRow[] = parsedContent.map((ex: any) => ({
                                id: crypto.randomUUID(),
                                name: ex.exercise || "",
                                sets: ex.sets.map((s: any) => ({
                                    reps: s.reps || "",
                                    weight: s.weight || "",
                                    rpe: s.rpe || ""
                                }))
                            }));
                            setExercises(loadedExercises);
                        }
                    } catch (e) {
                        console.error("Error parsing log content", e);
                    }
                } else {
                    // No existing log - reset to default plan logic
                    setExistingLogId(null);
                    loadDefaultPlanForDate();
                }
            } catch (error) {
                console.error("Error checking existing log:", error);
                // Fallback to default behavior on error
                setExistingLogId(null);
                loadDefaultPlanForDate();
            } finally {
                setIsLoadingLog(false);
            }
        };

        checkExistingLog();
    }, [date, targetUserId, workoutPlans]); // Re-run if date, user, or loaded plans change

    const loadDefaultPlanForDate = () => {
        if (workoutPlans && workoutPlans.length > 0) {
            const dayName = format(date, 'EEEE');
            // Try to find plan for specific day, otherwise default to the first plan (Day 1)
            const planToSelect = workoutPlans.find(p => p.day_of_week === dayName) || workoutPlans[0];

            if (planToSelect) {
                // If switching to a new plan ID (or if nothing selected yet), load it
                // We default to "custom" if we manually changed it, but here we are resetting context
                setSelectedPlanId(planToSelect.id);

                // Find index for title
                const idx = workoutPlans.findIndex(p => p.id === planToSelect.id);
                setWorkoutTitle(`Day ${idx + 1} - ${planToSelect.focus || 'Workout'}`);
                loadPlanData(planToSelect);
            }
        } else {
            // Reset if no plans available
            setWorkoutTitle("");
            setExercises([]);
        }
    };

    const createEmptySet = (): WorkoutSet => ({ reps: "", weight: "", rpe: "" });

    const loadPlanData = (plan: any) => {
        // Only set title if not already set by logic above - but actually the logic above handles title.
        // This function mainly loads exercises
        try {
            const parsedExercises = typeof plan.exercises === 'string'
                ? JSON.parse(plan.exercises)
                : plan.exercises;

            if (Array.isArray(parsedExercises)) {
                const loadedExercises = parsedExercises.map((ex: any) => {
                    const name = ex.Exercise || ex.exercise || ex.name || "";
                    // Parse sets from string (e.g. "3") or use default 3
                    const setTarget = parseInt(String(ex.Sets || ex.sets)) || 3;
                    const sets = Array(Math.max(1, setTarget)).fill(null).map(() => createEmptySet());

                    return {
                        id: crypto.randomUUID(),
                        name,
                        sets
                    };
                });
                setExercises(loadedExercises);
            }
        } catch (e) {
            console.error("Failed to parse exercises", e);
            setExercises([]);
        }
    };

    const handlePlanChange = (planId: string) => {
        // If user manually changes plan, we are arguably "overwriting" the log intent with a new template
        // But for editing an existing log, this might be weird. 
        // For now, allow it, but it stays as "editing" the same log ID if it exists.

        setSelectedPlanId(planId);
        const plan = workoutPlans?.find(p => p.id === planId);
        if (plan) {
            // Find index to set title as Day X
            const idx = workoutPlans?.findIndex(p => p.id === planId) ?? -1;
            setWorkoutTitle(`Day ${idx + 1} - ${plan.focus || 'Workout'}`);
            loadPlanData(plan);
        }
    };

    // Table helpers
    const maxSets = exercises.reduce((max, ex) => Math.max(max, ex.sets.length), 0);

    const updateSet = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: string) => {
        const newExercises = [...exercises];
        newExercises[exerciseIndex].sets[setIndex][field] = value;
        setExercises(newExercises);
    };

    // Save mutation
    const saveLogMutation = useMutation({
        mutationFn: async () => {
            if (!targetUserId) throw new Error("No target user");

            // Format content for storage
            const content = exercises.map(ex => ({
                exercise: ex.name,
                sets: ex.sets.map((s, i) => ({
                    setNumber: i + 1,
                    reps: s.reps,
                    weight: s.weight,
                    rpe: s.rpe
                }))
            }));

            const payload = {
                user_id: targetUserId,
                date: format(date, 'yyyy-MM-dd'),
                title: workoutTitle,
                content: JSON.stringify(content)
            };

            let error;
            if (existingLogId) {
                // Update existing
                const res = await supabase
                    .from('workout_logs')
                    .update(payload)
                    .eq('id', existingLogId);
                error = res.error;
            } else {
                // Insert new
                const res = await supabase
                    .from('workout_logs')
                    .insert(payload);
                error = res.error;
            }

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
            onOpenChange(false);
        }
    });

    const handleSave = () => {
        if (!workoutTitle.trim()) return;
        saveLogMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full md:max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        Log Workout
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Controls Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 pb-2">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => d && setDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Day</Label>
                            <Select value={selectedPlanId} onValueChange={handlePlanChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {workoutPlans?.map((plan, index) => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                            Day {index + 1} ({plan.day_of_week})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto px-4 md:px-6 py-2">
                        {/* Mobile View: Vertical Cards */}
                        <div className="block md:hidden space-y-6">
                            {exercises.map((exercise, idx) => (
                                <div key={exercise.id} className="bg-muted/10 rounded-xl p-4 border border-border/50">
                                    <h4 className="font-bold text-base mb-3 text-primary">{exercise.name}</h4>

                                    <div className="space-y-3">
                                        {exercise.sets.map((set, setIdx) => (
                                            <div key={setIdx} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                    {setIdx + 1}
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] uppercase text-muted-foreground block text-center">Kg</span>
                                                    <Input
                                                        placeholder="0"
                                                        value={set.weight}
                                                        onChange={(e) => updateSet(idx, setIdx, 'weight', e.target.value)}
                                                        className="h-9 text-center px-1 font-medium bg-background"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] uppercase text-muted-foreground block text-center">Reps</span>
                                                    <Input
                                                        placeholder="0"
                                                        value={set.reps}
                                                        onChange={(e) => updateSet(idx, setIdx, 'reps', e.target.value)}
                                                        className="h-9 text-center px-1 font-medium bg-background"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] uppercase text-muted-foreground block text-center">RPE</span>
                                                    <Input
                                                        placeholder="-"
                                                        value={set.rpe}
                                                        onChange={(e) => updateSet(idx, setIdx, 'rpe', e.target.value)}
                                                        className="h-9 text-center px-1 text-muted-foreground bg-background"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {exercises.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    No exercises in this plan.
                                </div>
                            )}
                        </div>

                        {/* Desktop View: Horizontal Table */}
                        <div className="hidden md:block min-w-[800px] border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-left w-[250px] font-semibold border-b">Exercise</th>
                                        {Array.from({ length: maxSets }).map((_, i) => (
                                            <th key={i} className="p-2 text-center border-b border-l min-w-[180px]">
                                                <div className="font-semibold text-primary mb-1">SET {i + 1}</div>
                                                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                                                    <span>Kg</span>
                                                    <span>Reps</span>
                                                    <span>RPE</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-background">
                                    {exercises.map((exercise, idx) => (
                                        <tr key={exercise.id} className="group hover:bg-muted/10 transition-colors">
                                            <td className="p-3 border-b align-top bg-background/50">
                                                <div className="font-bold text-base py-2">{exercise.name}</div>
                                            </td>

                                            {/* Render cells for each possible set column */}
                                            {Array.from({ length: maxSets }).map((_, setIdx) => {
                                                const set = exercise.sets[setIdx];
                                                return (
                                                    <td key={setIdx} className="p-2 border-b border-l align-top bg-background/50">
                                                        {set ? (
                                                            <div className="grid grid-cols-3 gap-1">
                                                                <Input
                                                                    placeholder="0"
                                                                    value={set.weight}
                                                                    onChange={(e) => updateSet(idx, setIdx, 'weight', e.target.value)}
                                                                    className="h-9 text-center px-1 font-medium text-primary"
                                                                />
                                                                <Input
                                                                    placeholder="0"
                                                                    value={set.reps}
                                                                    onChange={(e) => updateSet(idx, setIdx, 'reps', e.target.value)}
                                                                    className="h-9 text-center px-1 font-medium"
                                                                />
                                                                <Input
                                                                    placeholder="-"
                                                                    value={set.rpe}
                                                                    onChange={(e) => updateSet(idx, setIdx, 'rpe', e.target.value)}
                                                                    className="h-9 text-center px-1 text-muted-foreground"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="h-9 bg-muted/10 rounded-md border border-dashed border-border/50"></div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t bg-muted/20">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saveLogMutation.isPending} className="bg-primary hover:bg-primary/90">
                            {saveLogMutation.isPending ? "Saving..." : "Save Workout Log"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
