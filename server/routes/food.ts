import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { foodItems } from '../../shared/schema';
import { requireAuth } from '../middleware/auth.js';

export const foodRoutes = Router();

// GET /api/food — Return all food items
foodRoutes.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(foodItems);
    res.json(items);
  } catch (error: any) {
    console.error('Error fetching food items:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch food items' });
  }
});
