import { Router, type Request, type Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../../shared/schema';
import { requireAuth, canAccessUser, requireCoachOrAdmin } from '../middleware/auth.js';

export const userRoutes = Router();

// ---------------------------------------------------------------------------
// GET /api/users/my-clients — Get coach's assigned clients
// ---------------------------------------------------------------------------
userRoutes.get('/my-clients', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const coachId = req.user!.id;

    const clients = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        activeWorkoutPlan: users.activeWorkoutPlan,
        activeMealPlan: users.activeMealPlan,
      })
      .from(users)
      .where(and(eq(users.coachId, coachId), eq(users.role, 'client')));

    res.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch clients' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:userId/profile — Get user's active plan preferences
// ---------------------------------------------------------------------------
userRoutes.get('/:userId/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [profile] = await db
      .select({
        activeWorkoutPlan: users.activeWorkoutPlan,
        activeMealPlan: users.activeMealPlan,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(profile);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch profile' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:userId/notes — Update a single note/supplements field
// ---------------------------------------------------------------------------
const updateNotesSchema = z.object({
  field: z.enum(['training_note', 'nutrition_note', 'supplements_data', 'cardio_note', 'steps_note']),
  value: z.union([z.string(), z.null()]),
});

const fieldMap: Record<string, keyof typeof users.$inferSelect> = {
  training_note: 'trainingNote',
  nutrition_note: 'nutritionNote',
  supplements_data: 'supplementsData',
  cardio_note: 'cardioNote',
  steps_note: 'stepsNote',
};

userRoutes.put('/:userId/notes', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = updateNotesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { field, value } = parsed.data;
    const drizzleField = fieldMap[field];

    await db.update(users)
      .set({ [drizzleField]: value })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notes:', error);
    res.status(500).json({ message: error.message || 'Failed to update notes' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:userId/notes/:noteType — Read a note field
// ---------------------------------------------------------------------------
userRoutes.get('/:userId/notes/:noteType', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, noteType } = req.params;

    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const drizzleField = fieldMap[noteType];
    if (!drizzleField) {
      return res.status(400).json({ message: `Invalid note type: ${noteType}` });
    }

    const [row] = await db
      .select({ value: (users as any)[drizzleField] })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({ value: row?.value ?? null });
  } catch (error: any) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch note' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/users/:userId/supplements — Read supplements data
// ---------------------------------------------------------------------------
userRoutes.get('/:userId/supplements', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [row] = await db
      .select({ supplementsData: users.supplementsData })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({ supplementsData: row?.supplementsData ?? null });
  } catch (error: any) {
    console.error('Error fetching supplements:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch supplements' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/users/:userId/supplements — Update supplements data
// ---------------------------------------------------------------------------
userRoutes.put('/:userId/supplements', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { supplementsData } = req.body;

    await db.update(users)
      .set({ supplementsData: supplementsData ?? null })
      .where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating supplements:', error);
    res.status(500).json({ message: error.message || 'Failed to update supplements' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/users/:userId/copy-notes — Batch copy notes/supplements to clients
// ---------------------------------------------------------------------------
const copyNotesSchema = z.object({
  field: z.enum(['training_note', 'nutrition_note', 'supplements_data']),
  targetClientIds: z.array(z.string().uuid()).min(1),
});

userRoutes.post('/:userId/copy-notes', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = copyNotesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { field, targetClientIds } = parsed.data;
    const drizzleField = fieldMap[field];

    await db.transaction(async (tx) => {
      // Fetch source value
      const [source] = await tx
        .select({ value: (users as any)[drizzleField] })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const sourceValue = source?.value ?? null;

      // Verify coach access + update each target client
      for (const clientId of targetClientIds) {
        const hasAccess = await canAccessUser(req.user!, clientId);
        if (!hasAccess) {
          throw new Error(`No access to client ${clientId}`);
        }

        await tx.update(users)
          .set({ [drizzleField]: sourceValue })
          .where(eq(users.id, clientId));
      }
    });

    res.json({ success: true, copiedTo: targetClientIds.length });
  } catch (error: any) {
    console.error('Error copying notes:', error);
    res.status(500).json({ message: error.message || 'Failed to copy notes' });
  }
});
