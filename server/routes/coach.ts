import { Router, type Request, type Response } from 'express';
import { eq, and, isNull, inArray, gte, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  users,
  dailyCheckIns,
  bodyMeasurements,
  weeklyProgressPhotos,
  coachClientHistory,
} from '../../shared/schema';
import { requireAuth, canAccessUser, requireCoachOrAdmin } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const coachRoutes = Router();

// ---------------------------------------------------------------------------
// GET /api/coach/unassigned-clients — Clients with no coach assigned
// ---------------------------------------------------------------------------
coachRoutes.get('/unassigned-clients', requireAuth, requireCoachOrAdmin, async (_req: Request, res: Response) => {
  try {
    const clients = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        countryCode: users.countryCode,
      })
      .from(users)
      .where(and(eq(users.role, 'client'), isNull(users.coachId)));

    res.json(clients);
  } catch (error: any) {
    console.error('Error fetching unassigned clients:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch unassigned clients' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/coach/clients — Full client list for the coach dashboard
// ---------------------------------------------------------------------------
coachRoutes.get('/clients', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const coachId = req.user!.id;

    const clients = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'client'), eq(users.coachId, coachId)));

    res.json(clients);
  } catch (error: any) {
    console.error('Error fetching coach clients:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch clients' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/coach/claim-client — Claim an unassigned client (atomic)
// ---------------------------------------------------------------------------
const claimClientSchema = z.object({
  clientId: z.string().uuid(),
  packageType: z.string(),
  packageDuration: z.number().int(),
});

coachRoutes.post('/claim-client', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = claimClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { clientId, packageType, packageDuration } = parsed.data;
    const coachId = req.user!.id;

    // Atomic: update user + log history
    const [updatedClient] = await db.transaction(async (tx) => {
      // Verify client is actually unassigned
      const [client] = await tx
        .select({ id: users.id, coachId: users.coachId, email: users.email, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.id, clientId), eq(users.role, 'client')))
        .limit(1);

      if (!client) {
        throw new Error('Client not found');
      }
      if (client.coachId) {
        throw new Error('Client is already assigned to a coach');
      }

      // Assign coach + set package
      await tx.update(users)
        .set({ coachId, packageType, packageDuration })
        .where(eq(users.id, clientId));

      // Log in history
      await tx.insert(coachClientHistory).values({
        coachId,
        clientId,
        eventType: 'assigned',
        packageType,
        packageDuration,
      });

      return [client];
    });

    // Send welcome email (non-blocking, outside transaction)
    if (updatedClient.email) {
      try {
        await supabaseAdmin.functions.invoke('send-welcome-email', {
          body: {
            email: updatedClient.email,
            name: updatedClient.fullName || 'Valued Client',
            packageType,
            coachName: req.user!.email,
            duration: packageDuration,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
        // Don't fail the claim just because email failed
      }
    }

    res.json({ success: true, emailSent: !!updatedClient.email });
  } catch (error: any) {
    console.error('Error claiming client:', error);
    const status = error.message?.includes('not found') || error.message?.includes('already assigned') ? 409 : 500;
    res.status(status).json({ message: error.message || 'Failed to claim client' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/coach/clients/:clientId/package — Update client package
// ---------------------------------------------------------------------------
const updatePackageSchema = z.object({
  packageType: z.string(),
  packageDuration: z.number().int(),
  packageStartDate: z.string().optional(),
});

coachRoutes.put('/clients/:clientId/package', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    if (!await canAccessUser(req.user!, clientId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const parsed = updatePackageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const updatePayload: Record<string, any> = {
      packageType: parsed.data.packageType,
      packageDuration: parsed.data.packageDuration,
    };
    if (parsed.data.packageStartDate) {
      updatePayload.packageStartDate = parsed.data.packageStartDate;
    }

    await db.update(users).set(updatePayload).where(eq(users.id, clientId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating package:', error);
    res.status(500).json({ message: error.message || 'Failed to update package' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/coach/clients/:clientId/note — Save coach note
// ---------------------------------------------------------------------------
coachRoutes.put('/clients/:clientId/note', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    if (!await canAccessUser(req.user!, clientId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { note } = req.body;

    await db.update(users).set({ coachNote: note }).where(eq(users.id, clientId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving coach note:', error);
    res.status(500).json({ message: error.message || 'Failed to save note' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/coach/clients/:clientId/unassign — Unassign client (atomic)
// ---------------------------------------------------------------------------
coachRoutes.post('/clients/:clientId/unassign', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const coachId = req.user!.id;

    if (!await canAccessUser(req.user!, clientId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.transaction(async (tx) => {
      // Fetch current package info for history snapshot
      const [client] = await tx
        .select({ packageType: users.packageType, packageDuration: users.packageDuration })
        .from(users)
        .where(eq(users.id, clientId))
        .limit(1);

      // Remove coach assignment
      await tx.update(users)
        .set({ coachId: null })
        .where(eq(users.id, clientId));

      // Log unassignment in history
      await tx.insert(coachClientHistory).values({
        coachId,
        clientId,
        eventType: 'unassigned',
        packageType: client?.packageType || null,
        packageDuration: client?.packageDuration || null,
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error unassigning client:', error);
    res.status(500).json({ message: error.message || 'Failed to unassign client' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/coach/clients/check-ins?clientIds=...&days=60 — Batch fetch
// ---------------------------------------------------------------------------
coachRoutes.get('/clients/check-ins', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const clientIdsParam = req.query.clientIds as string;
    const days = parseInt(req.query.days as string) || 60;

    if (!clientIdsParam) {
      return res.json([]);
    }

    const clientIds = clientIdsParam.split(',').filter(Boolean);
    if (clientIds.length === 0) return res.json([]);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const isoDate = cutoffDate.toISOString().split('T')[0];

    const data = await db
      .select({
        id: dailyCheckIns.id,
        userId: dailyCheckIns.userId,
        date: dailyCheckIns.date,
        nutritionScore: dailyCheckIns.nutritionScore,
        morningWeight: dailyCheckIns.morningWeight,
        workoutStatus: dailyCheckIns.workoutStatus,
      })
      .from(dailyCheckIns)
      .where(and(
        inArray(dailyCheckIns.userId, clientIds),
        gte(dailyCheckIns.date, isoDate),
      ));

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching check-ins:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch check-ins' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/coach/clients/weekly-check-ins?clientIds=... — Batch fetch
// ---------------------------------------------------------------------------
coachRoutes.get('/clients/weekly-check-ins', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const clientIdsParam = req.query.clientIds as string;
    if (!clientIdsParam) return res.json([]);

    const clientIds = clientIdsParam.split(',').filter(Boolean);
    if (clientIds.length === 0) return res.json([]);

    // weekly_check_ins may not be in Drizzle schema — use raw SQL
    const result = await db.execute(sql`
      SELECT id, user_id, created_at, joint_pain, missed_sessions, recovery_issues, training_progress
      FROM weekly_check_ins
      WHERE user_id = ANY(${clientIds})
      ORDER BY created_at DESC
    `);

    res.json(result.rows ?? result);
  } catch (error: any) {
    console.error('Error fetching weekly check-ins:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch weekly check-ins' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/coach/clients/measurements?clientIds=... — Batch fetch
// ---------------------------------------------------------------------------
coachRoutes.get('/clients/measurements', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const clientIdsParam = req.query.clientIds as string;
    if (!clientIdsParam) return res.json([]);

    const clientIds = clientIdsParam.split(',').filter(Boolean);
    if (clientIds.length === 0) return res.json([]);

    const data = await db
      .select({
        id: bodyMeasurements.id,
        userId: bodyMeasurements.userId,
        date: bodyMeasurements.date,
      })
      .from(bodyMeasurements)
      .where(inArray(bodyMeasurements.userId, clientIds))
      .orderBy(desc(bodyMeasurements.date));

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch measurements' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/coach/clients/photos?clientIds=... — Batch fetch
// ---------------------------------------------------------------------------
coachRoutes.get('/clients/photos', requireAuth, requireCoachOrAdmin, async (req: Request, res: Response) => {
  try {
    const clientIdsParam = req.query.clientIds as string;
    if (!clientIdsParam) return res.json([]);

    const clientIds = clientIdsParam.split(',').filter(Boolean);
    if (clientIds.length === 0) return res.json([]);

    const data = await db
      .select({
        id: weeklyProgressPhotos.id,
        userId: weeklyProgressPhotos.userId,
        date: weeklyProgressPhotos.date,
      })
      .from(weeklyProgressPhotos)
      .where(inArray(weeklyProgressPhotos.userId, clientIds))
      .orderBy(desc(weeklyProgressPhotos.date));

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch photos' });
  }
});
