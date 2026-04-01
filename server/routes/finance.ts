import { Router, type Request, type Response } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { coachCommissions, clientPayments, paymentTransactions } from '../../shared/schema';
import { requireAuth, requireCoachOrAdmin } from '../middleware/auth.js';

export const financeRoutes = Router();

// All finance routes require admin (enforced below per-route or globally)
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// ============================================================================
// COACH COMMISSIONS
// ============================================================================

// GET /api/finance/commissions
financeRoutes.get('/commissions', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(coachCommissions)
      .orderBy(desc(coachCommissions.createdAt));
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch commissions' });
  }
});

// PUT /api/finance/commissions/:coachId — Upsert commission
const upsertCommissionSchema = z.object({
  commissionPercentage: z.number().min(0).max(100),
});

financeRoutes.put('/commissions/:coachId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { coachId } = req.params;
    const parsed = upsertCommissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { commissionPercentage } = parsed.data;

    // Check if exists
    const [existing] = await db
      .select({ id: coachCommissions.id })
      .from(coachCommissions)
      .where(eq(coachCommissions.coachId, coachId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(coachCommissions)
        .set({
          commissionPercentage: String(commissionPercentage),
          updatedAt: new Date(),
        })
        .where(eq(coachCommissions.coachId, coachId))
        .returning();
    } else {
      [result] = await db
        .insert(coachCommissions)
        .values({
          coachId,
          commissionPercentage: String(commissionPercentage),
        })
        .returning();
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error upserting commission:', error);
    res.status(500).json({ message: error.message || 'Failed to save commission' });
  }
});

// ============================================================================
// CLIENT PAYMENTS
// ============================================================================

// GET /api/finance/payments
financeRoutes.get('/payments', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(clientPayments)
      .orderBy(desc(clientPayments.createdAt));
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch payments' });
  }
});

// PUT /api/finance/payments/:clientId — Upsert client payment
const upsertPaymentSchema = z.object({
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
});

financeRoutes.put('/payments/:clientId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const parsed = upsertPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { totalAmount, notes } = parsed.data;

    const [existing] = await db
      .select({ id: clientPayments.id })
      .from(clientPayments)
      .where(eq(clientPayments.clientId, clientId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(clientPayments)
        .set({
          totalAmount: String(totalAmount),
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(clientPayments.clientId, clientId))
        .returning();
    } else {
      [result] = await db
        .insert(clientPayments)
        .values({
          clientId,
          totalAmount: String(totalAmount),
          paymentStatus: 'pending',
          notes: notes || null,
        })
        .returning();
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error upserting payment:', error);
    res.status(500).json({ message: error.message || 'Failed to save payment' });
  }
});

// PATCH /api/finance/payments/:paymentId/status — Update payment status
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'partial', 'paid']),
});

financeRoutes.patch('/payments/:paymentId/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const [result] = await db
      .update(clientPayments)
      .set({ paymentStatus: parsed.data.status, updatedAt: new Date() })
      .where(eq(clientPayments.id, paymentId))
      .returning();

    res.json(result);
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: error.message || 'Failed to update status' });
  }
});

// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

// GET /api/finance/transactions
financeRoutes.get('/transactions', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(paymentTransactions)
      .orderBy(desc(paymentTransactions.paymentDate));
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch transactions' });
  }
});

// GET /api/finance/transactions/by-payment/:paymentId
financeRoutes.get('/transactions/by-payment/:paymentId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const data = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.clientPaymentId, paymentId))
      .orderBy(desc(paymentTransactions.paymentDate));
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch transactions' });
  }
});

// POST /api/finance/transactions — Add transaction + auto-recalculate status
const addTransactionSchema = z.object({
  clientPaymentId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

financeRoutes.post('/transactions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = addTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }

    const { clientPaymentId, amount, paymentDate, paymentMethod, notes } = parsed.data;

    // Atomic: insert transaction + recalculate payment status
    const result = await db.transaction(async (tx) => {
      const [txn] = await tx
        .insert(paymentTransactions)
        .values({
          clientPaymentId,
          amount: String(amount),
          paymentDate,
          paymentMethod: paymentMethod || null,
          notes: notes || null,
        })
        .returning();

      await recalculateStatus(tx, clientPaymentId);

      return txn;
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ message: error.message || 'Failed to add transaction' });
  }
});

// DELETE /api/finance/transactions/:transactionId
financeRoutes.delete('/transactions/:transactionId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const clientPaymentId = req.query.clientPaymentId as string;

    if (!clientPaymentId) {
      return res.status(400).json({ message: 'clientPaymentId query param required' });
    }

    // Atomic: delete transaction + recalculate status
    await db.transaction(async (tx) => {
      await tx
        .delete(paymentTransactions)
        .where(eq(paymentTransactions.id, transactionId));

      await recalculateStatus(tx, clientPaymentId);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: error.message || 'Failed to delete transaction' });
  }
});

// ---------------------------------------------------------------------------
// Helper: recalculate payment status from transactions (runs inside a tx)
// ---------------------------------------------------------------------------
async function recalculateStatus(tx: any, clientPaymentId: string) {
  const [payment] = await tx
    .select({ totalAmount: clientPayments.totalAmount })
    .from(clientPayments)
    .where(eq(clientPayments.id, clientPaymentId))
    .limit(1);

  if (!payment) return;

  const [sumResult] = await tx
    .select({ total: sql<string>`COALESCE(SUM(${paymentTransactions.amount}), 0)` })
    .from(paymentTransactions)
    .where(eq(paymentTransactions.clientPaymentId, clientPaymentId));

  const totalPaid = parseFloat(sumResult?.total || '0');
  const totalAmount = parseFloat(payment.totalAmount);

  let status = 'pending';
  if (totalPaid >= totalAmount) {
    status = 'paid';
  } else if (totalPaid > 0) {
    status = 'partial';
  }

  await tx
    .update(clientPayments)
    .set({ paymentStatus: status, updatedAt: new Date() })
    .where(eq(clientPayments.id, clientPaymentId));
}
