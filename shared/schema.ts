import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, date, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// USERS TABLE (synced with Supabase Auth)
// ============================================================================
// Note: This table references Supabase's auth.users table
// The id here should match the UUID from auth.users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().references(() => sql`auth.users(id)` as any, { onDelete: "cascade" }),
  email: text("email"),
  fullName: text("full_name"),
  phoneNumber: text("phone_number"),
  countryCode: text("country_code"), // e.g., '+1', '+91', '+44'
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  fullName: true,
  phoneNumber: true,
  countryCode: true,
  avatarUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================================
// DAILY CHECK-INS TABLE
// ============================================================================
export const dailyCheckIns = pgTable("daily_check_ins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  dayNumber: integer("day_number"),

  // Vitals
  morningWeight: decimal("morning_weight", { precision: 5, scale: 2 }),
  sleepHours: decimal("sleep_hours", { precision: 3, scale: 1 }),

  // Workout
  workoutStatus: varchar("workout_status", { length: 20 }), // 'done', 'no', 'cardio_day', 'rest_day'
  workoutPerformance: integer("workout_performance"), // 1-10

  // Nutrition
  nutritionScore: integer("nutrition_score"), // 1-10
  calorieIntake: integer("calorie_intake"),
  waterLiters: decimal("water_liters", { precision: 3, scale: 1 }),
  dailySteps: integer("daily_steps"),
  protein: decimal("protein", { precision: 5, scale: 1 }),
  carbs: decimal("carbs", { precision: 5, scale: 1 }),
  fats: decimal("fats", { precision: 5, scale: 1 }),

  // Wellbeing
  energyLevel: integer("energy_level"), // 1-10
  hungerLevel: integer("hunger_level"), // 1-10
  stressLevel: integer("stress_level"), // 1-10
  digestion: varchar("digestion", { length: 20 }), // 'none', 'bloated', 'constipated', 'diarrhea'

  // Notes
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDailyCheckInSchema = createInsertSchema(dailyCheckIns);
export type InsertDailyCheckIn = z.infer<typeof insertDailyCheckInSchema>;
export type DailyCheckIn = typeof dailyCheckIns.$inferSelect;

// ============================================================================
// BODY MEASUREMENTS TABLE
// ============================================================================
export const bodyMeasurements = pgTable("body_measurements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),

  weight: decimal("weight", { precision: 5, scale: 2 }),
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 4, scale: 2 }),
  muscleMass: decimal("muscle_mass", { precision: 5, scale: 2 }),
  chest: decimal("chest", { precision: 5, scale: 2 }),
  waist: decimal("waist", { precision: 5, scale: 2 }),
  hips: decimal("hips", { precision: 5, scale: 2 }),
  thighs: decimal("thighs", { precision: 5, scale: 2 }),
  arms: decimal("arms", { precision: 5, scale: 2 }),
  neck: decimal("neck", { precision: 5, scale: 2 }),
  calves: decimal("calves", { precision: 5, scale: 2 }),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBodyMeasurementSchema = createInsertSchema(bodyMeasurements);
export type InsertBodyMeasurement = z.infer<typeof insertBodyMeasurementSchema>;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;

// ============================================================================
// WORKOUT PLANS TABLE
// ============================================================================
export const workoutPlans = pgTable("workout_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: varchar("day_of_week", { length: 10 }).notNull(), // 'Monday', 'Tuesday', etc.
  focus: varchar("focus", { length: 100 }),
  exercises: text("exercises"), // JSON string of exercises
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans);
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;

// ============================================================================
// MEAL PLANS TABLE
// ============================================================================
export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: varchar("day_of_week", { length: 10 }).notNull(),
  mealType: varchar("meal_type", { length: 20 }).notNull(), // 'Breakfast', 'Lunch', 'Dinner', 'Snacks'
  description: text("description"),
  calories: integer("calories"),
  protein: decimal("protein", { precision: 5, scale: 1 }),
  carbs: decimal("carbs", { precision: 5, scale: 1 }),
  fats: decimal("fats", { precision: 5, scale: 1 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans);
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

// ============================================================================
// PROGRESS PHOTOS TABLE
// ============================================================================
export const progressPhotos = pgTable("progress_photos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  photoUrl: text("photo_url").notNull(),
  photoType: varchar("photo_type", { length: 20 }), // 'front', 'side', 'back'
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProgressPhotoSchema = createInsertSchema(progressPhotos);
export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;

// ============================================================================
// USER GOALS TABLE
// ============================================================================
export const userGoals = pgTable("user_goals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalType: varchar("goal_type", { length: 50 }).notNull(), // 'weight_loss', 'muscle_gain', etc.
  targetValue: decimal("target_value", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  startDate: date("start_date"),
  targetDate: date("target_date"),
  status: varchar("status", { length: 20 }).default('active'), // 'active', 'completed', 'abandoned'
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserGoalSchema = createInsertSchema(userGoals);
export type InsertUserGoal = z.infer<typeof insertUserGoalSchema>;
export type UserGoal = typeof userGoals.$inferSelect;
