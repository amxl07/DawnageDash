import type { Express } from "express";
import { createServer, type Server } from "http";
import { foodRoutes } from "./routes/food";
import { userRoutes } from "./routes/users";
import { planRoutes } from "./routes/plans";
import { coachRoutes } from "./routes/coach";
import { checkinRoutes } from "./routes/checkins";
import { trackingRoutes } from "./routes/tracking";
import { financeRoutes } from "./routes/finance";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount API routes
  app.use("/api/food", foodRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/plans", planRoutes);
  app.use("/api/coach", coachRoutes);
  app.use("/api/checkins", checkinRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/finance", financeRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
