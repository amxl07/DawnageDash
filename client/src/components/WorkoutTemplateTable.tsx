import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Save, Plus, Trash2, Loader2, GripVertical, Upload, PlusCircle, UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useWorkoutTemplateDetail, useSaveWorkoutTemplate, usePushWorkoutToGlobal,
  useAssignWorkoutToClients,
  type WorkoutHierarchyKey, type DayPlan, type Exercise,
} from "@/hooks/useTemplates";
import { formatTypeLabel } from "@/lib/workout-constants";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PushToGlobalDialog } from "@/components/PushToGlobalDialog";
import { AssignTemplateToClientsDialog } from "@/components/AssignTemplateToClientsDialog";

interface WorkoutTemplateTableProps {
  templateKey: WorkoutHierarchyKey;
  canEdit: boolean;
  scope: 'global' | 'mine';
  coachId: string | null;
  canEditGlobal: boolean;
}

// Sortable exercise row
function SortableExerciseRow({
  exercise, index, canEdit, onUpdate, onDelete,
}: {
  exercise: Exercise;
  index: number;
  canEdit: boolean;
  onUpdate: (field: keyof Exercise, value: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      {canEdit && (
        <TableCell className="w-8 px-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
            <GripVertical className="w-4 h-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="w-8 text-center text-xs text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        {canEdit ? (
          <Input
            value={exercise.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            className="h-8 text-sm"
            placeholder="Exercise name"
          />
        ) : (
          <span className="text-sm">{exercise.name}</span>
        )}
      </TableCell>
      <TableCell className="w-20">
        {canEdit ? (
          <Input
            value={exercise.sets}
            onChange={(e) => onUpdate('sets', e.target.value)}
            className="h-8 text-sm text-center"
            placeholder="3"
          />
        ) : (
          <span className="text-sm">{exercise.sets}</span>
        )}
      </TableCell>
      <TableCell className="w-24">
        {canEdit ? (
          <Input
            value={exercise.reps}
            onChange={(e) => onUpdate('reps', e.target.value)}
            className="h-8 text-sm text-center"
            placeholder="10-12"
          />
        ) : (
          <span className="text-sm">{exercise.reps}</span>
        )}
      </TableCell>
      <TableCell className="w-40 hidden md:table-cell">
        {canEdit ? (
          <Input
            value={exercise.videoLink || ''}
            onChange={(e) => onUpdate('videoLink', e.target.value)}
            className="h-8 text-sm"
            placeholder="Video URL"
          />
        ) : (
          exercise.videoLink ? (
            <a href={exercise.videoLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
              Video
            </a>
          ) : null
        )}
      </TableCell>
      <TableCell className="w-36 hidden lg:table-cell">
        {canEdit ? (
          <Input
            value={exercise.notes || ''}
            onChange={(e) => onUpdate('notes', e.target.value)}
            className="h-8 text-sm"
            placeholder="Notes"
          />
        ) : (
          <span className="text-xs text-muted-foreground">{exercise.notes}</span>
        )}
      </TableCell>
      {canEdit && (
        <TableCell className="w-10">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

export function WorkoutTemplateTable({ templateKey, canEdit, scope, coachId, canEditGlobal }: WorkoutTemplateTableProps) {
  const { toast } = useToast();
  const { data: templateData, isLoading } = useWorkoutTemplateDetail(templateKey);
  const saveTemplate = useSaveWorkoutTemplate();
  const pushToGlobal = usePushWorkoutToGlobal();
  const assignToClients = useAssignWorkoutToClients();

  const [days, setDays] = useState<DayPlan[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load template data
  useEffect(() => {
    if (templateData && templateData.length > 0) {
      setDays(templateData.map(d => ({
        ...d,
        exercises: d.exercises.map((ex, idx) => ({
          ...ex,
          id: ex.id || `ex-${d.dayNumber}-${idx}-${Date.now()}`,
        })),
      })));
      setActiveDay(templateData[0].dayNumber);
      setHasChanges(false);
    } else if (templateData && templateData.length === 0) {
      // New template - create empty days
      const emptyDays: DayPlan[] = Array.from({ length: templateKey.daysPerWeek }, (_, i) => ({
        id: `new-${i + 1}`,
        dayNumber: i + 1,
        focus: '',
        exercises: [],
      }));
      setDays(emptyDays);
      setActiveDay(1);
      setHasChanges(true); // Mark as needing save since it's new
    }
  }, [templateData, templateKey.daysPerWeek]);

  const currentDay = days.find(d => d.dayNumber === activeDay);

  const updateDayFocus = (focus: string) => {
    setDays(prev => prev.map(d => d.dayNumber === activeDay ? { ...d, focus } : d));
    setHasChanges(true);
  };

  const updateExercise = (exerciseId: string, field: keyof Exercise, value: string) => {
    setDays(prev => prev.map(d => {
      if (d.dayNumber !== activeDay) return d;
      return {
        ...d,
        exercises: d.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, [field]: value } : ex
        ),
      };
    }));
    setHasChanges(true);
  };

  const addExercise = () => {
    const newEx: Exercise = {
      id: `new-ex-${Date.now()}`,
      name: '',
      sets: '3',
      reps: '10',
    };
    setDays(prev => prev.map(d => {
      if (d.dayNumber !== activeDay) return d;
      return { ...d, exercises: [...d.exercises, newEx] };
    }));
    setHasChanges(true);
  };

  const removeExercise = (exerciseId: string) => {
    setDays(prev => prev.map(d => {
      if (d.dayNumber !== activeDay) return d;
      return { ...d, exercises: d.exercises.filter(ex => ex.id !== exerciseId) };
    }));
    setHasChanges(true);
  };

  const addDay = () => {
    const nextDayNum = days.length > 0 ? Math.max(...days.map(d => d.dayNumber)) + 1 : 1;
    setDays(prev => [...prev, { id: `new-${nextDayNum}`, dayNumber: nextDayNum, focus: '', exercises: [] }]);
    setActiveDay(nextDayNum);
    setHasChanges(true);
  };

  const removeDay = (dayNum: number) => {
    if (days.length <= 1) return;
    setDays(prev => {
      const filtered = prev.filter(d => d.dayNumber !== dayNum);
      // Renumber
      return filtered.map((d, i) => ({ ...d, dayNumber: i + 1, id: d.id }));
    });
    setActiveDay(1);
    setHasChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDays(prev => prev.map(d => {
      if (d.dayNumber !== activeDay) return d;
      const oldIndex = d.exercises.findIndex(ex => ex.id === active.id);
      const newIndex = d.exercises.findIndex(ex => ex.id === over.id);
      return { ...d, exercises: arrayMove(d.exercises, oldIndex, newIndex) };
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveTemplate.mutateAsync({ key: templateKey, days });
      setHasChanges(false);
      toast({ title: "Saved", description: "Workout template saved successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePushToGlobal = async () => {
    try {
      await pushToGlobal.mutateAsync(templateKey);
      toast({ title: "Pushed to Global", description: "Template has been copied to global templates." });
      setShowPushDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAssignToClients = async (clientIds: string[]) => {
    try {
      await assignToClients.mutateAsync({ key: templateKey, days, clientIds });
      toast({ title: "Assigned", description: `Template assigned to ${clientIds.length} client${clientIds.length !== 1 ? 's' : ''}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-[calc(100vh-320px)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const typeLabel = formatTypeLabel(templateKey.workoutType);
  const subLabel = templateKey.subCategory ? formatTypeLabel(templateKey.subCategory) : '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">
              {templateKey.level} - {typeLabel}
              {subLabel && <span className="text-muted-foreground font-normal"> / {subLabel}</span>}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {days.length}-day plan
              {scope === 'global' && <Badge variant="outline" className="ml-2 text-[10px]">Global</Badge>}
              {scope === 'mine' && <Badge variant="secondary" className="ml-2 text-[10px]">Personal</Badge>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Assign
            </Button>
            {scope === 'mine' && canEditGlobal && (
              <Button variant="outline" size="sm" onClick={() => setShowPushDialog(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Push to Global
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={handleSave} disabled={!hasChanges || saveTemplate.isPending}>
                {saveTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Day Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Tabs value={String(activeDay)} onValueChange={(v) => setActiveDay(Number(v))}>
            <TabsList className="h-9">
              {days.map(d => (
                <TabsTrigger key={d.dayNumber} value={String(d.dayNumber)} className="text-xs px-3 gap-1.5">
                  Day {d.dayNumber}{d.focus ? `: ${d.focus}` : ''}
                  {canEdit && days.length > 1 && (
                    <button
                      className="ml-1 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeDay(d.dayNumber); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={addDay} className="h-9 shrink-0">
              <PlusCircle className="w-4 h-4 mr-1" /> Day
            </Button>
          )}
        </div>

        {/* Focus */}
        {currentDay && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Focus:</span>
            {canEdit ? (
              <Input
                value={currentDay.focus}
                onChange={(e) => updateDayFocus(e.target.value)}
                placeholder="e.g., Push, Pull, Legs, Upper Body..."
                className="h-8 text-sm max-w-sm"
              />
            ) : (
              <span className="text-sm font-medium">{currentDay.focus || 'Not set'}</span>
            )}
          </div>
        )}

        {/* Exercise Table */}
        {currentDay && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {canEdit && <TableHead className="w-8 px-2" />}
                    <TableHead className="w-8 text-center">#</TableHead>
                    <TableHead>Exercise</TableHead>
                    <TableHead className="w-20 text-center">Sets</TableHead>
                    <TableHead className="w-24 text-center">Reps</TableHead>
                    <TableHead className="w-40 hidden md:table-cell">Video</TableHead>
                    <TableHead className="w-36 hidden lg:table-cell">Notes</TableHead>
                    {canEdit && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={currentDay.exercises.map(ex => ex.id)} strategy={verticalListSortingStrategy}>
                    {currentDay.exercises.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 8 : 6} className="text-center py-8 text-sm text-muted-foreground">
                          No exercises yet. Click "Add Exercise" to start building.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentDay.exercises.map((ex, idx) => (
                        <SortableExerciseRow
                          key={ex.id}
                          exercise={ex}
                          index={idx}
                          canEdit={canEdit}
                          onUpdate={(field, value) => updateExercise(ex.id, field, value)}
                          onDelete={() => removeExercise(ex.id)}
                        />
                      ))
                    )}
                  </SortableContext>
                </TableBody>
              </Table>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addExercise} className="mt-2">
                <Plus className="w-4 h-4 mr-1.5" /> Add Exercise
              </Button>
            )}
          </DndContext>
        )}
      </CardContent>

      {/* Push to Global Dialog */}
      <PushToGlobalDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        onConfirm={handlePushToGlobal}
        isPending={pushToGlobal.isPending}
        templateLabel={`${templateKey.level} - ${typeLabel}${subLabel ? ' / ' + subLabel : ''} (${days.length}-day)`}
      />

      {/* Assign to Clients Dialog */}
      <AssignTemplateToClientsDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onConfirm={handleAssignToClients}
        templateType="workout"
        templateLabel={`${templateKey.templateName || typeLabel} (${days.length}-day)`}
      />
    </Card>
  );
}
