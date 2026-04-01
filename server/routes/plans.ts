import { Router, type Request, type Response } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  workoutPlans,
  workoutTemplates,
  mealPlans,
  mealTemplates,
  users,
} from '../../shared/schema';
import { requireAuth, canAccessUser, requireCoachOrAdmin } from '../middleware/auth.js';

export const planRoutes = Router();

// ---------------------------------------------------------------------------
// Helper: Build sub_category condition (handles null)
// ---------------------------------------------------------------------------
function subCategoryCondition(table: typeof workoutPlans | typeof workoutTemplates, value: string | null | undefined) {
  return value ? eq(table.subCategory, value) : isNull(table.subCategory);
}

// ---------------------------------------------------------------------------
// GET /api/plans/:userId/workout
// Fetch user's custom workout plan for the given hierarchy.
// Falls back to templates if no custom plan exists.
// ---------------------------------------------------------------------------
const workoutQuerySchema = z.object({
  level: z.string(),
  workoutType: z.string(),
  daysPerWeek: z.coerce.number().int(),
  subCategory: z.string().optional(),
});

planRoutes.get('/:userId/workout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = workoutQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten() });
    }

    const { level, workoutType, daysPerWeek, subCategory } = parsed.data;

    // Try user's custom plan first
    const customPlans = await db
      .select()
      .from(workoutPlans)
      .where(and(
        eq(workoutPlans.userId, userId),
        eq(workoutPlans.level, level),
        eq(workoutPlans.workoutType, workoutType),
        eq(workoutPlans.daysPerWeek, daysPerWeek),
        subCategoryCondition(workoutPlans, subCategory),
      ))
      .orderBy(workoutPlans.dayNumber);

    if (customPlans.length > 0) {
      return res.json({ source: 'custom', plans: customPlans });
    }

    // Fallback to templates
    const templates = await db
      .select()
      .from(workoutTemplates)
      .where(and(
        eq(workoutTemplates.level, level),
        eq(workoutTemplates.workoutType, workoutType),
        eq(workoutTemplates.daysPerWeek, daysPerWeek),
        subCategoryCondition(workoutTemplates, subCategory),
      ))
      .orderBy(workoutTemplates.dayNumber);

    res.json({ source: 'template', plans: templates });
  } catch (error: any) {
    console.error('Error fetching workout plans:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch workout plans' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/plans/:userId/workout — Save (replace) workout plan
// Atomic: delete old rows + insert new rows in a transaction
// ---------------------------------------------------------------------------
const workoutDaySchema = z.object({
  dayNumber: z.number().int(),
  focus: z.string().optional(),
  exercises: z.string(), // JSON-stringified array
});

const saveWorkoutSchema = z.object({
  level: z.string(),
  workoutType: z.string(),
  daysPerWeek: z.number().int(),
  subCategory: z.string().nullable().optional(),
  days: z.array(workoutDaySchema).min(1),
  updateActivePreference: z.boolean().optional(),
});

planRoutes.put('/:userId/workout', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = saveWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { level, workoutType, daysPerWeek, subCategory, days, updateActivePreference } = parsed.data;

    await db.transaction(async (tx) => {
      // Delete existing rows for this hierarchy
      const deleteConditions = [
        eq(workoutPlans.userId, userId),
        eq(workoutPlans.level, level),
        eq(workoutPlans.workoutType, workoutType),
        eq(workoutPlans.daysPerWeek, daysPerWeek),
        subCategory ? eq(workoutPlans.subCategory, subCategory) : isNull(workoutPlans.subCategory),
      ];

      await tx.delete(workoutPlans).where(and(...deleteConditions));

      // Insert new rows
      const rows = days.map((day) => ({
        userId,
        level,
        workoutType,
        subCategory: subCategory || null,
        daysPerWeek,
        dayNumber: day.dayNumber,
        focus: day.focus || null,
        exercises: day.exercises,
      }));

      await tx.insert(workoutPlans).values(rows);

      // Optionally update user's active preference
      if (updateActivePreference) {
        await tx.update(users)
          .set({
            activeWorkoutPlan: JSON.stringify({ level, workoutType, subCategory, daysPerWeek }),
          })
          .where(eq(users.id, userId));
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving workout plan:', error);
    res.status(500).json({ message: error.message || 'Failed to save workout plan' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/plans/:userId/workout/copy — Copy workout plan to multiple clients
// ---------------------------------------------------------------------------
const copyWorkoutSchema = z.object({
  level: z.string(),
  workoutType: z.string(),
  daysPerWeek: z.number().int(),
  subCategory: z.string().nullable().optional(),
  days: z.array(workoutDaySchema).min(1),
  targetClientIds: z.array(z.string().uuid()).min(1),
});

planRoutes.post('/:userId/workout/copy', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = copyWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { level, workoutType, daysPerWeek, subCategory, days, targetClientIds } = parsed.data;
    const activePreference = JSON.stringify({ level, workoutType, subCategory, daysPerWeek });

    await db.transaction(async (tx) => {
      for (const clientId of targetClientIds) {
        if (!await canAccessUser(req.user!, clientId)) {
          throw new Error(`No access to client ${clientId}`);
        }

        // Update active preference
        await tx.update(users)
          .set({ activeWorkoutPlan: activePreference })
          .where(eq(users.id, clientId));

        // Delete existing
        await tx.delete(workoutPlans).where(and(
          eq(workoutPlans.userId, clientId),
          eq(workoutPlans.level, level),
          eq(workoutPlans.workoutType, workoutType),
          eq(workoutPlans.daysPerWeek, daysPerWeek),
          subCategory ? eq(workoutPlans.subCategory, subCategory) : isNull(workoutPlans.subCategory),
        ));

        // Insert copied rows
        const rows = days.map((day) => ({
          userId: clientId,
          level,
          workoutType,
          subCategory: subCategory || null,
          daysPerWeek,
          dayNumber: day.dayNumber,
          focus: day.focus || null,
          exercises: day.exercises,
        }));

        await tx.insert(workoutPlans).values(rows);
      }
    });

    res.json({ success: true, copiedTo: targetClientIds.length });
  } catch (error: any) {
    console.error('Error copying workout plan:', error);
    res.status(500).json({ message: error.message || 'Failed to copy workout plan' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/plans/:userId/meal
// Fetch user's custom meal plan. Falls back to templates.
// ---------------------------------------------------------------------------
const mealQuerySchema = z.object({
  caloriesTarget: z.coerce.number().int(),
  dietType: z.string(),
});

planRoutes.get('/:userId/meal', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = mealQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten() });
    }

    const { caloriesTarget, dietType } = parsed.data;

    // Try user's custom plan first
    const customPlans = await db
      .select()
      .from(mealPlans)
      .where(and(
        eq(mealPlans.userId, userId),
        eq(mealPlans.caloriesTarget, caloriesTarget),
        eq(mealPlans.dietType, dietType),
      ));

    if (customPlans.length > 0) {
      return res.json({ source: 'custom', plans: customPlans });
    }

    // Fallback to template
    const templates = await db
      .select()
      .from(mealTemplates)
      .where(and(
        eq(mealTemplates.caloriesTarget, caloriesTarget),
        eq(mealTemplates.dietType, dietType),
      ))
      .limit(1);

    res.json({ source: 'template', plans: templates });
  } catch (error: any) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch meal plans' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/plans/:userId/meal — Save (replace) meal plan
// ---------------------------------------------------------------------------
const mealRowSchema = z.object({
  dayOfWeek: z.string(),
  mealType: z.string(),
  description: z.string().nullable().optional(),
  calories: z.number().int().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbs: z.number().nullable().optional(),
  fats: z.number().nullable().optional(),
});

const saveMealSchema = z.object({
  caloriesTarget: z.number().int(),
  dietType: z.string(),
  meals: z.array(mealRowSchema).min(1),
  updateActivePreference: z.boolean().optional(),
});

planRoutes.put('/:userId/meal', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = saveMealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { caloriesTarget, dietType, meals, updateActivePreference } = parsed.data;

    await db.transaction(async (tx) => {
      // Delete existing
      await tx.delete(mealPlans).where(and(
        eq(mealPlans.userId, userId),
        eq(mealPlans.caloriesTarget, caloriesTarget),
        eq(mealPlans.dietType, dietType),
      ));

      // Insert new
      const rows = meals.map((meal) => ({
        userId,
        caloriesTarget,
        dietType,
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        description: meal.description || null,
        calories: meal.calories || null,
        protein: meal.protein ? String(meal.protein) : null,
        carbs: meal.carbs ? String(meal.carbs) : null,
        fats: meal.fats ? String(meal.fats) : null,
      }));

      await tx.insert(mealPlans).values(rows);

      if (updateActivePreference) {
        await tx.update(users)
          .set({
            activeMealPlan: JSON.stringify({ calories: caloriesTarget, dietType }),
          })
          .where(eq(users.id, userId));
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving meal plan:', error);
    res.status(500).json({ message: error.message || 'Failed to save meal plan' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/plans/:userId/meal/copy — Copy meal plan to multiple clients
// ---------------------------------------------------------------------------
const copyMealSchema = z.object({
  caloriesTarget: z.number().int(),
  dietType: z.string(),
  meals: z.array(mealRowSchema).min(1),
  targetClientIds: z.array(z.string().uuid()).min(1),
});

planRoutes.post('/:userId/meal/copy', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = copyMealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { caloriesTarget, dietType, meals, targetClientIds } = parsed.data;
    const activePreference = JSON.stringify({ calories: caloriesTarget, dietType });

    await db.transaction(async (tx) => {
      for (const clientId of targetClientIds) {
        if (!await canAccessUser(req.user!, clientId)) {
          throw new Error(`No access to client ${clientId}`);
        }

        // Update active preference
        await tx.update(users)
          .set({ activeMealPlan: activePreference })
          .where(eq(users.id, clientId));

        // Delete existing
        await tx.delete(mealPlans).where(and(
          eq(mealPlans.userId, clientId),
          eq(mealPlans.caloriesTarget, caloriesTarget),
          eq(mealPlans.dietType, dietType),
        ));

        // Insert copied rows
        const rows = meals.map((meal) => ({
          userId: clientId,
          caloriesTarget,
          dietType,
          dayOfWeek: meal.dayOfWeek,
          mealType: meal.mealType,
          description: meal.description || null,
          calories: meal.calories || null,
          protein: meal.protein ? String(meal.protein) : null,
          carbs: meal.carbs ? String(meal.carbs) : null,
          fats: meal.fats ? String(meal.fats) : null,
        }));

        await tx.insert(mealPlans).values(rows);
      }
    });

    res.json({ success: true, copiedTo: targetClientIds.length });
  } catch (error: any) {
    console.error('Error copying meal plan:', error);
    res.status(500).json({ message: error.message || 'Failed to copy meal plan' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/plans/:userId/active-workout — Update active workout preference only
// ---------------------------------------------------------------------------
const activeWorkoutSchema = z.object({
  level: z.string(),
  workoutType: z.string(),
  subCategory: z.string().nullable().optional(),
  daysPerWeek: z.number().int(),
});

planRoutes.put('/:userId/active-workout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = activeWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    await db.update(users)
      .set({ activeWorkoutPlan: JSON.stringify(parsed.data) })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating active workout:', error);
    res.status(500).json({ message: error.message || 'Failed to update' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/plans/:userId/active-meal — Update active meal preference only
// ---------------------------------------------------------------------------
const activeMealSchema = z.object({
  calories: z.number().int(),
  dietType: z.string(),
});

planRoutes.put('/:userId/active-meal', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = activeMealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    await db.update(users)
      .set({ activeMealPlan: JSON.stringify(parsed.data) })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating active meal:', error);
    res.status(500).json({ message: error.message || 'Failed to update' });
  }
});
