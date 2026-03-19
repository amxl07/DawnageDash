import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Dumbbell, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWorkoutDraft } from "@/hooks/useWorkoutDraft";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { MobileWorkoutCarousel } from "@/components/workout-mobile/MobileWorkoutCarousel";
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


interface WorkoutLogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDate?: Date;
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

// --- Phase 1: useReducer ---

interface FormState {
    date: Date;
    selectedPlanId: string;
    workoutTitle: string;
    exercises: ExerciseRow[];
    existingLogId: string | null;
    isDirty: boolean;
    isLoadingLog: boolean;
}

type FormAction =
    | { type: 'SET_DATE'; payload: Date }
    | { type: 'SET_PLAN'; payload: { planId: string; title: string; exercises: ExerciseRow[] } }
    | { type: 'SET_TITLE'; payload: string }
    | { type: 'LOAD_EXISTING_LOG'; payload: { logId: string; title: string; exercises: ExerciseRow[] } }
    | { type: 'LOAD_DEFAULT_PLAN'; payload: { planId: string; title: string; exercises: ExerciseRow[] } }
    | { type: 'RESET_FORM' }
    | { type: 'UPDATE_SET'; payload: { exerciseIndex: number; setIndex: number; field: keyof WorkoutSet; value: string } }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'RESTORE_DRAFT'; payload: { title: string; exercises: ExerciseRow[]; selectedPlanId: string; existingLogId: string | null } }
    | { type: 'MARK_CLEAN' };

function createInitialState(): FormState {
    return {
        date: new Date(),
        selectedPlanId: "custom",
        workoutTitle: "",
        exercises: [],
        existingLogId: null,
        isDirty: false,
        isLoadingLog: false,
    };
}

function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
        case 'SET_DATE':
            return { ...state, date: action.payload, isDirty: false };
        case 'SET_PLAN':
            return {
                ...state,
                selectedPlanId: action.payload.planId,
                workoutTitle: action.payload.title,
                exercises: action.payload.exercises,
                isDirty: true,
            };
        case 'SET_TITLE':
            return { ...state, workoutTitle: action.payload, isDirty: true };
        case 'LOAD_EXISTING_LOG':
            return {
                ...state,
                existingLogId: action.payload.logId,
                workoutTitle: action.payload.title,
                exercises: action.payload.exercises,
                isDirty: false,
                isLoadingLog: false,
            };
        case 'LOAD_DEFAULT_PLAN':
            return {
                ...state,
                selectedPlanId: action.payload.planId,
                workoutTitle: action.payload.title,
                exercises: action.payload.exercises,
                existingLogId: null,
                isDirty: false,
                isLoadingLog: false,
            };
        case 'RESET_FORM':
            return {
                ...state,
                workoutTitle: "",
                exercises: [],
                existingLogId: null,
                isDirty: false,
                isLoadingLog: false,
            };
        case 'UPDATE_SET': {
            const { exerciseIndex, setIndex, field, value } = action.payload;
            return {
                ...state,
                isDirty: true,
                exercises: state.exercises.map((ex, eIdx) =>
                    eIdx !== exerciseIndex ? ex : {
                        ...ex,
                        sets: ex.sets.map((set, sIdx) =>
                            sIdx !== setIndex ? set : { ...set, [field]: value }
                        ),
                    }
                ),
            };
        }
        case 'SET_LOADING':
            return { ...state, isLoadingLog: action.payload };
        case 'RESTORE_DRAFT':
            return {
                ...state,
                workoutTitle: action.payload.title,
                exercises: action.payload.exercises,
                selectedPlanId: action.payload.selectedPlanId,
                existingLogId: action.payload.existingLogId,
                isDirty: true,
                isLoadingLog: false,
            };
        case 'MARK_CLEAN':
            return { ...state, isDirty: false };
        default:
            return state;
    }
}

// --- Helpers ---

const createEmptySet = (): WorkoutSet => ({ reps: "", weight: "", rpe: "" });

function parseExercisesFromPlan(plan: any): ExerciseRow[] {
    try {
        const parsedExercises = typeof plan.exercises === 'string'
            ? JSON.parse(plan.exercises)
            : plan.exercises;

        if (Array.isArray(parsedExercises)) {
            return parsedExercises.map((ex: any) => {
                const name = ex.Exercise || ex.exercise || ex.name || "";
                const setTarget = parseInt(String(ex.Sets || ex.sets)) || 3;
                const sets = Array(Math.max(1, setTarget)).fill(null).map(() => createEmptySet());
                return { id: crypto.randomUUID(), name, sets };
            });
        }
    } catch (e) {
        console.error("Failed to parse exercises", e);
    }
    return [];
}

function parseExercisesFromLog(content: any): ExerciseRow[] {
    try {
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        if (Array.isArray(parsedContent)) {
            return parsedContent.map((ex: any) => ({
                id: crypto.randomUUID(),
                name: ex.exercise || "",
                sets: ex.sets.map((s: any) => ({
                    reps: s.reps || "",
                    weight: s.weight || "",
                    rpe: s.rpe || "",
                })),
            }));
        }
    } catch (e) {
        console.error("Error parsing log content", e);
    }
    return [];
}

// --- Component ---

export function WorkoutLogDialog({ open, onOpenChange, initialDate }: WorkoutLogDialogProps) {
    const { user, viewedUserId } = useAuth();
    const targetUserId = viewedUserId || user?.id;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [state, dispatch] = useReducer(formReducer, undefined, createInitialState);
    const { date, selectedPlanId, workoutTitle, exercises, existingLogId, isDirty, isLoadingLog } = state;

    // Phase 2: Refs for breaking dependency cycles
    const isDirtyRef = useRef(isDirty);
    useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

    const workoutPlansRef = useRef<any[] | undefined>(undefined);

    // Phase 5: Unsaved changes confirmation
    const [showDiscardAlert, setShowDiscardAlert] = useState(false);
    const pendingCloseRef = useRef(false);

    // Draft persistence
    const dateKey = format(date, 'yyyy-MM-dd');
    const { saveDraft, loadDraft, clearDraft } = useWorkoutDraft(targetUserId, dateKey);

    // Fetch user's active workout plan config
    const { data: activePlanConfig } = useQuery({
        queryKey: ['activePlanConfig', targetUserId],
        queryFn: async () => {
            if (!targetUserId) return null;
            const { data, error } = await supabase
                .from('users')
                .select('active_workout_plan')
                .eq('id', targetUserId)
                .single();
            if (error) throw error;
            if (!data?.active_workout_plan) return null;
            try {
                return JSON.parse(data.active_workout_plan) as {
                    level: string;
                    workoutType: string;
                    subCategory?: string | null;
                    daysPerWeek: number;
                };
            } catch {
                return null;
            }
        },
        enabled: !!targetUserId,
    });

    // Fetch workout plans filtered by active plan config
    const { data: workoutPlans } = useQuery({
        queryKey: ['workoutPlans', targetUserId, activePlanConfig?.level, activePlanConfig?.workoutType, activePlanConfig?.subCategory, activePlanConfig?.daysPerWeek],
        queryFn: async () => {
            if (!targetUserId || !activePlanConfig) return [];

            let query = supabase
                .from('workout_plans')
                .select('*')
                .eq('user_id', targetUserId)
                .eq('level', activePlanConfig.level)
                .eq('workout_type', activePlanConfig.workoutType)
                .eq('days_per_week', activePlanConfig.daysPerWeek);

            if (activePlanConfig.subCategory) {
                query = query.eq('sub_category', activePlanConfig.subCategory);
            } else {
                query = query.is('sub_category', null);
            }

            const { data, error } = await query.order('day_number', { ascending: true });
            if (error) throw error;

            // Deduplicate by day_number, keeping the most recent entry
            const seen = new Map<number, any>();
            for (const row of (data || [])) {
                const existing = seen.get(row.day_number);
                if (!existing || row.id > existing.id) {
                    seen.set(row.day_number, row);
                }
            }
            return Array.from(seen.values()).sort((a, b) => a.day_number - b.day_number);
        },
        enabled: !!targetUserId && !!activePlanConfig,
    });

    // Keep ref in sync
    useEffect(() => { workoutPlansRef.current = workoutPlans; }, [workoutPlans]);

    // Set initial date when dialog opens with a specific date
    useEffect(() => {
        if (open && initialDate) {
            dispatch({ type: 'SET_DATE', payload: initialDate });
        }
    }, [open, initialDate]);

    // --- Phase 2 & 3: Fixed useEffect with AbortController ---
    useEffect(() => {
        if (!open) return; // Don't fetch when dialog is closed

        const controller = new AbortController();

        const checkExistingLog = async () => {
            if (!targetUserId || !date) return;

            // Phase 4: Check for draft first
            const draft = loadDraft();
            if (draft) {
                dispatch({
                    type: 'RESTORE_DRAFT',
                    payload: {
                        title: draft.workoutTitle,
                        exercises: draft.exercises,
                        selectedPlanId: draft.selectedPlanId,
                        existingLogId: draft.existingLogId,
                    },
                });
                toast({ title: "Draft restored", description: "Your unsaved workout data has been restored." });
                return;
            }

            // Don't overwrite user edits
            if (isDirtyRef.current) return;

            dispatch({ type: 'SET_LOADING', payload: true });

            try {
                const formattedDate = format(date, 'yyyy-MM-dd');
                const { data, error } = await supabase
                    .from('workout_logs')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .eq('date', formattedDate)
                    .maybeSingle();

                if (error) throw error;

                // Phase 3: Don't update stale state
                if (controller.signal.aborted) return;

                if (data) {
                    const loadedExercises = parseExercisesFromLog(data.content);
                    dispatch({
                        type: 'LOAD_EXISTING_LOG',
                        payload: { logId: data.id, title: data.title, exercises: loadedExercises },
                    });
                } else {
                    // No existing log — load default plan (first by day_number)
                    const plans = workoutPlansRef.current;
                    if (plans && plans.length > 0) {
                        const planToSelect = plans[0];
                        const title = `Day ${planToSelect.day_number} - ${planToSelect.focus || 'Workout'}`;
                        const loadedExercises = parseExercisesFromPlan(planToSelect);
                        if (!controller.signal.aborted) {
                            dispatch({
                                type: 'LOAD_DEFAULT_PLAN',
                                payload: { planId: planToSelect.id, title, exercises: loadedExercises },
                            });
                        }
                    } else {
                        if (!controller.signal.aborted) {
                            dispatch({ type: 'RESET_FORM' });
                        }
                    }
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error("Error checking existing log:", error);
                // Fallback: try loading default plan
                const plans = workoutPlansRef.current;
                if (plans && plans.length > 0) {
                    const planToSelect = plans[0];
                    const title = `Day ${planToSelect.day_number} - ${planToSelect.focus || 'Workout'}`;
                    const loadedExercises = parseExercisesFromPlan(planToSelect);
                    dispatch({
                        type: 'LOAD_DEFAULT_PLAN',
                        payload: { planId: planToSelect.id, title, exercises: loadedExercises },
                    });
                } else {
                    dispatch({ type: 'RESET_FORM' });
                }
            }
        };

        checkExistingLog();
        return () => controller.abort();
    }, [date, targetUserId, open]); // workoutPlans intentionally excluded

    // One-shot: when workout plans first load AND form is still clean AND no log loaded
    useEffect(() => {
        if (!open) return;
        if (isDirtyRef.current) return;
        if (existingLogId) return;
        if (!workoutPlans || workoutPlans.length === 0) return;
        if (exercises.length > 0) return; // Already have exercises loaded

        const planToSelect = workoutPlans[0];
        const title = `Day ${planToSelect.day_number} - ${planToSelect.focus || 'Workout'}`;
        const loadedExercises = parseExercisesFromPlan(planToSelect);
        dispatch({
            type: 'LOAD_DEFAULT_PLAN',
            payload: { planId: planToSelect.id, title, exercises: loadedExercises },
        });
    }, [workoutPlans, open]);

    // --- Phase 4: Auto-save draft on state changes ---
    useEffect(() => {
        if (!open || !isDirty) return;
        saveDraft({
            workoutTitle,
            exercises,
            selectedPlanId,
            existingLogId,
        });
    }, [workoutTitle, exercises, selectedPlanId, existingLogId, isDirty, open, saveDraft]);

    // --- Phase 5: beforeunload listener ---
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    // --- Handlers ---

    const handleDateChange = useCallback((d: Date) => {
        dispatch({ type: 'SET_DATE', payload: d });
    }, []);

    const handlePlanChange = useCallback((planId: string) => {
        const plans = workoutPlansRef.current;
        const plan = plans?.find((p: any) => p.id === planId);
        if (plan) {
            const title = `Day ${plan.day_number} - ${plan.focus || 'Workout'}`;
            const loadedExercises = parseExercisesFromPlan(plan);
            dispatch({ type: 'SET_PLAN', payload: { planId, title, exercises: loadedExercises } });
        }
    }, []);

    const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: string) => {
        dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex, setIndex, field, value } });
    }, []);

    const handleOpenChange = useCallback((nextOpen: boolean) => {
        if (!nextOpen && isDirtyRef.current) {
            pendingCloseRef.current = true;
            setShowDiscardAlert(true);
            return;
        }
        onOpenChange(nextOpen);
    }, [onOpenChange]);

    const handleDiscardConfirm = useCallback(() => {
        clearDraft();
        dispatch({ type: 'MARK_CLEAN' });
        setShowDiscardAlert(false);
        pendingCloseRef.current = false;
        onOpenChange(false);
    }, [onOpenChange, clearDraft]);

    const handleDiscardCancel = useCallback(() => {
        setShowDiscardAlert(false);
        pendingCloseRef.current = false;
    }, []);

    // Table helpers
    const maxSets = exercises.reduce((max, ex) => Math.max(max, ex.sets.length), 0);

    // Save mutation
    const saveLogMutation = useMutation({
        mutationFn: async () => {
            if (!targetUserId) throw new Error("No target user");

            const content = exercises.map(ex => ({
                exercise: ex.name,
                sets: ex.sets.map((s, i) => ({
                    setNumber: i + 1,
                    reps: s.reps,
                    weight: s.weight,
                    rpe: s.rpe,
                })),
            }));

            const payload = {
                user_id: targetUserId,
                date: format(date, 'yyyy-MM-dd'),
                title: workoutTitle,
                content: JSON.stringify(content),
            };

            let error;
            if (existingLogId) {
                const res = await supabase
                    .from('workout_logs')
                    .update(payload)
                    .eq('id', existingLogId);
                error = res.error;
            } else {
                const res = await supabase
                    .from('workout_logs')
                    .insert(payload);
                error = res.error;
            }

            if (error) throw error;
        },
        onSuccess: () => {
            clearDraft();
            dispatch({ type: 'MARK_CLEAN' });
            queryClient.invalidateQueries({ queryKey: ['workoutLogs'] });
            toast({ title: "Workout saved", description: "Your workout log has been saved successfully." });
            onOpenChange(false);
        },
        onError: (error) => {
            console.error("Error saving workout log:", error);
            toast({
                title: "Save failed",
                description: "Could not save your workout log. Your draft is preserved.",
                variant: "destructive",
            });
        },
    });

    const handleSave = () => {
        if (!workoutTitle.trim() || exercises.length === 0) return;
        saveLogMutation.mutate();
    };

    const canSave = workoutTitle.trim().length > 0 && exercises.length > 0 && !saveLogMutation.isPending;

    if (isMobile) {
        return (
            <>
                <Drawer open={open} onOpenChange={handleOpenChange}>
                    <DrawerContent className="h-[95vh]">
                        <MobileWorkoutCarousel
                            state={state}
                            dispatch={dispatch}
                            workoutPlans={workoutPlans}
                            onSave={handleSave}
                            canSave={canSave}
                            isSaving={saveLogMutation.isPending}
                            onPlanChange={handlePlanChange}
                            targetUserId={targetUserId}
                        />
                    </DrawerContent>
                </Drawer>

                <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You have unsaved workout data. If you close now, your changes will be lost.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleDiscardCancel}>Keep editing</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDiscardConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Discard changes
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-[95vw] w-full md:max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-primary" />
                            Log Workout
                            {isDirty && (
                                <Badge variant="outline" className="ml-2 text-xs text-orange-500 border-orange-500">
                                    Unsaved
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        {/* Loading overlay */}
                        {isLoadingLog && (
                            <div className="absolute inset-0 z-20 bg-background/60 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}

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
                                            onSelect={(d) => d && handleDateChange(d)}
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
                                                Day {plan.day_number} - {plan.focus || 'Workout'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto px-4 md:px-6 py-2">
                            {/* Desktop View: Horizontal Table */}
                            <div className="min-w-[800px] border rounded-lg overflow-hidden">
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

                                                {Array.from({ length: maxSets }).map((_, setIdx) => {
                                                    const set = exercise.sets[setIdx];
                                                    return (
                                                        <td key={setIdx} className="p-2 border-b border-l align-top bg-background/50">
                                                            {set ? (
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        placeholder="0"
                                                                        value={set.weight}
                                                                        onChange={(e) => updateSet(idx, setIdx, 'weight', e.target.value)}
                                                                        className="h-9 text-center px-1 font-medium text-primary"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        placeholder="0"
                                                                        value={set.reps}
                                                                        onChange={(e) => updateSet(idx, setIdx, 'reps', e.target.value)}
                                                                        className="h-9 text-center px-1 font-medium"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="decimal"
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
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={!canSave} className="bg-primary hover:bg-primary/90">
                                {saveLogMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Workout Log"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Phase 5: Discard changes confirmation */}
            <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved workout data. If you close now, your changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleDiscardCancel}>Keep editing</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDiscardConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Discard changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
