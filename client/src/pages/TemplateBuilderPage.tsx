import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Dumbbell, UtensilsCrossed, Globe, User, Trash2, ChevronRight, Search,
} from "lucide-react";
import {
  type Level,
  WORKOUT_HIERARCHY, BEGINNER_GYM_DAYS,
  WORKOUT_TYPE_LABELS, SUB_CATEGORY_LABELS,
  CALORIE_OPTIONS, DIET_OPTIONS,
  formatTypeLabel,
} from "@/lib/workout-constants";
import type { DietType } from "@/lib/workout-constants";
import {
  useWorkoutTemplateList, useMealTemplateList,
  useDeleteWorkoutTemplate, useDeleteMealTemplate,
  useTemplatePermissions, useDistinctWorkoutTypes, useDistinctSubCategories,
  type WorkoutHierarchyKey, type WorkoutTemplateGroup, type MealTemplateItem,
} from "@/hooks/useTemplates";
import { WorkoutTemplateTable } from "@/components/WorkoutTemplateTable";
import { MealTemplateTable } from "@/components/MealTemplateTable";

type Scope = 'global' | 'mine';

// ============================================================================
// Tree grouping types
// ============================================================================

interface TemplateTreeNode {
  typeKey: string;
  typeLabel: string;
  subCategory: string | null;
  subCategoryLabel: string | null;
  templates: WorkoutTemplateGroup[];
}

// ============================================================================
// Main Page
// ============================================================================

export default function TemplateBuilderPage() {
  const { user, viewedCoachId } = useAuth();
  const { toast } = useToast();
  const role = user?.user_metadata?.role;
  const permissions = useTemplatePermissions();

  const effectiveCoachId = viewedCoachId || user?.id || null;

  // State
  const [activeTab, setActiveTab] = useState<'workout' | 'meal'>('workout');
  const [scope, setScope] = useState<Scope>(role === 'admin' ? 'global' : 'mine');
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHierarchyKey | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealTemplateItem | null>(null);
  const [showNewWorkoutDialog, setShowNewWorkoutDialog] = useState(false);
  const [showNewMealDialog, setShowNewMealDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: workoutTemplates = [], isLoading: loadingWorkouts } = useWorkoutTemplateList(scope, scope === 'mine' ? effectiveCoachId! : undefined);
  const { data: mealTemplates = [], isLoading: loadingMeals } = useMealTemplateList(scope, scope === 'mine' ? effectiveCoachId! : undefined);

  const deleteWorkout = useDeleteWorkoutTemplate();
  const deleteMeal = useDeleteMealTemplate();

  const canEdit = scope === 'global' ? permissions.canEditGlobal : true;

  // Build grouped tree for workout templates
  const workoutTree = useMemo(() => {
    const tree: Record<string, TemplateTreeNode[]> = {};
    const query = searchQuery.toLowerCase();

    for (const t of workoutTemplates) {
      const typeLabel = formatTypeLabel(t.workoutType);
      const subLabel = t.subCategory ? formatTypeLabel(t.subCategory) : null;
      const name = t.templateName || `${typeLabel}${subLabel ? ' - ' + subLabel : ''} (${t.daysPerWeek}-day)`;

      // Search filter
      if (query && !name.toLowerCase().includes(query) && !typeLabel.toLowerCase().includes(query) && !(subLabel?.toLowerCase().includes(query))) {
        continue;
      }

      if (!tree[t.level]) tree[t.level] = [];
      const nodeKey = `${t.workoutType}|${t.subCategory || ''}`;
      let node = tree[t.level].find(n => `${n.typeKey}|${n.subCategory || ''}` === nodeKey);
      if (!node) {
        node = {
          typeKey: t.workoutType,
          typeLabel,
          subCategory: t.subCategory,
          subCategoryLabel: subLabel,
          templates: [],
        };
        tree[t.level].push(node);
      }
      node.templates.push(t);
    }

    // Sort nodes and templates within each level
    for (const level of Object.keys(tree)) {
      tree[level].sort((a, b) => a.typeLabel.localeCompare(b.typeLabel) || (a.subCategoryLabel || '').localeCompare(b.subCategoryLabel || ''));
      for (const node of tree[level]) {
        node.templates.sort((a, b) => (a.templateName || '').localeCompare(b.templateName || '') || a.daysPerWeek - b.daysPerWeek);
      }
    }

    return tree;
  }, [workoutTemplates, searchQuery]);

  // Filter meal templates by search
  const filteredMeals = useMemo(() => {
    if (!searchQuery) return mealTemplates;
    const query = searchQuery.toLowerCase();
    return mealTemplates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.dietType.toLowerCase().includes(query) ||
      String(t.caloriesTarget).includes(query)
    );
  }, [mealTemplates, searchQuery]);

  const isWorkoutSelected = (t: WorkoutTemplateGroup) =>
    selectedWorkout &&
    selectedWorkout.level === t.level &&
    selectedWorkout.workoutType === t.workoutType &&
    selectedWorkout.subCategory === (t.subCategory || null) &&
    selectedWorkout.daysPerWeek === t.daysPerWeek &&
    selectedWorkout.templateName === (t.templateName || '');

  const handleDeleteWorkout = async (key: WorkoutHierarchyKey) => {
    if (!confirm('Delete this entire workout template? This cannot be undone.')) return;
    try {
      await deleteWorkout.mutateAsync(key);
      if (selectedWorkout && isWorkoutSelected({
        ...key, templateName: key.templateName, dayCount: 0,
      } as WorkoutTemplateGroup)) {
        setSelectedWorkout(null);
      }
      toast({ title: "Deleted", description: "Workout template deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm('Delete this meal template? This cannot be undone.')) return;
    try {
      await deleteMeal.mutateAsync(id);
      if (selectedMeal?.id === id) setSelectedMeal(null);
      toast({ title: "Deleted", description: "Meal template deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const makeWorkoutKey = (t: WorkoutTemplateGroup): WorkoutHierarchyKey => ({
    level: t.level as Level,
    workoutType: t.workoutType,
    subCategory: t.subCategory || null,
    daysPerWeek: t.daysPerWeek,
    coachId: t.coachId,
    templateName: t.templateName || '',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Builder</h1>
          <p className="text-muted-foreground text-sm">
            {scope === 'global' ? 'Manage global templates used by all coaches' : 'Build and manage your personal templates'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={scope} onValueChange={(v) => { setScope(v as Scope); setSelectedWorkout(null); setSelectedMeal(null); setSearchQuery(''); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Global Templates</span>
              </SelectItem>
              <SelectItem value="mine">
                <span className="flex items-center gap-2"><User className="w-4 h-4" /> My Templates</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {canEdit && (
            <Button
              onClick={() => activeTab === 'workout' ? setShowNewWorkoutDialog(true) : setShowNewMealDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Primary Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'workout' | 'meal'); setSelectedWorkout(null); setSelectedMeal(null); setSearchQuery(''); }}>
        <TabsList>
          <TabsTrigger value="workout" className="gap-2">
            <Dumbbell className="w-4 h-4" /> Workout
          </TabsTrigger>
          <TabsTrigger value="meal" className="gap-2">
            <UtensilsCrossed className="w-4 h-4" /> Meal Plan
          </TabsTrigger>
        </TabsList>

        {/* Workout Tab */}
        <TabsContent value="workout" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Template List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {scope === 'global' ? 'Global' : 'My'} Workout Templates
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  {loadingWorkouts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : Object.keys(workoutTree).length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {searchQuery ? 'No templates match your search.' : 'No templates found. Create one to get started.'}
                    </div>
                  ) : (
                    <div>
                      {(['Beginner', 'Intermediate', 'Advanced'] as Level[]).map(level => {
                        const nodes = workoutTree[level];
                        if (!nodes || nodes.length === 0) return null;

                        return (
                          <div key={level}>
                            {/* Level header */}
                            <div className="px-4 py-2 bg-muted/50 sticky top-0 z-10">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{level}</span>
                            </div>

                            {nodes.map((node) => (
                              <div key={`${node.typeKey}-${node.subCategory || ''}`}>
                                {/* Type + SubCategory group label */}
                                <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground border-b border-dashed">
                                  {node.typeLabel}{node.subCategoryLabel ? ` - ${node.subCategoryLabel}` : ''}
                                </div>

                                {/* Named template entries */}
                                {node.templates.map((t) => {
                                  const key = makeWorkoutKey(t);
                                  const selected = isWorkoutSelected(t);
                                  const displayName = t.templateName || `${node.typeLabel} (${t.daysPerWeek}-day)`;

                                  return (
                                    <div
                                      key={`${t.workoutType}-${t.subCategory}-${t.daysPerWeek}-${t.templateName}`}
                                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors ${selected ? 'bg-accent' : ''}`}
                                      onClick={() => setSelectedWorkout(key)}
                                    >
                                      <div className="flex-1 min-w-0 pl-2">
                                        <p className="text-sm font-medium truncate">{displayName}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.daysPerWeek}-day</Badge>
                                          {scope === 'global' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600">G</Badge>}
                                          {scope === 'mine' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">P</Badge>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {canEdit && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(key); }}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Workout Editor */}
            <div>
              {selectedWorkout ? (
                <WorkoutTemplateTable
                  templateKey={selectedWorkout}
                  canEdit={canEdit}
                  scope={scope}
                  coachId={effectiveCoachId}
                  canEditGlobal={permissions.canEditGlobal}
                  onCloned={(newKey) => { setScope('mine'); setSelectedWorkout(newKey); }}
                />
              ) : (
                <Card className="flex items-center justify-center h-[calc(100vh-320px)]">
                  <div className="text-center text-muted-foreground">
                    <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a template from the list to edit</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Meal Tab */}
        <TabsContent value="meal" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Meal Template List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {scope === 'global' ? 'Global' : 'My'} Meal Templates
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  {loadingMeals ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredMeals.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {searchQuery ? 'No templates match your search.' : 'No templates found. Create one to get started.'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMeals.map((t) => {
                        const isSelected = selectedMeal?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors ${isSelected ? 'bg-accent' : ''}`}
                            onClick={() => setSelectedMeal(t)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {t.caloriesTarget} Cal - {t.dietType}
                              </p>
                              <p className="text-xs text-muted-foreground">{t.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMeal(t.id); }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Meal Editor */}
            <div>
              {selectedMeal ? (
                <MealTemplateTable
                  template={selectedMeal}
                  canEdit={canEdit}
                  scope={scope}
                  coachId={effectiveCoachId}
                  canEditGlobal={permissions.canEditGlobal}
                  onSaved={(updated) => setSelectedMeal(updated)}
                  onCloned={(newItem) => { setScope('mine'); setSelectedMeal(newItem); }}
                />
              ) : (
                <Card className="flex items-center justify-center h-[calc(100vh-320px)]">
                  <div className="text-center text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a template from the list to edit</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Workout Template Dialog */}
      <NewWorkoutTemplateDialog
        open={showNewWorkoutDialog}
        onOpenChange={setShowNewWorkoutDialog}
        scope={scope}
        coachId={effectiveCoachId}
        onCreated={(key) => { setSelectedWorkout(key); setShowNewWorkoutDialog(false); }}
      />

      {/* New Meal Template Dialog */}
      <NewMealTemplateDialog
        open={showNewMealDialog}
        onOpenChange={setShowNewMealDialog}
        scope={scope}
        coachId={effectiveCoachId}
        onCreated={(item) => { setSelectedMeal(item); setShowNewMealDialog(false); }}
      />
    </div>
  );
}

// ============================================================================
// New Workout Template Dialog - Dynamic Categories + Free Days
// ============================================================================

function NewWorkoutTemplateDialog({
  open, onOpenChange, scope, coachId, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  coachId: string | null;
  onCreated: (key: WorkoutHierarchyKey) => void;
}) {
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [level, setLevel] = useState<Level>('Beginner');
  const [workoutType, setWorkoutType] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<number | ''>('');

  // "Add New" mode toggles
  const [addingNewType, setAddingNewType] = useState(false);
  const [newTypeValue, setNewTypeValue] = useState('');
  const [addingNewSub, setAddingNewSub] = useState(false);
  const [newSubValue, setNewSubValue] = useState('');

  // Fetch distinct values from DB
  const { data: dbTypes = [] } = useDistinctWorkoutTypes(level, scope, scope === 'mine' ? coachId || undefined : undefined);
  const effectiveType = addingNewType ? '' : workoutType;
  const { data: dbSubs = [] } = useDistinctSubCategories(level, effectiveType, scope, scope === 'mine' ? coachId || undefined : undefined);

  // Merge DB values with seed hierarchy
  const allTypes = useMemo(() => {
    const seedTypes = Object.keys(WORKOUT_HIERARCHY[level] || {});
    const merged = new Set([...seedTypes, ...dbTypes]);
    return Array.from(merged).sort();
  }, [level, dbTypes]);

  const allSubCategories = useMemo(() => {
    const seedConfig = workoutType ? (WORKOUT_HIERARCHY[level] as any)?.[workoutType] : null;
    const seedSubs: string[] = (seedConfig?.subCategories || []).filter(Boolean);
    const merged = new Set([...seedSubs, ...dbSubs]);
    return Array.from(merged).sort();
  }, [level, workoutType, dbSubs]);

  const hasSubCategories = allSubCategories.length > 0 || addingNewSub;

  const isValid = templateName.trim() && (addingNewType ? newTypeValue.trim() : workoutType) && daysPerWeek && Number(daysPerWeek) >= 1;

  const handleCreate = () => {
    if (!isValid) return;
    const finalType = addingNewType ? newTypeValue.trim().toUpperCase().replace(/\s+/g, '_') : workoutType;
    const finalSub = addingNewSub ? newSubValue.trim().toUpperCase().replace(/\s+/g, '_') : (subCategory || null);

    const key: WorkoutHierarchyKey = {
      level,
      workoutType: finalType,
      subCategory: finalSub || null,
      daysPerWeek: Number(daysPerWeek),
      coachId: scope === 'global' ? null : coachId,
      templateName: templateName.trim(),
    };
    onCreated(key);
    // Reset
    setTemplateName('');
    setWorkoutType('');
    setSubCategory('');
    setDaysPerWeek('');
    setAddingNewType(false);
    setNewTypeValue('');
    setAddingNewSub(false);
    setNewSubValue('');
  };

  const resetOnLevelChange = (newLevel: Level) => {
    setLevel(newLevel);
    setWorkoutType('');
    setSubCategory('');
    setDaysPerWeek('');
    setAddingNewType(false);
    setNewTypeValue('');
    setAddingNewSub(false);
    setNewSubValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Workout Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Template Name (required) */}
          <div className="space-y-2">
            <Label>Template Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g., My Push/Pull/Legs Split"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          {/* Level (fixed) */}
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={level} onValueChange={(v) => resetOnLevelChange(v as Level)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['Beginner', 'Intermediate', 'Advanced'] as Level[]).map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workout Type (dynamic with + Add New) */}
          <div className="space-y-2">
            <Label>Workout Type <span className="text-destructive">*</span></Label>
            {addingNewType ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="e.g., Yoga, CrossFit..."
                  value={newTypeValue}
                  onChange={(e) => setNewTypeValue(e.target.value)}
                  autoFocus
                />
                <Button variant="ghost" size="sm" onClick={() => { setAddingNewType(false); setNewTypeValue(''); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Select value={workoutType} onValueChange={(v) => {
                if (v === '__add_new__') {
                  setAddingNewType(true);
                  setWorkoutType('');
                  setSubCategory('');
                } else {
                  setWorkoutType(v);
                  setSubCategory('');
                  setDaysPerWeek('');
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {allTypes.map(wt => (
                    <SelectItem key={wt} value={wt}>{WORKOUT_TYPE_LABELS[wt] || formatTypeLabel(wt)}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-primary font-medium border-t mt-1 pt-1">
                    + Add New Type...
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Sub-Category (dynamic, optional) - only show when type is selected */}
          {(workoutType && !addingNewType) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sub-Category <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                {!addingNewSub && allSubCategories.length === 0 && (
                  <button className="text-xs text-primary hover:underline" onClick={() => setAddingNewSub(true)}>
                    + Add sub-category
                  </button>
                )}
              </div>
              {addingNewSub ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g., Phase 3, Resistance Bands..."
                    value={newSubValue}
                    onChange={(e) => setNewSubValue(e.target.value)}
                    autoFocus
                  />
                  <Button variant="ghost" size="sm" onClick={() => { setAddingNewSub(false); setNewSubValue(''); setSubCategory(''); }}>
                    Cancel
                  </Button>
                </div>
              ) : allSubCategories.length > 0 ? (
                <Select value={subCategory || ''} onValueChange={(v) => {
                  if (v === '__add_new__') {
                    setAddingNewSub(true);
                    setSubCategory('');
                  } else {
                    setSubCategory(v);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                  <SelectContent>
                    {allSubCategories.map(sc => (
                      <SelectItem key={sc} value={sc}>{SUB_CATEGORY_LABELS[sc] || formatTypeLabel(sc)}</SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="text-primary font-medium border-t mt-1 pt-1">
                      + Add New...
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          )}

          {/* Days Per Week (free number input) */}
          <div className="space-y-2">
            <Label>Days Per Week <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min={1}
              max={14}
              placeholder="e.g., 5"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value ? Number(e.target.value) : '')}
              className="w-32"
            />
          </div>

          <Badge variant="outline" className="text-xs">
            {scope === 'global' ? 'Global Template' : 'Personal Template'}
          </Badge>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// New Meal Template Dialog
// ============================================================================

function NewMealTemplateDialog({
  open, onOpenChange, scope, coachId, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  coachId: string | null;
  onCreated: (item: MealTemplateItem) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [caloriesTarget, setCaloriesTarget] = useState<number>(1200);
  const [dietType, setDietType] = useState<DietType>('Vegetarian');

  const handleCreate = async () => {
    const emptyContent = JSON.stringify({
      breakfast: { name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
      mid_morning_snack: { name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
      lunch: { name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
      evening_snack: { name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
      dinner: { name: '', calories: 0, protein: 0, carbs: 0, fats: 0 },
    });

    const templateCoachId = scope === 'global' ? null : coachId;

    try {
      const { data, error } = await (await import("@/lib/supabase")).supabase
        .from('meal_templates')
        .insert({
          name: name || `${caloriesTarget} Cal ${dietType}`,
          calories_target: caloriesTarget,
          diet_type: dietType,
          coach_id: templateCoachId,
          content: emptyContent,
        })
        .select()
        .single();

      if (error) throw error;

      onCreated({
        id: data.id,
        name: data.name,
        caloriesTarget: data.calories_target,
        dietType: data.diet_type,
        coachId: data.coach_id,
        content: data.content,
      });
      setName('');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Meal Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Template Name (optional)</Label>
            <Input
              placeholder="e.g., High Protein Veg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Calorie Target</Label>
            <Select value={String(caloriesTarget)} onValueChange={(v) => setCaloriesTarget(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CALORIE_OPTIONS.map(c => (
                  <SelectItem key={c} value={String(c)}>{c} Cal</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Diet Type</Label>
            <Select value={dietType} onValueChange={(v) => setDietType(v as DietType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIET_OPTIONS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs">
            {scope === 'global' ? 'Global Template' : 'Personal Template'}
          </Badge>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
