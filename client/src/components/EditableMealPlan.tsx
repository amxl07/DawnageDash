import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Utensils, Coffee, Sun, Moon, Edit2, Save, X, Plus, Trash2, Loader2, Sparkles, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Snack {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DayMealPlan {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

interface EditableMealPlanProps {
  initialPlan: DayMealPlan;
  day?: string;
  caloriesTarget?: number;
  dietType?: string;
  onSave?: (plan: DayMealPlan) => void;
}

// Advanced Meal Composer Component
const MealComposer = ({
  initialText,
  onUpdate
}: {
  initialText: string,
  onUpdate: (data: { name: string, calories: number, protein: number, carbs: number, fats: number }) => void
}) => {
  const { toast } = useToast();
  const [text, setText] = useState(initialText);
  const [analyzedItems, setAnalyzedItems] = useState<any[]>([]);
  const [foodDb, setFoodDb] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  // Load Food DB on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('food_items').select('*');
      if (data) setFoodDb(data);
    })();
  }, []);

  // Real-time analysis + Suggestions
  useEffect(() => {
    // 1. Analyze existing text
    parseAndAnalyze(text);

    // 2. Suggestion Logic (check last segment)
    const segments = text.split(/,|\n/);
    const lastSegment = segments[segments.length - 1].trim();

    // Extract potential food name from last segment (e.g. "100g chic" -> "chic")
    const match = lastSegment.match(/^(\d+(?:\.\d+)?)\s*(?:g|gram|grams|ml|pcs|slice|scoop|cup)?\s+(.+)$/i)
      || lastSegment.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:g|gram|grams|ml|pcs|slice|scoop|cup)?$/i)
      || lastSegment.match(/^(.+?)\s*\(/i);

    let query = lastSegment;
    if (match) {
      if (isNaN(parseFloat(match[1]))) query = match[1];
      else query = match[2]; // Fixed: Name is in group 2 for the prefix regex
    }

    if (query && query.length >= 2 && foodDb.length > 0) {
      const matches = foodDb.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
      setSuggestions(matches);
      setActiveSegment(lastSegment);
    } else {
      setSuggestions([]);
      setActiveSegment(null);
    }
  }, [text, foodDb]);

  const parseAndAnalyze = (inputText: string) => {
    if (!foodDb.length) return;

    // Split by common delimiters
    const parts = inputText.split(/,|\n|\+| with /i).map(p => p.trim()).filter(p => p);
    const items: any[] = [];

    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;

    parts.forEach(part => {
      // 0. Parenthetical Format: "Name (Qty Unit)" -> e.g. "Rice (40g)" or "Bread (2 pcs)"
      // Relaxed unit matching to handle typos or unknown units (e.g. "ocs")
      const parenMatch = part.match(/^(.+?)\s*\(\s*(\d+(?:\.\d+)?)\s*([a-zA-Z.]+)?\s*\)$/i);

      // 1. Prefix Format: "100g Chicken"
      const prefixMatch = part.match(/^(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|pcs|slice|scoop|cup|bowl|tbsp|tsp|x|no\.)?\s+(.+)$/i);

      // 2. Suffix Format: "Chicken 100g"
      const suffixMatch = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|pcs|slice|scoop|cup|bowl|tbsp|tsp|x|no\.)?$/i);

      let qty = 100; // Default
      let query = part;
      let unit = "";

      if (parenMatch) {
        query = parenMatch[1].trim();
        qty = parseFloat(parenMatch[2]);
        unit = parenMatch[3] || "";
      } else if (prefixMatch) {
        // If first group is number
        qty = parseFloat(prefixMatch[1]);
        unit = prefixMatch[2] || "";
        query = prefixMatch[3].trim();
      } else if (suffixMatch) {
        // Second group is number (Name Qty)
        query = suffixMatch[1].trim();
        qty = parseFloat(suffixMatch[2]);
        unit = suffixMatch[3] || "";
      }

      // Pass unit to downstream logic if needed, although currently we just use it for ratio calc
      // We can reconstruct a standard string for 'originalText' display references or just use query.

      const qtyMatch = parenMatch || prefixMatch || suffixMatch; // For logic re-use if needed


      // Find best match in DB
      // Find best match in DB
      // Strategy 1: Exact Match
      let match = foodDb.find(f => f.name.toLowerCase() === query.toLowerCase());

      // Strategy 2: DB item name includes query (e.g. "Chicken Breast" includes "Chicken")
      if (!match) {
        match = foodDb.find(f => f.name.toLowerCase().includes(query.toLowerCase()));
      }

      // Strategy 3: Query includes DB item name (e.g. "Grilled Chicken" includes "Chicken")
      // We sort DB items by length desc to match "Chicken Breast" before "Chicken"
      if (!match) {
        match = foodDb
          .sort((a, b) => b.name.length - a.name.length)
          .find(f => query.toLowerCase().includes(f.name.toLowerCase()));
      }

      // Strategy 4: Word matching (e.g. "Oats" matches "Quaker Oats")
      if (!match) {
        match = foodDb.find(f => {
          const dbWords = f.name.toLowerCase().split(' ');
          const queryWords = query.toLowerCase().split(' ');
          return queryWords.some(w => dbWords.includes(w) && w.length > 3); // match significant words
        });
      }

      // Strategy 5: Normalize and Aliases (e.g. "Vegetables" -> "Vegetable Mixed")
      if (!match) {
        const normalizedQuery = query.toLowerCase().trim();
        // Handle common plurals/singulars basic check
        const singularQuery = normalizedQuery.endsWith('s') ? normalizedQuery.slice(0, -1) : normalizedQuery;

        match = foodDb.find(f => {
          const lowerName = f.name.toLowerCase();
          return lowerName === singularQuery || lowerName.includes(singularQuery);
        });

        // Specific Aliases
        if (!match && (normalizedQuery === 'vegetables' || normalizedQuery === 'vegetable')) {
          match = foodDb.find(f => f.name.toLowerCase().includes('vegetable mixed') || f.name.toLowerCase().includes('mixed vegetable'));
        }
      }

      if (match) {
        // Normalize Unit: If unit is missing or "x", try to infer from DB or default to match's unit
        let servingUnit = match.serving_unit?.toLowerCase();
        let inputUnit = unit;

        // Handling for "pcs", "x", "no."
        if (inputUnit && ['pcs', 'x', 'no.'].includes(inputUnit.toLowerCase())) {
          inputUnit = 'pcs';
        }

        // Logic:
        // If user provided a unit (e.g. 'g'), valid.
        // If user provided NO unit (e.g. "2 Eggs"), assume it matches the DB's serving unit IF it makes sense (pcs vs g).
        // If DB is 'pcs' and user gave no unit, assume 'pcs'.
        // If DB is 'g' and user gave no unit... assume 'g' usually? Or could be 'pcs'? ("100 Rice" usually means grams).

        // Ratio Calculation
        // Standardize input qty to match DB serving size
        let ratio = 1;

        if (inputUnit === 'g' || inputUnit === 'ml') {
          // DB is usually 'g' or 'ml' too, or 'pcs'
          if (servingUnit === 'pcs' || servingUnit === 'slice') {
            // Trying to convert weight to pieces? Hard without density.
            // Fallback: Just assume 100g = 1 serving? No, unsafe.
            // For now, if mismatch, maybe just Ratio = Qty / 100 (standard reference)
            ratio = qty / 100; // Assume DB entries are roughly normalized to 100g/ml if unit mismatch?
            // Wait, our DB has specific serving sizes.
            // Let's stick to safe matches. If units match, use serving size.
          } else {
            ratio = qty / parseFloat(match.serving_size || 100);
          }
        } else if (inputUnit === 'pcs' || inputUnit === 'slice' || inputUnit === 'scoop') {
          // User said pieces.
          if (servingUnit === 'g' || servingUnit === 'ml') {
            // DB is weight, user input count. e.g. "1 Banana" (user) vs "Banana 100g" (DB)
            // We need an average weight per piece? Not in DB.
            // Heuristic: Assume 1 'unit' ~ 1 Serving Size in DB?
            // often DB serving size for things like Banana might be 100g (one medium banana).
            ratio = qty; // 1 banana = 1 * (100g serving)
          } else {
            // Units match-ish (pcs to pcs)
            ratio = qty / parseFloat(match.serving_size || 1);
          }
        } else {
          // No unit provided.
          // "2 Eggs" (DB: 1 pcs) -> Ratio = 2 / 1 = 2.
          // "100 Rice" (DB: 100 g) -> Ratio = 100 / 100 = 1.

          // If qty is small (< 10) likely pieces/scoops/serving counts.
          // If qty is large (> 20) likely grams/ml.

          if (qty <= 10 && (servingUnit === 'g' || servingUnit === 'ml')) {
            // "2 Rice" -> 2 grams? Unlikely. 2 Servings?
            // Let's treat as multiplier of serving size.
            ratio = qty;
          } else {
            ratio = qty / parseFloat(match.serving_size || 100);
          }
        }

        const cal = Math.round(match.calories * ratio);
        const p = parseFloat((match.protein * ratio).toFixed(1));
        const c = parseFloat((match.carbs * ratio).toFixed(1));
        const f = parseFloat((match.fats * ratio).toFixed(1));

        items.push({
          name: match.name,
          originalText: part,
          qty,
          unit: match.serving_unit,
          calories: cal,
          protein: p,
          carbs: c,
          fats: f
        });

        totalCal += cal;
        totalP += p;
        totalC += c;
        totalF += f;
      } else {
        // Unmatched item
        items.push({
          name: "Unknown",
          originalText: part,
          qty: 0,
          unit: "",
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          isUnmatched: true
        });
      }
    });

    setAnalyzedItems(items);

    // Protection: If this is an initial load/parse (triggered by DB load or mount),
    // and we found NO valid items (all unmatched) or total calories are 0,
    // AND the initial text was not empty...
    // We should be careful about zeroing out the parent's macros.
    // However, if the user explicitly typed something that resulted in 0, we should update.

    // Strategy: We compare with the *current* matches.
    // If we have items but they are ALL unmatched, it means we failed to parse the string.
    // In that case, we might want to keep the old macros? 
    // BUT the interface shows the "chips". If chips are red (unknown), user expects 0.
    // The issue is likely that "Chicken" didn't match "Chicken Breast".

    // Let's rely on the improved matching logic below to fix the root cause.

    onUpdate({
      name: inputText,
      calories: Math.round(totalCal),
      protein: parseFloat(totalP.toFixed(1)),
      carbs: parseFloat(totalC.toFixed(1)),
      fats: parseFloat(totalF.toFixed(1))
    });
  };

  const insertSuggestion = (suggestion: any) => {
    if (!activeSegment) return;
    const parts = text.split(/,|\n/);
    const lastSeg = activeSegment;
    const qtyMatch = lastSeg.match(/^(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|pcs|slice|scoop|cup)?/i);

    let newSegment = "";
    if (qtyMatch) {
      newSegment = `${qtyMatch[0]} ${suggestion.name}`;
    } else {
      newSegment = `100g ${suggestion.name}`;
    }

    parts[parts.length - 1] = newSegment;
    const newText = parts.join(", ") + ", ";
    setText(newText);
    setSuggestions([]);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing... e.g. '2 eggs, 50g cheese'"
          className="min-h-[60px] text-lg font-medium bg-transparent border-0 border-b border-primary/20 rounded-none focus-visible:ring-0 px-0 resize-none placeholder:font-normal placeholder:text-muted-foreground/50"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover text-popover-foreground rounded-lg border shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              Suggestions based on "{activeSegment}"
            </div>
            {suggestions.map((s) => (
              <button
                key={s.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between group"
                onClick={() => insertSuggestion(s)}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground group-hover:text-primary">
                  {s.calories}kcal / 100{s.serving_unit}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analyzed Chips */}
      {analyzedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {analyzedItems.map((item, idx) => (
            !item.isUnmatched ? (
              <TooltipProvider key={idx}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="cursor-help px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/10 transition-colors">
                      {item.qty}{item.unit} {item.name}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs bg-primary text-primary-foreground border-0">
                    <p className="font-semibold">{Math.round(item.calories)} kcal</p>
                    <p>P: {Number(item.protein.toFixed(1))} | C: {Number(item.carbs.toFixed(1))} | F: {Number(item.fats.toFixed(1))}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge key={idx} variant="outline" className="text-muted-foreground border-dashed">
                {item.originalText} (?)
              </Badge>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export function EditableMealPlan({ initialPlan, day = "Monday", caloriesTarget, dietType, onSave }: EditableMealPlanProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<DayMealPlan>(initialPlan);

  const calculateTotals = () => {
    const meals = [mealPlan.breakfast, mealPlan.lunch, mealPlan.dinner];

    return {
      calories: meals.reduce((sum, item) => sum + item.calories, 0),
      protein: meals.reduce((sum, item) => sum + item.protein, 0),
      carbs: meals.reduce((sum, item) => sum + item.carbs, 0),
      fats: meals.reduce((sum, item) => sum + item.fats, 0),
    };
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Delete existing meals for this day AND config
      // Note: Plans.tsx deletes by config, so we should allow this component to do the same to be consistent.
      // BUT, if we delete by DAY, we might delete other configs if not careful?
      // Actually, standard usage is: User has ONE active plan config (e.g. 1500 Veg).
      // If we just save 'Daily' for this user without specifying target/type, it's ambiguous.
      // We MUST save with target/type.

      let deleteQuery = supabase
        .from('meal_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('day_of_week', day);

      if (caloriesTarget) deleteQuery = deleteQuery.eq('calories_target', caloriesTarget);
      if (dietType) deleteQuery = deleteQuery.eq('diet_type', dietType);

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError;

      // 2. Prepare new rows
      const baseRow = {
        user_id: user.id,
        day_of_week: day,
        calories_target: caloriesTarget,
        diet_type: dietType
      };

      const rows = [];

      // Breakfast
      rows.push({
        ...baseRow,
        meal_type: 'Breakfast',
        description: mealPlan.breakfast.name,
        calories: mealPlan.breakfast.calories,
        protein: mealPlan.breakfast.protein,
        carbs: mealPlan.breakfast.carbs,
        fats: mealPlan.breakfast.fats,
      });

      // Lunch
      rows.push({
        ...baseRow,
        meal_type: 'Lunch',
        description: mealPlan.lunch.name,
        calories: mealPlan.lunch.calories,
        protein: mealPlan.lunch.protein,
        carbs: mealPlan.lunch.carbs,
        fats: mealPlan.lunch.fats,
      });

      // Dinner
      rows.push({
        ...baseRow,
        meal_type: 'Dinner',
        description: mealPlan.dinner.name,
        calories: mealPlan.dinner.calories,
        protein: mealPlan.dinner.protein,
        carbs: mealPlan.dinner.carbs,
        fats: mealPlan.dinner.fats,
      });



      // 3. Insert new rows
      const { error: insertError } = await supabase
        .from('meal_plans')
        .insert(rows);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Meal plan saved successfully!",
      });

      onSave?.(mealPlan);
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save meal plan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMealPlan(initialPlan);
    setIsEditing(false);
  };

  const updateMeal = (mealType: 'breakfast' | 'lunch' | 'dinner', field: keyof Meal, value: string | number) => {
    setMealPlan(plan => ({
      ...plan,
      [mealType]: {
        ...plan[mealType],
        [field]: value,
      },
    }));
  };









  const renderMeal = (
    meal: Meal,
    icon: React.ReactNode,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    label: string
  ) => (
    <div className="p-4 rounded-xl bg-muted/50 space-y-3" data-testid={`meal-${mealType}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{label}</h4>
          {isEditing ? (
            <div className="space-y-2 mt-2">
              <MealComposer
                initialText={meal.name}
                onUpdate={(data) => {
                  updateMeal(mealType, 'name', data.name);
                  updateMeal(mealType, 'calories', data.calories);
                  updateMeal(mealType, 'protein', data.protein);
                  updateMeal(mealType, 'carbs', data.carbs);
                  updateMeal(mealType, 'fats', data.fats);
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{meal.name}</p>
          )}
        </div>
      </div>


      {isEditing ? (
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Calories</span>
            <span className="font-bold text-lg">{meal.calories}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Protein</span>
            <span className="font-bold text-lg text-primary">{meal.protein}g</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Carbs</span>
            <span className="font-bold text-lg">{meal.carbs}g</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Fats</span>
            <span className="font-bold text-lg">{meal.fats}g</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className="rounded-full font-poppins">{meal.calories} cal</Badge>
          <span className="text-muted-foreground">P: {meal.protein}g</span>
          <span className="text-muted-foreground">C: {meal.carbs}g</span>
          <span className="text-muted-foreground">F: {meal.fats}g</span>
        </div>
      )}
    </div>
  );

  const totalMacros = calculateTotals();

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-meal-plan">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">Daily Meal Plan</h3>
          <p className="text-sm text-muted-foreground">Your personalized nutrition guide</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="rounded-xl"
                data-testid="button-cancel-edit-meal"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-xl" data-testid="button-save-meal" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="rounded-xl"
              data-testid="button-edit-meal"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Plan
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Editing Mode Active - Type e.g. "100g Rice" in the smart input to auto-calculate macros!
          </p>
        </div>
      )}

      <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Daily Totals</h4>
          <Badge className="rounded-full font-poppins">{totalMacros.calories} cal</Badge>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Protein:</span>
            <span className="font-semibold font-poppins">{Number(totalMacros.protein.toFixed(1))}g</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Carbs:</span>
            <span className="font-semibold font-poppins">{Number(totalMacros.carbs.toFixed(1))}g</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Fats:</span>
            <span className="font-semibold font-poppins">{Number(totalMacros.fats.toFixed(1))}g</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {renderMeal(mealPlan.breakfast, <Coffee className="w-5 h-5 text-primary" />, "breakfast", "Breakfast")}
        {renderMeal(mealPlan.lunch, <Sun className="w-5 h-5 text-primary" />, "lunch", "Lunch")}
        {renderMeal(mealPlan.dinner, <Moon className="w-5 h-5 text-primary" />, "dinner", "Dinner")}
      </div>
    </Card>
  );
}
