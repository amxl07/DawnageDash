import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../../shared/schema';
import type { AuthUser } from '../types.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

// Service-role client for JWT verification (never exposed to browser)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Middleware: Verifies Supabase JWT and attaches user to request.
 * Gets role from database (authoritative) rather than JWT claims.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get role from DB (authoritative source, not JWT claims)
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    req.user = {
      id: user.id,
      email: user.email || '',
      role: (dbUser?.role as AuthUser['role']) || 'client',
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

/**
 * Checks if the authenticated user can access the target user's data.
 * - Own data: always allowed
 * - Admin: always allowed
 * - Coach: only their assigned clients
 */
export async function canAccessUser(authUser: AuthUser, targetUserId: string): Promise<boolean> {
  if (authUser.id === targetUserId) return true;
  if (authUser.role === 'admin') return true;

  if (authUser.role === 'coach') {
    const [targetUser] = await db
      .select({ coachId: users.coachId })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    return targetUser?.coachId === authUser.id;
  }

  return false;
}

/**
 * Middleware: Rejects if the user is not a coach or admin.
 * Must be used after requireAuth.
 */
export function requireCoachOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.role === 'client') {
    return res.status(403).json({ message: 'Only coaches and admins can perform this action' });
  }
  next();
}
