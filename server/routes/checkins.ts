import { Router, type Request, type Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dailyCheckIns, users } from '../../shared/schema';
import { requireAuth, canAccessUser } from '../middleware/auth.js';

export const checkinRoutes = Router();

// ---------------------------------------------------------------------------
// GET /api/checkins/:userId/:date — Fetch a single check-in by date
// ---------------------------------------------------------------------------
checkinRoutes.get('/:userId/:date', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [row] = await db
      .select()
      .from(dailyCheckIns)
      .where(and(eq(dailyCheckIns.userId, userId), eq(dailyCheckIns.date, date)))
      .limit(1);

    res.json(row ?? null);
  } catch (error: any) {
    console.error('Error fetching check-in:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch check-in' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/checkins/:userId — Create or update a daily check-in (upsert)
// ---------------------------------------------------------------------------
checkinRoutes.post('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      id, date, morningWeight, sleepHours, workoutStatus, workoutPerformance,
      nutritionScore, calorieIntake, waterLiters, dailySteps,
      energyLevel, hungerLevel, stressLevel, digestion,
    } = req.body;

    const values = {
      userId,
      date,
      morningWeight: morningWeight ?? null,
      sleepHours: sleepHours ?? null,
      workoutStatus: workoutStatus ?? null,
      workoutPerformance: workoutPerformance ?? null,
      nutritionScore: nutritionScore ?? null,
      calorieIntake: calorieIntake ?? null,
      waterLiters: waterLiters ?? null,
      dailySteps: dailySteps ?? null,
      energyLevel: energyLevel ?? null,
      hungerLevel: hungerLevel ?? null,
      stressLevel: stressLevel ?? null,
      digestion: digestion ?? null,
    };

    let resultId: string;

    if (id) {
      // Update existing
      await db.update(dailyCheckIns).set(values).where(eq(dailyCheckIns.id, id));
      resultId = id;
    } else {
      // Insert new
      const [inserted] = await db.insert(dailyCheckIns).values(values).returning({ id: dailyCheckIns.id });
      resultId = inserted.id;
    }

    // If this is the user's first check-in, set package_start_date
    if (req.user!.id === userId) {
      const [userData] = await db
        .select({ packageStartDate: users.packageStartDate })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userData && !userData.packageStartDate) {
        await db.update(users)
          .set({ packageStartDate: date })
          .where(eq(users.id, userId));
      }
    }

    res.json({ success: true, id: resultId });
  } catch (error: any) {
    console.error('Error saving check-in:', error);
    res.status(500).json({ message: error.message || 'Failed to save check-in' });
  }
});
