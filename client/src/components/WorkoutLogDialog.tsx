import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Dumbbell, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MobileWorkoutCarousel } from "@/components/workout-mobile/MobileWorkoutCarousel";
import { WorkoutRecordDetails } from "@/components/WorkoutRecordDetails";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  resolveLegacyWorkoutDraft,
  resolveNewWorkoutDraft,
  resolveWorkoutDraft,
  useWorkoutDraft,
  type WorkoutDraftPayload,
} from "@/hooks/useWorkoutDraft";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { prepareWorkoutLogSave, workoutSaveSnapshotMatches, type ActiveWorkoutIdentity } from "@/lib/workout-log-save";
import {
  newLegacyWorkout,
  readWorkoutRecord,
  type WorkoutRecord,
  type WorkoutRecordContext,
  type WorkoutRecordExercise,
  type WorkoutRecordSet,
} from "@/lib/workout-record";

interface WorkoutLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialLogId?: string;
}

type DraftSource = "scoped" | "legacy";
type DraftIssue = { source: DraftSource; reason: string };
type EditableField = "weight" | "reps" | "duration" | "rpe";

interface FormState {
  date: Date;
  selectedPlanId: string;
  workoutTitle: string;
  exercises: WorkoutRecordExercise[];
  document: WorkoutRecord | null;
  context: WorkoutRecordContext | null;
  sourceContent: unknown;
  existingLogId: string | null;
  restoredDraftSource: DraftSource | null;
  draftIssue: DraftIssue | null;
  loadError: string | null;
  isDirty: boolean;
  isLoadingLog: boolean;
  revision: number;
}

type FormAction =
  | { type: "SET_DATE"; payload: Date }
  | { type: "BEGIN_LOAD" }
  | { type: "LOAD_RECORD"; payload: { title: string; document: WorkoutRecord; context: WorkoutRecordContext; sourceContent: unknown; logId: string } }
  | { type: "LOAD_NEW"; payload: { title: string; document: WorkoutRecord; context: WorkoutRecordContext; planId: string } }
  | { type: "RESTORE_DRAFT"; payload: { draft: WorkoutDraftPayload; document: WorkoutRecord; sourceContent: unknown; source: DraftSource } }
  | { type: "LOAD_ERROR"; payload: string }
  | { type: "SET_DRAFT_ISSUE"; payload: DraftIssue | null }
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_PLAN"; payload: { planId: string; title: string; document: WorkoutRecord } }
  | { type: "UPDATE_SET"; payload: { exerciseIndex: number; setIndex: number; field: EditableField; value: string } }
  | { type: "MARK_CLEAN" };

function initialState(date = new Date(), revision = 0): FormState {
  return {
    date,
    selectedPlanId: "custom",
    workoutTitle: "",
    exercises: [],
    document: null,
    context: null,
    sourceContent: null,
    existingLogId: null,
    restoredDraftSource: null,
    draftIssue: null,
    loadError: null,
    isDirty: false,
    isLoadingLog: false,
    revision,
  };
}

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_DATE":
      return { ...initialState(action.payload, state.revision + 1), isLoadingLog: true };
    case "BEGIN_LOAD":
      return { ...initialState(state.date, state.revision + 1), isLoadingLog: true };
    case "LOAD_RECORD":
      return {
        ...state,
        workoutTitle: action.payload.title,
        exercises: action.payload.document.exercises,
        document: action.payload.document,
        context: action.payload.context,
        sourceContent: action.payload.sourceContent,
        existingLogId: action.payload.logId,
        isLoadingLog: false,
        revision: state.revision + 1,
      };
    case "LOAD_NEW":
      return {
        ...state,
        workoutTitle: action.payload.title,
        exercises: action.payload.document.exercises,
        document: action.payload.document,
        context: action.payload.context,
        selectedPlanId: action.payload.planId,
        existingLogId: null,
        sourceContent: null,
        isLoadingLog: false,
        revision: state.revision + 1,
      };
    case "RESTORE_DRAFT":
      return {
        ...state,
        workoutTitle: action.payload.draft.workoutTitle,
        selectedPlanId: action.payload.draft.selectedPlanId,
        exercises: action.payload.draft.exercises,
        document: action.payload.document,
        context: action.payload.draft.context,
        sourceContent: action.payload.sourceContent,
        existingLogId: action.payload.draft.context.logId,
        restoredDraftSource: action.payload.source,
        draftIssue: null,
        loadError: null,
        isDirty: true,
        isLoadingLog: false,
        revision: state.revision + 1,
      };
    case "LOAD_ERROR":
      return { ...initialState(state.date, state.revision + 1), loadError: action.payload, isLoadingLog: false };
    case "SET_DRAFT_ISSUE":
      return { ...state, draftIssue: action.payload };
    case "SET_TITLE":
      return { ...state, workoutTitle: action.payload, isDirty: true, revision: state.revision + 1 };
    case "SET_PLAN":
      return {
        ...state,
        selectedPlanId: action.payload.planId,
        workoutTitle: action.payload.title,
        exercises: action.payload.document.exercises,
        document: action.payload.document,
        context: state.context ? { ...state.context, original: action.payload.document.original } : null,
        isDirty: true,
        revision: state.revision + 1,
      };
    case "UPDATE_SET":
      return {
        ...state,
        isDirty: true,
        revision: state.revision + 1,
        exercises: state.exercises.map((exercise, exerciseIndex) => exerciseIndex !== action.payload.exerciseIndex ? exercise : {
          ...exercise,
          sets: exercise.sets.map((set, setIndex) => setIndex !== action.payload.setIndex ? set : {
            ...set,
            [action.payload.field]: action.payload.value,
          }),
        }),
      };
    case "MARK_CLEAN":
      return { ...state, isDirty: false };
  }
}

function planDocument(plan: any): WorkoutRecord {
  try {
    const entries = typeof plan.exercises === "string" ? JSON.parse(plan.exercises) : plan.exercises;
    if (!Array.isArray(entries)) return newLegacyWorkout([]);
    return newLegacyWorkout(entries.map((entry: any) => {
      const name = String(entry?.Exercise ?? entry?.exercise ?? entry?.name ?? "");
      const count = Math.max(1, Number.parseInt(String(entry?.Sets ?? entry?.sets ?? 3), 10) || 3);
      return { name, sets: Array.from({ length: count }, () => ({ reps: "", weight: "", rpe: "" })) };
    }));
  } catch {
    return newLegacyWorkout([]);
  }
}

function planTitle(plan: any): string {
  return `Day ${plan.day_number} - ${plan.focus || "Workout"}`;
}

export function WorkoutLogDialog({ open, onOpenChange, initialDate, initialLogId }: WorkoutLogDialogProps) {
  const { user, viewedUserId } = useAuth();
  const targetUserId = viewedUserId || user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(initialDate));
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const stateRef = useRef(state);
  const activeRef = useRef<ActiveWorkoutIdentity | null>(null);
  const savingRef = useRef(false);
  const plansRef = useRef<any[] | undefined>();
  const openContextRef = useRef("");
  stateRef.current = state;

  const dateKey = format(state.date, "yyyy-MM-dd");
  const initialDateKey = initialDate ? format(initialDate, "yyyy-MM-dd") : null;
  const requestedLogId = initialLogId && initialDateKey === dateKey ? initialLogId : null;
  activeRef.current = targetUserId ? { userId: targetUserId, dateKey, logId: requestedLogId } : null;
  const { saveDraft, loadDraft, loadLegacyDraft, clearDraft, clearLegacyDraft, flushDraft } =
    useWorkoutDraft(targetUserId, dateKey, requestedLogId);

  const { data: activePlanConfig } = useQuery({
    queryKey: ["activePlanConfig", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data, error } = await supabase.from("users").select("active_workout_plan").eq("id", targetUserId).single();
      if (error) throw error;
      if (!data?.active_workout_plan) return null;
      try { return JSON.parse(data.active_workout_plan); } catch { return null; }
    },
    enabled: Boolean(targetUserId),
  });

  const { data: workoutPlans } = useQuery({
    queryKey: ["workoutPlans", targetUserId, activePlanConfig],
    queryFn: async () => {
      if (!targetUserId || !activePlanConfig) return [];
      let query = supabase.from("workout_plans").select("*")
        .eq("user_id", targetUserId)
        .eq("level", activePlanConfig.level)
        .eq("workout_type", activePlanConfig.workoutType)
        .eq("days_per_week", activePlanConfig.daysPerWeek);
      query = activePlanConfig.subCategory ? query.eq("sub_category", activePlanConfig.subCategory) : query.is("sub_category", null);
      const { data, error } = await query.order("day_number", { ascending: true });
      if (error) throw error;
      const byDay = new Map<number, any>();
      for (const plan of data ?? []) {
        const prior = byDay.get(plan.day_number);
        if (!prior || plan.id > prior.id) byDay.set(plan.day_number, plan);
      }
      return Array.from(byDay.values()).sort((a, b) => a.day_number - b.day_number);
    },
    enabled: Boolean(targetUserId && activePlanConfig),
  });
  useEffect(() => { plansRef.current = workoutPlans; }, [workoutPlans]);

  useEffect(() => {
    if (!open) { openContextRef.current = ""; return; }
    const seedDate = initialDate ?? new Date();
    const seed = `${targetUserId ?? ""}:${format(seedDate, "yyyy-MM-dd")}:${initialLogId ?? "new"}`;
    if (openContextRef.current !== seed) {
      openContextRef.current = seed;
      dispatch({ type: "SET_DATE", payload: seedDate });
    }
  }, [open, initialDate, initialLogId, targetUserId]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    dispatch({ type: "BEGIN_LOAD" });

    const load = async () => {
      if (!targetUserId) {
        dispatch({ type: "LOAD_ERROR", payload: "Sign in before loading a workout." });
        return;
      }
      const contextBase = { userId: targetUserId, dateKey, logId: requestedLogId };
      try {
        let document: WorkoutRecord;
        let title = "";
        let sourceContent: unknown = null;
        if (requestedLogId) {
          const { data, error } = await supabase.from("workout_logs").select("*")
            .eq("id", requestedLogId).eq("user_id", targetUserId).eq("date", dateKey).maybeSingle();
          if (error) throw error;
          if (!data) throw new Error("The selected workout no longer exists for this account and date.");
          if (controller.signal.aborted) return;
          sourceContent = data.content;
          document = readWorkoutRecord(data.content);
          title = data.title ?? "Workout";
        } else {
          const plan = plansRef.current?.[0];
          document = plan ? planDocument(plan) : newLegacyWorkout([]);
          title = plan ? planTitle(plan) : "";
        }

        const currentContext: WorkoutRecordContext = { ...contextBase, original: requestedLogId ? sourceContent : document.original };
        const scoped = loadDraft();
        const resolution = requestedLogId
          ? resolveWorkoutDraft(scoped, currentContext, document)
          : resolveNewWorkoutDraft(scoped, contextBase);

        if (resolution.status === "restore") {
          const baseline: WorkoutRecord = !requestedLogId && "document" in resolution
            ? resolution.document as WorkoutRecord
            : document;
          dispatch({ type: "RESTORE_DRAFT", payload: { draft: resolution.draft, document: baseline, sourceContent, source: "scoped" } });
          toast({ title: "Draft restored", description: "Your unsaved workout changes were restored after verifying this record." });
          return;
        }

        let issue: DraftIssue | null = resolution.status === "blocked" ? { source: "scoped", reason: resolution.reason } : null;
        if (!issue) {
          const legacy = resolveLegacyWorkoutDraft(loadLegacyDraft(), { ...contextBase, original: requestedLogId ? sourceContent : null });
          if (legacy.status === "restore") {
            dispatch({ type: "RESTORE_DRAFT", payload: {
              draft: legacy.draft,
              document: newLegacyWorkout(legacy.draft.exercises),
              sourceContent: null,
              source: "legacy",
            } });
            toast({ title: "Older draft restored", description: "Your unfinished new workout was migrated safely." });
            return;
          }
          if (legacy.status === "blocked") issue = { source: "legacy", reason: legacy.reason };
        }

        if (controller.signal.aborted) return;
        if (requestedLogId) {
          dispatch({ type: "LOAD_RECORD", payload: { title, document, context: currentContext, sourceContent, logId: requestedLogId } });
        } else {
          dispatch({ type: "LOAD_NEW", payload: { title, document, context: currentContext, planId: plansRef.current?.[0]?.id ?? "custom" } });
        }
        if (issue) dispatch({ type: "SET_DRAFT_ISSUE", payload: issue });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "The workout could not be loaded.";
        dispatch({ type: "LOAD_ERROR", payload: message });
      }
    };
    void load();
    return () => controller.abort();
  }, [open, targetUserId, dateKey, requestedLogId, reloadToken, loadDraft, loadLegacyDraft, toast]);

  useEffect(() => {
    if (!open || requestedLogId || state.selectedPlanId !== "custom" || state.isDirty || state.isLoadingLog || state.loadError || state.exercises.length || !state.context) return;
    const plan = workoutPlans?.[0];
    if (!plan) return;
    const document = planDocument(plan);
    dispatch({ type: "LOAD_NEW", payload: { title: planTitle(plan), document, context: { ...state.context, original: document.original }, planId: plan.id } });
  }, [open, requestedLogId, workoutPlans, state.selectedPlanId, state.isDirty, state.isLoadingLog, state.loadError, state.exercises.length, state.context]);

  useEffect(() => {
    if (!open || !state.isDirty || state.draftIssue || !state.document || !state.context || !targetUserId) return;
    if (state.context.userId !== targetUserId || state.context.dateKey !== dateKey || state.context.logId !== requestedLogId) return;
    saveDraft({
      workoutTitle: state.workoutTitle,
      exercises: state.exercises,
      selectedPlanId: state.selectedPlanId,
      context: state.context,
      recordFormat: state.document.format,
    });
  }, [open, state.isDirty, state.draftIssue, state.document, state.context, state.workoutTitle, state.exercises, state.selectedPlanId, targetUserId, dateKey, requestedLogId, saveDraft]);

  useEffect(() => {
    if (!state.isDirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.isDirty]);

  const handleDateChange = useCallback((date: Date) => {
    if (savingRef.current) return;
    flushDraft();
    dispatch({ type: "SET_DATE", payload: date });
  }, [flushDraft]);

  const handlePlanChange = useCallback((planId: string) => {
    if (savingRef.current || stateRef.current.existingLogId || stateRef.current.draftIssue) return;
    const plan = plansRef.current?.find(item => item.id === planId);
    if (plan) dispatch({ type: "SET_PLAN", payload: { planId, title: planTitle(plan), document: planDocument(plan) } });
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: EditableField, value: string) => {
    if (savingRef.current || stateRef.current.draftIssue || !stateRef.current.document?.editable) return;
    dispatch({ type: "UPDATE_SET", payload: { exerciseIndex, setIndex, field, value } });
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && savingRef.current) return;
    if (!nextOpen && stateRef.current.isDirty) { setShowDiscardAlert(true); return; }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  const handleDiscardConfirm = useCallback(() => {
    clearDraft();
    if (stateRef.current.restoredDraftSource === "legacy") clearLegacyDraft();
    dispatch({ type: "MARK_CLEAN" });
    setShowDiscardAlert(false);
    onOpenChange(false);
  }, [clearDraft, clearLegacyDraft, onOpenChange]);

  const discardBlockedDraft = useCallback(() => {
    if (stateRef.current.draftIssue?.source === "legacy") clearLegacyDraft(); else clearDraft();
    dispatch({ type: "SET_DRAFT_ISSUE", payload: null });
    setReloadToken(token => token + 1);
  }, [clearDraft, clearLegacyDraft]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const current = stateRef.current;
      const active = activeRef.current;
      if (!active || !current.document || !current.context) throw new Error("The workout is not ready to save.");
      if (current.draftIssue) throw new Error("Resolve the saved draft before editing this workout.");
      const prepared = prepareWorkoutLogSave({
        active,
        context: current.context,
        sourceContent: current.sourceContent,
        document: current.document,
        exercises: current.exercises,
        workoutTitle: current.workoutTitle,
        revision: current.revision,
      });
      if (prepared.mode === "update") {
        const { data, error } = await supabase.from("workout_logs")
          .update(prepared.values)
          .eq("id", prepared.where.id)
          .eq("user_id", prepared.where.userId)
          .eq("date", prepared.where.dateKey)
          .eq("content", prepared.where.originalContent as string)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("This workout changed in another session. Reload it and review your draft before saving.");
      } else {
        const { error } = await supabase.from("workout_logs").insert(prepared.values);
        if (error) throw error;
      }
      return { prepared, restoredDraftSource: current.restoredDraftSource };
    },
    onSuccess: ({ prepared, restoredDraftSource }) => {
      void queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
      const active = activeRef.current;
      const current = stateRef.current;
      if (active && workoutSaveSnapshotMatches(prepared.snapshot, { active, context: current.context, revision: current.revision })) {
        clearDraft();
        if (restoredDraftSource === "legacy") clearLegacyDraft();
        dispatch({ type: "MARK_CLEAN" });
        toast({ title: "Workout saved", description: "The workout and its original format details were saved." });
        onOpenChange(false);
      } else {
        toast({ title: "Workout saved", description: "The previous workout was saved. Your current editor and draft were left untouched." });
      }
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error instanceof Error ? `${error.message} Your draft is preserved.` : "The workout could not be saved. Your draft is preserved.",
        variant: "destructive",
      });
    },
  });
  savingRef.current = saveMutation.isPending;

  const currentDocument = state.document ? { ...state.document, exercises: state.exercises } : null;
  const editingExisting = Boolean(state.existingLogId);
  const ownsActive = Boolean(targetUserId && state.context && state.context.userId === targetUserId &&
    state.context.dateKey === dateKey && state.context.logId === requestedLogId);
  const canEdit = Boolean(ownsActive && state.document?.editable && !state.draftIssue && !state.loadError && !state.isLoadingLog && !saveMutation.isPending);
  const canSave = canEdit && state.isDirty && state.workoutTitle.trim().length > 0 && state.exercises.length > 0 && !saveMutation.isPending;
  const maxSets = state.exercises.reduce((max, exercise) => Math.max(max, exercise.sets.length), 0);

  const statusPanel = <>
    {state.loadError ? <div role="alert" className="m-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <p className="font-medium">Workout unavailable</p><p className="mt-1 text-muted-foreground">{state.loadError}</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => setReloadToken(token => token + 1)}>Retry loading</Button>
    </div> : null}
    {state.draftIssue ? <div role="alert" className="m-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium">Saved draft needs attention</p><p className="mt-1 text-muted-foreground">{state.draftIssue.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setReloadToken(token => token + 1)}>Reload current workout</Button>
        <Button size="sm" variant="destructive" onClick={discardBlockedDraft}>Discard saved draft</Button>
      </div>
    </div> : null}
  </>;

  const existingEditor = currentDocument ? <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="existing-workout-title">Workout title</Label>
      <Input id="existing-workout-title" value={state.workoutTitle} disabled={!canEdit}
        onChange={event => dispatch({ type: "SET_TITLE", payload: event.target.value })} />
    </div>
    {currentDocument.planDayNumber !== undefined ? <Badge variant="secondary">Plan day {currentDocument.planDayNumber}</Badge> : null}
    <WorkoutRecordDetails document={currentDocument} onSetChange={canEdit ? updateSet : undefined} />
  </div> : null;

  if (isMobile) {
    const useLegacyCarousel = !editingExisting && !state.loadError && !state.draftIssue;
    return <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[95vh]">
          {useLegacyCarousel ? <MobileWorkoutCarousel
            state={state}
            dispatch={(action: FormAction) => {
              if (action.type === "UPDATE_SET") {
                updateSet(action.payload.exerciseIndex, action.payload.setIndex, action.payload.field, action.payload.value);
              } else if (!savingRef.current) {
                dispatch(action);
              }
            }}
            workoutPlans={workoutPlans}
            onSave={() => saveMutation.mutate()}
            canSave={canSave}
            isSaving={saveMutation.isPending}
            onPlanChange={handlePlanChange}
            targetUserId={targetUserId}
          /> : <div className="flex h-full flex-col">
            <DrawerHeader>
              <DrawerTitle>{state.workoutTitle || "Workout"}</DrawerTitle>
              <DrawerDescription>{editingExisting ? "Review and safely edit this recorded session." : "Resolve the saved draft before continuing."}</DrawerDescription>
            </DrawerHeader>
            {statusPanel}
            {state.isLoadingLog ? <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div> : null}
            {!state.isLoadingLog && editingExisting ? <div className="flex-1 overflow-y-auto px-4 pb-4">{existingEditor}</div> : null}
            <div className="flex gap-2 border-t p-4">
              <Button className="flex-1" variant="outline" disabled={saveMutation.isPending} onClick={() => handleOpenChange(false)}>Cancel</Button>
              {editingExisting ? <Button className="flex-1" disabled={!canSave} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Saving…" : "Save"}</Button> : null}
            </div>
          </div>}
        </DrawerContent>
      </Drawer>
      <DiscardDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert} onDiscard={handleDiscardConfirm} />
    </>;
  }

  return <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[90vh] w-full max-w-[95vw] flex-col gap-0 p-0 md:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Dumbbell className="h-5 w-5 text-primary" />Log Workout
            {state.isDirty ? <Badge variant="outline" className="ml-2 border-orange-500 text-xs text-orange-500">Unsaved</Badge> : null}
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {state.isLoadingLog ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : null}
          <div className="grid grid-cols-1 gap-4 p-4 pb-2 md:grid-cols-2 md:p-6">
            <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" disabled={saveMutation.isPending} className={cn("w-full justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />{format(state.date, "PPP")}
            </Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={state.date} onSelect={date => date && handleDateChange(date)} initialFocus /></PopoverContent></Popover></div>
            {!editingExisting ? <div className="space-y-2"><Label>Select Day</Label><Select value={state.selectedPlanId} onValueChange={handlePlanChange} disabled={Boolean(state.draftIssue || saveMutation.isPending || !ownsActive)}>
              <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger><SelectContent>{workoutPlans?.map(plan => <SelectItem key={plan.id} value={plan.id}>Day {plan.day_number} - {plan.focus || "Workout"}</SelectItem>)}</SelectContent>
            </Select></div> : <div className="space-y-2"><Label>Record</Label><p className="flex min-h-10 items-center text-sm text-muted-foreground">Editing the selected session</p></div>}
          </div>
          {statusPanel}
          <div className="flex-1 overflow-auto px-4 py-2 md:px-6">
            {editingExisting ? existingEditor : <div className="min-w-[800px] overflow-hidden rounded-lg border"><table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50"><tr><th className="w-[250px] border-b p-3 text-left font-semibold">Exercise</th>{Array.from({ length: maxSets }).map((_, index) => <th key={index} className="min-w-[180px] border-b border-l p-2 text-center"><div className="mb-1 font-semibold text-primary">SET {index + 1}</div><div className="grid grid-cols-3 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><span>Kg</span><span>Reps</span><span>RPE</span></div></th>)}</tr></thead>
              <tbody>{state.exercises.map((exercise, exerciseIndex) => <tr key={exercise.id}><td className="border-b p-3 align-top"><div className="py-2 text-base font-bold">{exercise.name}</div></td>{Array.from({ length: maxSets }).map((_, setIndex) => {
                const set: WorkoutRecordSet | undefined = exercise.sets[setIndex];
                return <td key={setIndex} className="border-b border-l p-2 align-top">{set ? <div className="grid grid-cols-3 gap-1">{(["weight", "reps", "rpe"] as const).map(field => <Input key={field} type="number" inputMode={field === "reps" ? "numeric" : "decimal"} value={set[field]} disabled={!canEdit} onChange={event => updateSet(exerciseIndex, setIndex, field, event.target.value)} className="h-9 px-1 text-center" />)}</div> : <div className="h-9 rounded-md border border-dashed bg-muted/10" />}</td>;
              })}</tr>)}</tbody>
            </table></div>}
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-4"><Button variant="outline" disabled={saveMutation.isPending} onClick={() => handleOpenChange(false)}>Cancel</Button><Button disabled={!canSave} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Saving…" : "Save Workout Log"}</Button></DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
    <DiscardDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert} onDiscard={handleDiscardConfirm} />
  </>;
}

function DiscardDialog({ open, onOpenChange, onDiscard }: { open: boolean; onOpenChange: (open: boolean) => void; onDiscard: () => void }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle><AlertDialogDescription>Your current workout changes and their saved draft will be removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={onDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
