import { supabase } from "@/lib/supabase";
import { calculateCompliance, calculateAttentionScore, getLatestDate } from "@/lib/coach-utils";

// Fetch all coaches
export async function fetchAllCoaches() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "coach")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Fetch all clients
export async function fetchAllClients() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "client")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Fetch check-ins for a set of client IDs (last 60 days)
export async function fetchCheckInsForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const isoDate = sixtyDaysAgo.toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_check_ins")
    .select("id, user_id, date, nutrition_score, morning_weight, workout_status")
    .in("user_id", clientIds)
    .gte("date", isoDate);
  if (error) throw error;
  return data || [];
}

// Fetch weekly check-ins for a set of client IDs
export async function fetchWeeklyCheckInsForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const { data, error } = await supabase
    .from("weekly_check_ins")
    .select("id, user_id, created_at, joint_pain, missed_sessions, recovery_issues, training_progress, nutrition_adherence, enjoying_training, enjoying_meals")
    .in("user_id", clientIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Fetch body measurements for a set of client IDs
export async function fetchMeasurementsForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const { data, error } = await supabase
    .from("body_measurements")
    .select("id, user_id, date")
    .in("user_id", clientIds)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Fetch progress photos for a set of client IDs
export async function fetchPhotosForClients(clientIds: string[]) {
  if (clientIds.length === 0) return [];
  const { data, error } = await supabase
    .from("weekly_progress_photos")
    .select("id, user_id, date")
    .in("user_id", clientIds)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Group array records by a key field
export function groupByField<T extends Record<string, any>>(
  records: T[],
  field: string
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  records.forEach((r) => {
    const key = r[field];
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
}

// Calculate coach performance metrics from their clients' data
export function calculateCoachMetrics(
  coachId: string,
  clients: any[],
  checkInsByClient: Record<string, any[]>,
  weeklyByClient: Record<string, any[]>,
  measurementsByClient: Record<string, any[]>,
  photosByClient: Record<string, any[]>
) {
  const coachClients = clients.filter((c: any) => c.coach_id === coachId);
  const totalClients = coachClients.length;

  if (totalClients === 0) {
    return {
      totalClients: 0,
      avgCompliance: 0,
      avgAttentionScore: 0,
      clientsNeedingAttention: 0,
      activePackages: { elite: 0, standard: 0, beginner: 0 },
      lastClientCheckIn: null,
      avgAttentionLevel: "low" as const,
      avgWorkoutRate: 0,
      avgSatisfaction: null as number | null,
      expiringPackages: 0,
    };
  }

  let totalCompliance = 0;
  let totalAttention = 0;
  let clientsNeedingAttention = 0;
  let totalWorkoutRate = 0;
  let workoutRateCount = 0;
  let totalSatisfaction = 0;
  let satisfactionCount = 0;
  const activePackages = { elite: 0, standard: 0, beginner: 0 };

  coachClients.forEach((client: any) => {
    const cid = client.id;
    const checkIns = checkInsByClient[cid] || [];
    const weekly = weeklyByClient[cid] || [];
    const measurements = measurementsByClient[cid] || [];
    const photos = photosByClient[cid] || [];

    // Compliance
    totalCompliance += calculateCompliance(checkIns);

    // Attention
    const attention = calculateAttentionScore(checkIns, weekly, measurements, photos);
    totalAttention += attention.score;
    if (attention.level === "high") clientsNeedingAttention++;

    // Workout completion rate
    const workoutRate = calculateWorkoutCompletionRate(checkIns);
    if (checkIns.length > 0) {
      totalWorkoutRate += workoutRate;
      workoutRateCount++;
    }

    // Client satisfaction
    const satisfaction = calculateClientSatisfaction(weekly);
    if (satisfaction !== null) {
      totalSatisfaction += satisfaction;
      satisfactionCount++;
    }

    // Package breakdown
    const pkg = client.package_type;
    if (pkg === "premium" || pkg === "elite") activePackages.elite++;
    else if (pkg === "intermediate" || pkg === "standard") activePackages.standard++;
    else if (pkg === "basic" || pkg === "beginner") activePackages.beginner++;
  });

  const avgCompliance = Math.round(totalCompliance / totalClients);
  const avgAttentionScore = Math.round(totalAttention / totalClients);
  const avgWorkoutRate = workoutRateCount > 0 ? Math.round(totalWorkoutRate / workoutRateCount) : 0;
  const avgSatisfaction = satisfactionCount > 0 ? Math.round(totalSatisfaction / satisfactionCount) : null;
  const expiringPackages = countExpiringPackages(coachClients);

  let avgAttentionLevel: "high" | "medium" | "low";
  if (avgAttentionScore >= 40) avgAttentionLevel = "high";
  else if (avgAttentionScore >= 20) avgAttentionLevel = "medium";
  else avgAttentionLevel = "low";

  // Find the most recent check-in across all this coach's clients
  const allCheckInDates: string[] = [];
  coachClients.forEach((client: any) => {
    const checkIns = checkInsByClient[client.id] || [];
    checkIns.forEach((c: any) => {
      if (c.date) allCheckInDates.push(c.date);
    });
  });
  const lastClientCheckIn = getLatestDate(allCheckInDates);

  return {
    totalClients,
    avgCompliance,
    avgAttentionScore,
    clientsNeedingAttention,
    activePackages,
    lastClientCheckIn,
    avgAttentionLevel,
    avgWorkoutRate,
    avgSatisfaction,
    expiringPackages,
  };
}

// Calculate workout completion rate from check-ins
// Counts 'done' and 'cardio_day' as completed, excludes 'rest_day' from denominator
export function calculateWorkoutCompletionRate(checkIns: any[]): number {
  if (!checkIns || checkIns.length === 0) return 0;
  const withStatus = checkIns.filter((c: any) => c.workout_status);
  if (withStatus.length === 0) return 0;
  const nonRest = withStatus.filter((c: any) => c.workout_status !== "rest_day");
  if (nonRest.length === 0) return 0;
  const completed = nonRest.filter(
    (c: any) => c.workout_status === "done" || c.workout_status === "completed" || c.workout_status === "cardio_day"
  );
  return Math.round((completed.length / nonRest.length) * 100);
}

// Calculate client satisfaction from structured weekly check-in fields
// Scores: training_progress (Yes=1), nutrition_adherence (Yes=1, Mostly=0.5), enjoying_training (Yes=1), enjoying_meals (Yes=1)
export function calculateClientSatisfaction(weeklyCheckIns: any[]): number | null {
  if (!weeklyCheckIns || weeklyCheckIns.length === 0) return null;
  // Use only the latest weekly check-in per client
  const latest = [...weeklyCheckIns].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  )[0];

  const scores: number[] = [];

  if (latest.training_progress) {
    scores.push(latest.training_progress.toLowerCase() === "yes" ? 1 : 0);
  }
  if (latest.nutrition_adherence) {
    const val = latest.nutrition_adherence.toLowerCase();
    scores.push(val === "yes" ? 1 : val === "mostly" ? 0.5 : 0);
  }
  if (latest.enjoying_training) {
    scores.push(latest.enjoying_training.toLowerCase() === "yes" ? 1 : 0);
  }
  if (latest.enjoying_meals) {
    scores.push(latest.enjoying_meals.toLowerCase() === "yes" ? 1 : 0);
  }

  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
}

// Count clients with packages expiring within N days
export function countExpiringPackages(clients: any[], withinDays: number = 30): number {
  const now = new Date();
  return clients.filter((c: any) => {
    if (!c.package_start_date || !c.package_duration) return false;
    const start = new Date(c.package_start_date);
    const end = new Date(start);
    end.setMonth(end.getMonth() + c.package_duration);
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= withinDays;
  }).length;
}

// Fetch all coach_client_history records
export async function fetchCoachClientHistory() {
  const { data, error } = await supabase
    .from("coach_client_history")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Calculate retention from history data for a specific coach
// Retention = unique clients still assigned / unique clients ever assigned
export function calculateRetentionFromHistory(
  coachId: string,
  history: any[],
  currentClients: any[]
): { rate: number; totalEverAssigned: number; currentlyAssigned: number; lost: number; hasData: boolean } {
  const coachHistory = history.filter((h: any) => h.coach_id === coachId);

  // Get all unique client IDs ever assigned to this coach
  const everAssigned = new Set<string>();
  coachHistory.forEach((h: any) => {
    if (h.event_type === "assigned") {
      everAssigned.add(h.client_id);
    }
  });

  // Current clients assigned to this coach
  const currentlyAssigned = currentClients.filter((c: any) => c.coach_id === coachId).length;

  const totalEverAssigned = everAssigned.size;

  // If no history data exists, we can't calculate retention
  if (totalEverAssigned === 0) {
    return { rate: 0, totalEverAssigned: 0, currentlyAssigned, lost: 0, hasData: false };
  }

  const lost = totalEverAssigned - currentlyAssigned;
  const rate = Math.round((currentlyAssigned / totalEverAssigned) * 100);

  return { rate, totalEverAssigned, currentlyAssigned, lost, hasData: true };
}
