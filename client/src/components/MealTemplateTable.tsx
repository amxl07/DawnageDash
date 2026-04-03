import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Save, Loader2, Upload, UserPlus, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSaveMealTemplate, usePushMealToGlobal, useAssignMealToClients, useCloneMealToMine, type MealTemplateItem } from "@/hooks/useTemplates";
import { PushToGlobalDialog } from "@/components/PushToGlobalDialog";
import { AssignTemplateToClientsDialog } from "@/components/AssignTemplateToClientsDialog";

interface MealData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealPlanContent {
  breakfast: MealData;
  mid_morning_snack: MealData;
  lunch: MealData;
  evening_snack: MealData;
  dinner: MealData;
}

const MEAL_TYPES: { key: keyof MealPlanContent; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'mid_morning_snack', label: 'Mid-Morning Snack' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'evening_snack', label: 'Evening Snack' },
  { key: 'dinner', label: 'Dinner' },
];

const emptyMeal: MealData = { name: '', calories: 0, protein: 0, carbs: 0, fats: 0 };

function parseMealContent(content: string): MealPlanContent {
  try {
    const parsed = JSON.parse(content);

    // Handle the `snacks` array format (legacy)
    if (parsed.snacks && Array.isArray(parsed.snacks)) {
      return {
        breakfast: parsed.breakfast || { ...emptyMeal },
        mid_morning_snack: parsed.snacks[0] || parsed.mid_morning_snack || { ...emptyMeal },
        lunch: parsed.lunch || { ...emptyMeal },
        evening_snack: parsed.snacks[1] || parsed.evening_snack || { ...emptyMeal },
        dinner: parsed.dinner || { ...emptyMeal },
      };
    }

    return {
      breakfast: parsed.breakfast || { ...emptyMeal },
      mid_morning_snack: parsed.mid_morning_snack || { ...emptyMeal },
      lunch: parsed.lunch || { ...emptyMeal },
      evening_snack: parsed.evening_snack || { ...emptyMeal },
      dinner: parsed.dinner || { ...emptyMeal },
    };
  } catch {
    return {
      breakfast: { ...emptyMeal },
      mid_morning_snack: { ...emptyMeal },
      lunch: { ...emptyMeal },
      evening_snack: { ...emptyMeal },
      dinner: { ...emptyMeal },
    };
  }
}

interface MealTemplateTableProps {
  template: MealTemplateItem;
  canEdit: boolean;
  scope: 'global' | 'mine';
  coachId: string | null;
  canEditGlobal: boolean;
  onSaved?: (updated: MealTemplateItem) => void;
  onCloned?: (item: MealTemplateItem) => void;
}

export function MealTemplateTable({ template, canEdit, scope, coachId, canEditGlobal, onSaved, onCloned }: MealTemplateTableProps) {
  const { toast } = useToast();
  const saveMeal = useSaveMealTemplate();
  const pushToGlobal = usePushMealToGlobal();
  const assignToClients = useAssignMealToClients();
  const cloneToMine = useCloneMealToMine();

  const [meals, setMeals] = useState<MealPlanContent>(() => parseMealContent(template.content));
  const [templateName, setTemplateName] = useState(template.name);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneName, setCloneName] = useState('');

  // Reset when template changes
  useEffect(() => {
    setMeals(parseMealContent(template.content));
    setTemplateName(template.name);
    setHasChanges(false);
  }, [template.id, template.content]);

  const totals = useMemo(() => {
    return MEAL_TYPES.reduce(
      (acc, { key }) => {
        acc.calories += Number(meals[key].calories) || 0;
        acc.protein += Number(meals[key].protein) || 0;
        acc.carbs += Number(meals[key].carbs) || 0;
        acc.fats += Number(meals[key].fats) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [meals]);

  const updateMeal = (mealKey: keyof MealPlanContent, field: keyof MealData, value: string) => {
    setMeals(prev => ({
      ...prev,
      [mealKey]: {
        ...prev[mealKey],
        [field]: field === 'name' ? value : Number(value) || 0,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const content = JSON.stringify(meals);
    try {
      await saveMeal.mutateAsync({
        id: template.id,
        name: templateName,
        caloriesTarget: template.caloriesTarget,
        dietType: template.dietType,
        coachId: template.coachId,
        content,
      });
      setHasChanges(false);
      toast({ title: "Saved", description: "Meal template saved successfully." });
      onSaved?.({
        ...template,
        name: templateName,
        content,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePushToGlobal = async () => {
    try {
      await pushToGlobal.mutateAsync(template.id);
      toast({ title: "Pushed to Global", description: "Meal template copied to global templates." });
      setShowPushDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAssignToClients = async (clientIds: string[]) => {
    try {
      await assignToClients.mutateAsync({ template, clientIds });
      toast({ title: "Assigned", description: `Meal template assigned to ${clientIds.length} client${clientIds.length !== 1 ? 's' : ''}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCloneToMine = async () => {
    if (!cloneName.trim() || !coachId) return;
    try {
      const newItem = await cloneToMine.mutateAsync({
        sourceId: template.id,
        newName: cloneName.trim(),
        targetCoachId: coachId,
      });
      toast({ title: "Cloned", description: "Meal template cloned to your personal templates." });
      setShowCloneDialog(false);
      setCloneName('');
      onCloned?.(newItem);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                {template.caloriesTarget} Cal - {template.dietType}
              </CardTitle>
              {scope === 'global' && <Badge variant="outline" className="text-[10px]">Global</Badge>}
              {scope === 'mine' && <Badge variant="secondary" className="text-[10px]">Personal</Badge>}
            </div>
            {canEdit ? (
              <Input
                value={templateName}
                onChange={(e) => { setTemplateName(e.target.value); setHasChanges(true); }}
                className="h-7 text-xs mt-1 max-w-xs"
                placeholder="Template name"
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{templateName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(true)}>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Assign
            </Button>
            {scope === 'global' && coachId && (
              <Button variant="outline" size="sm" onClick={() => { setCloneName(`${template.name} (Copy)`); setShowCloneDialog(true); }}>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Clone to My Templates
              </Button>
            )}
            {scope === 'mine' && canEditGlobal && (
              <Button variant="outline" size="sm" onClick={() => setShowPushDialog(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Push to Global
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={handleSave} disabled={!hasChanges || saveMeal.isPending}>
                {saveMeal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-40">Meal</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20 text-center">Cal</TableHead>
                <TableHead className="w-20 text-center">Protein</TableHead>
                <TableHead className="w-20 text-center">Carbs</TableHead>
                <TableHead className="w-20 text-center">Fats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MEAL_TYPES.map(({ key, label }) => (
                <TableRow key={key}>
                  <TableCell className="font-medium text-sm">{label}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Textarea
                        value={meals[key].name}
                        onChange={(e) => updateMeal(key, 'name', e.target.value)}
                        className="min-h-[36px] text-sm resize-none"
                        placeholder="e.g., 2 Eggs, 2 Wheat Bread, 200ml Milk"
                        rows={1}
                      />
                    ) : (
                      <span className="text-sm whitespace-pre-wrap">{meals[key].name || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={meals[key].calories || ''}
                        onChange={(e) => updateMeal(key, 'calories', e.target.value)}
                        className="h-8 text-sm text-center w-16 mx-auto"
                      />
                    ) : (
                      <span className="text-sm">{meals[key].calories}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={meals[key].protein || ''}
                        onChange={(e) => updateMeal(key, 'protein', e.target.value)}
                        className="h-8 text-sm text-center w-16 mx-auto"
                        step="0.1"
                      />
                    ) : (
                      <span className="text-sm">{meals[key].protein}g</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={meals[key].carbs || ''}
                        onChange={(e) => updateMeal(key, 'carbs', e.target.value)}
                        className="h-8 text-sm text-center w-16 mx-auto"
                        step="0.1"
                      />
                    ) : (
                      <span className="text-sm">{meals[key].carbs}g</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {canEdit ? (
                      <Input
                        type="number"
                        value={meals[key].fats || ''}
                        onChange={(e) => updateMeal(key, 'fats', e.target.value)}
                        className="h-8 text-sm text-center w-16 mx-auto"
                        step="0.1"
                      />
                    ) : (
                      <span className="text-sm">{meals[key].fats}g</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell colSpan={2} className="text-right">Total</TableCell>
                <TableCell className="text-center">{Math.round(totals.calories)}</TableCell>
                <TableCell className="text-center">{totals.protein.toFixed(1)}g</TableCell>
                <TableCell className="text-center">{totals.carbs.toFixed(1)}g</TableCell>
                <TableCell className="text-center">{totals.fats.toFixed(1)}g</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>

      <PushToGlobalDialog
        open={showPushDialog}
        onOpenChange={setShowPushDialog}
        onConfirm={handlePushToGlobal}
        isPending={pushToGlobal.isPending}
        templateLabel={`${template.caloriesTarget} Cal - ${template.dietType}`}
      />

      <AssignTemplateToClientsDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onConfirm={handleAssignToClients}
        templateType="meal"
        templateLabel={`${template.caloriesTarget} Cal - ${template.dietType}`}
      />

      {/* Clone to My Templates Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Clone to My Templates
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a personal copy of this global template that you can customize.
          </p>
          <div className="space-y-2 py-2">
            <Label>Template Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g., My Custom Meal Plan"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>Cancel</Button>
            <Button onClick={handleCloneToMine} disabled={!cloneName.trim() || cloneToMine.isPending}>
              {cloneToMine.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
