import express from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { foodRoutes } from '../server/routes/food';
import { userRoutes } from '../server/routes/users';
import { planRoutes } from '../server/routes/plans';
import { coachRoutes } from '../server/routes/coach';
import { checkinRoutes } from '../server/routes/checkins';
import { trackingRoutes } from '../server/routes/tracking';
import { financeRoutes } from '../server/routes/finance';

const app = express();
app.use(express.json());

// Mount API routes
app.use('/api/food', foodRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/finance', financeRoutes);

// Vercel serverless handler — export a (req, res) function, not the app itself
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
