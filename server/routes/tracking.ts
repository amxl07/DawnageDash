import { Router, type Request, type Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bodyMeasurements, workoutLogs, weeklyProgressPhotos } from '../../shared/schema';
import { requireAuth, canAccessUser } from '../middleware/auth.js';

export const trackingRoutes = Router();

// ============================================================================
// BODY MEASUREMENTS
// ============================================================================

// GET /api/tracking/measurements/:userId/:date
trackingRoutes.get('/measurements/:userId/:date', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [row] = await db
      .select()
      .from(bodyMeasurements)
      .where(and(eq(bodyMeasurements.userId, userId), eq(bodyMeasurements.date, date)))
      .limit(1);

    res.json(row ?? null);
  } catch (error: any) {
    console.error('Error fetching measurement:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch measurement' });
  }
});

// POST /api/tracking/measurements/:userId — Upsert measurement
trackingRoutes.post('/measurements/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id, date, chest, waist, hips, thighs, arms } = req.body;

    const values = {
      userId,
      date,
      chest: chest ?? null,
      waist: waist ?? null,
      hips: hips ?? null,
      thighs: thighs ?? null,
      arms: arms ?? null,
    };

    if (id) {
      await db.update(bodyMeasurements).set(values).where(eq(bodyMeasurements.id, id));
    } else {
      await db.insert(bodyMeasurements).values(values);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving measurement:', error);
    res.status(500).json({ message: error.message || 'Failed to save measurement' });
  }
});

// ============================================================================
// WORKOUT LOGS
// ============================================================================

// GET /api/tracking/workout-logs/:userId/:date
trackingRoutes.get('/workout-logs/:userId/:date', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [row] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.date, date)))
      .limit(1);

    res.json(row ?? null);
  } catch (error: any) {
    console.error('Error fetching workout log:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch workout log' });
  }
});

// POST /api/tracking/workout-logs/:userId — Upsert workout log
trackingRoutes.post('/workout-logs/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id, date, title, content } = req.body;

    const values = {
      userId,
      date,
      title,
      content: typeof content === 'string' ? content : JSON.stringify(content),
    };

    if (id) {
      await db.update(workoutLogs).set(values).where(eq(workoutLogs.id, id));
    } else {
      await db.insert(workoutLogs).values(values);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving workout log:', error);
    res.status(500).json({ message: error.message || 'Failed to save workout log' });
  }
});

// ============================================================================
// PROGRESS PHOTOS
// ============================================================================

// GET /api/tracking/photos/:userId/:date
trackingRoutes.get('/photos/:userId/:date', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [row] = await db
      .select()
      .from(weeklyProgressPhotos)
      .where(and(eq(weeklyProgressPhotos.userId, userId), eq(weeklyProgressPhotos.date, date)))
      .limit(1);

    res.json(row ?? null);
  } catch (error: any) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch photos' });
  }
});

// POST /api/tracking/photos/:userId — Upsert progress photos
trackingRoutes.post('/photos/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!await canAccessUser(req.user!, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id, date, frontUrl, backUrl, sideLeftUrl, sideRightUrl } = req.body;

    const values = {
      userId,
      date,
      frontUrl: frontUrl ?? null,
      backUrl: backUrl ?? null,
      sideLeftUrl: sideLeftUrl ?? null,
      sideRightUrl: sideRightUrl ?? null,
    };

    if (id) {
      await db.update(weeklyProgressPhotos).set(values).where(eq(weeklyProgressPhotos.id, id));
    } else {
      await db.insert(weeklyProgressPhotos).values(values);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving photos:', error);
    res.status(500).json({ message: error.message || 'Failed to save photos' });
  }
});
