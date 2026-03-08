import { formatDisplayDate } from "@/lib/date-utils";
import { differenceInDays, subDays, isAfter, parseISO, startOfWeek, endOfWeek } from "date-fns";

export type PackageName = "elite" | "standard" | "beginner";

// Map legacy package names to current ones
export function mapLegacyPackage(raw: string | null): PackageName {
  if (!raw) return "standard";
  switch (raw) {
    case "premium":
      return "elite";
    case "intermediate":
      return "standard";
    case "basic":
      return "beginner";
    default:
      return raw as PackageName;
  }
}

// Badge color for package type
export function getPackageBadgeColor(pkg: PackageName | string | null): string {
  const mapped = mapLegacyPackage(pkg);
  switch (mapped) {
    case "elite":
      return "bg-amber-500/15 text-amber-700 border-amber-300";
    case "standard":
      return "bg-blue-500/15 text-blue-700 border-blue-300";
    case "beginner":
      return "bg-gray-500/15 text-gray-700 border-gray-300";
    default:
      return "bg-gray-500/15 text-gray-600 border-gray-200";
  }
}

// Calculate end date from start + duration in months
export function calculateEndDate(
  startDate: string | null,
  duration: number | null
): string | null {
  if (!startDate || !duration) return null;
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + duration);
  return formatDisplayDate(end);
}

// Calculate package progress as a percentage
export function calculatePackageProgress(
  startDate: string | null,
  duration: number | null
): number {
  if (!startDate || !duration) return 0;
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + duration);
  const now = new Date();
  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);
  if (totalDays <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
}

// Extract date from a record that may use `date` (daily_check_ins) or `created_at` (weekly_check_ins)
function getRecordDate(record: any): string | null {
  return record.date || record.created_at || null;
}

// Calculate 30-day check-in compliance
export function calculateCompliance(
  checkIns: any[],
  days: number = 30
): number {
  if (!checkIns || checkIns.length === 0) return 0;
  const now = new Date();
  const cutoff = subDays(now, days);
  const recentCheckIns = checkIns.filter((c) => {
    const d = getRecordDate(c);
    return d && isAfter(parseISO(d), cutoff);
  });
  if (recentCheckIns.length === 0) return 0;
  // Use earliest check-in date to determine actual active days
  // so new users aren't penalized for not having 30 days of history
  const dates = recentCheckIns.map((c) => parseISO(getRecordDate(c)!));
  const earliest = dates.reduce((a, b) => (a < b ? a : b));
  const activeDays = Math.max(1, differenceInDays(now, earliest) + 1);
  const expected = Math.min(days, activeDays);
  return Math.min(100, Math.round((recentCheckIns.length / expected) * 100));
}

// Get compliance color based on percentage
export function getComplianceColor(percentage: number): string {
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 50) return "text-amber-600";
  return "text-red-600";
}

// Check for red flags (no check-in in last N days)
export function checkRedFlag(
  checkIns: any[],
  thresholdDays: number = 7
): boolean {
  if (!checkIns || checkIns.length === 0) return true;
  const latest = getLatestDate(checkIns.map((c) => getRecordDate(c)));
  if (!latest) return true;
  return differenceInDays(new Date(), parseISO(latest)) > thresholdDays;
}

// Check weekly review status (has a weekly check-in in last 10 days)
export function checkWeeklyReviewStatus(weeklyCheckIns: any[]): {
  status: "done" | "pending" | "overdue";
  label: string;
} {
  if (!weeklyCheckIns || weeklyCheckIns.length === 0) {
    return { status: "overdue", label: "No reviews" };
  }
  const latest = getLatestDate(weeklyCheckIns.map((w) => w.created_at));
  if (!latest) return { status: "overdue", label: "No reviews" };
  const daysSince = differenceInDays(new Date(), parseISO(latest));
  if (daysSince <= 7) return { status: "done", label: "Up to date" };
  if (daysSince <= 10) return { status: "pending", label: `${daysSince}d ago` };
  return { status: "overdue", label: `${daysSince}d ago` };
}

// Calculate overall consistency from check-ins (% of weeks with at least 1 check-in over 60 days)
export function calculateOverallConsistency(checkIns: any[]): number {
  if (!checkIns || checkIns.length === 0) return 0;
  const now = new Date();
  const weeksToCheck = 8; // ~60 days
  let weeksWithCheckin = 0;
  for (let i = 0; i < weeksToCheck; i++) {
    const weekStart = subDays(now, (i + 1) * 7);
    const weekEnd = subDays(now, i * 7);
    const hasCheckin = checkIns.some((c) => {
      const dateStr = getRecordDate(c);
      if (!dateStr) return false;
      const d = parseISO(dateStr);
      return isAfter(d, weekStart) && !isAfter(d, weekEnd);
    });
    if (hasCheckin) weeksWithCheckin++;
  }
  return Math.round((weeksWithCheckin / weeksToCheck) * 100);
}

// Calculate average nutrition score from recent check-ins
export function calculateAverageNutrition(checkIns: any[]): number | null {
  if (!checkIns || checkIns.length === 0) return null;
  const withNutrition = checkIns.filter(
    (c) => c.nutrition_score != null && c.nutrition_score > 0
  );
  if (withNutrition.length === 0) return null;
  const sum = withNutrition.reduce(
    (acc: number, c: any) => acc + (c.nutrition_score || 0),
    0
  );
  return Math.round((sum / withNutrition.length) * 10) / 10;
}

// Check body measurement status (has a measurement in last 7 days = done, 7-14 = pending, else overdue)
export function checkBodyMeasurementStatus(measurements: any[]): {
  status: "done" | "pending" | "overdue";
  label: string;
} {
  if (!measurements || measurements.length === 0) {
    return { status: "overdue", label: "Never" };
  }
  // body_measurements use a `date` column (DATE type), not created_at
  const latest = getLatestDate(
    measurements.map((m) => m.date || m.created_at)
  );
  if (!latest) return { status: "overdue", label: "Never" };
  const daysSince = differenceInDays(new Date(), parseISO(latest));
  if (daysSince <= 7) return { status: "done", label: "This week" };
  if (daysSince <= 14) return { status: "pending", label: `${daysSince}d ago` };
  return { status: "overdue", label: `${daysSince}d ago` };
}

// Get the latest date string from an array of date strings
export function getLatestDate(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  if (valid.length === 0) return null;
  return valid.sort().reverse()[0];
}

// Calculate weight trend from check-ins (latest vs 7 days ago)
export function calculateWeightTrend(checkIns: any[]): {
  direction: "up" | "down" | "flat" | null;
  delta: number | null;
  latest: number | null;
} {
  if (!checkIns || checkIns.length === 0) return { direction: null, delta: null, latest: null };

  const withWeight = checkIns
    .filter((c) => c.morning_weight != null && Number(c.morning_weight) > 0)
    .sort((a, b) => (b.date || b.created_at || "").localeCompare(a.date || a.created_at || ""));

  if (withWeight.length === 0) return { direction: null, delta: null, latest: null };

  const latestWeight = Number(withWeight[0].morning_weight);
  const sevenDaysAgo = subDays(new Date(), 7);

  // Find the check-in closest to 7 days ago
  const olderEntries = withWeight.filter((c) => {
    const d = c.date || c.created_at;
    return d && !isAfter(parseISO(d), sevenDaysAgo);
  });

  if (olderEntries.length === 0) return { direction: null, delta: null, latest: latestWeight };

  const olderWeight = Number(olderEntries[0].morning_weight);
  const delta = Math.round((latestWeight - olderWeight) * 10) / 10;

  let direction: "up" | "down" | "flat";
  if (Math.abs(delta) <= 0.2) {
    direction = "flat";
  } else if (delta > 0) {
    direction = "up";
  } else {
    direction = "down";
  }

  return { direction, delta, latest: latestWeight };
}

// Get weekly alerts from latest weekly check-in
export function getWeeklyAlerts(weeklyCheckIns: any[]): {
  alerts: string[];
  hasAlerts: boolean;
  progress: string | null;
} {
  if (!weeklyCheckIns || weeklyCheckIns.length === 0) {
    return { alerts: [], hasAlerts: false, progress: null };
  }

  // Sort by created_at desc to get latest
  const sorted = [...weeklyCheckIns].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );
  const latest = sorted[0];
  const alerts: string[] = [];

  if (latest.joint_pain && latest.joint_pain.toLowerCase() !== "no" && latest.joint_pain.toLowerCase() !== "none") {
    alerts.push(`Joint pain: ${latest.joint_pain}`);
  }
  if (latest.missed_sessions && latest.missed_sessions.toLowerCase() !== "no" && latest.missed_sessions.toLowerCase() !== "none" && latest.missed_sessions !== "0") {
    alerts.push(`Missed sessions: ${latest.missed_sessions}`);
  }
  if (latest.recovery_issues && latest.recovery_issues.toLowerCase() !== "no" && latest.recovery_issues.toLowerCase() !== "none") {
    alerts.push(`Recovery: ${latest.recovery_issues}`);
  }

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    progress: latest.training_progress || null,
  };
}

// Check progress photo status (similar to body measurement status)
export function checkProgressPhotoStatus(photos: any[]): {
  status: "done" | "pending" | "overdue";
  label: string;
} {
  if (!photos || photos.length === 0) {
    return { status: "overdue", label: "Never" };
  }
  const latest = getLatestDate(photos.map((p) => p.date || p.created_at));
  if (!latest) return { status: "overdue", label: "Never" };
  const daysSince = differenceInDays(new Date(), parseISO(latest));
  if (daysSince <= 7) return { status: "done", label: "This week" };
  if (daysSince <= 14) return { status: "pending", label: `${daysSince}d ago` };
  return { status: "overdue", label: `${daysSince}d ago` };
}

// Calculate workout activity for current week
export function calculateWorkoutActivity(
  checkIns: any[],
  targetDays: number = 5
): { completed: number; target: number } {
  if (!checkIns || checkIns.length === 0) return { completed: 0, target: targetDays };

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const completed = checkIns.filter((c) => {
    const d = c.date || c.created_at;
    if (!d) return false;
    const date = parseISO(d);
    return (
      (isAfter(date, weekStart) || date.getTime() === weekStart.getTime()) &&
      !isAfter(date, weekEnd) &&
      (c.workout_status === "done" || c.workout_status === "completed" || c.workout_status === "cardio_day")
    );
  }).length;

  return { completed, target: targetDays };
}

// Calculate attention score — higher means needs more attention
export function calculateAttentionScore(
  checkIns: any[],
  weeklyCheckIns: any[],
  measurements: any[],
  photos: any[]
): { score: number; level: "high" | "medium" | "low"; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // No check-in in 5+ days
  const lastCheckInDate = getLatestDate((checkIns || []).map((c) => c.date || c.created_at));
  if (!lastCheckInDate || differenceInDays(new Date(), parseISO(lastCheckInDate)) >= 5) {
    score += 30;
    reasons.push("No check-in in 5+ days");
  }

  // Weekly check-in alerts
  if (weeklyCheckIns && weeklyCheckIns.length > 0) {
    const sorted = [...weeklyCheckIns].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    );
    const latest = sorted[0];

    if (latest.missed_sessions && latest.missed_sessions.toLowerCase() !== "no" && latest.missed_sessions.toLowerCase() !== "none" && latest.missed_sessions !== "0") {
      score += 15;
      reasons.push("Missed training sessions");
    }
    if (latest.joint_pain && latest.joint_pain.toLowerCase() !== "no" && latest.joint_pain.toLowerCase() !== "none") {
      score += 20;
      reasons.push("Joint pain reported");
    }
    if (latest.recovery_issues && latest.recovery_issues.toLowerCase() !== "no" && latest.recovery_issues.toLowerCase() !== "none") {
      score += 10;
      reasons.push("Recovery issues");
    }
  }

  // Low compliance (<50%)
  const compliance = calculateCompliance(checkIns);
  if (compliance < 50) {
    score += 10;
    reasons.push("Low compliance (<50%)");
  }

  // No measurements in 14+ days
  const lastMeasurement = getLatestDate((measurements || []).map((m) => m.date || m.created_at));
  if (!lastMeasurement || differenceInDays(new Date(), parseISO(lastMeasurement)) >= 14) {
    score += 5;
    reasons.push("No measurements in 14+ days");
  }

  // No photos in 30+ days
  const lastPhoto = getLatestDate((photos || []).map((p) => p.date || p.created_at));
  if (!lastPhoto || differenceInDays(new Date(), parseISO(lastPhoto)) >= 30) {
    score += 10;
    reasons.push("No progress photos in 30+ days");
  }

  let level: "high" | "medium" | "low";
  if (score >= 40) level = "high";
  else if (score >= 20) level = "medium";
  else level = "low";

  return { score, level, reasons };
}

// Parse assigned plan names from JSON strings
export function parseAssignedPlan(
  workoutPlanJson: string | null,
  mealPlanJson: string | null
): { workout: string | null; meal: string | null } {
  let workout: string | null = null;
  let meal: string | null = null;

  if (workoutPlanJson) {
    try {
      const parsed = JSON.parse(workoutPlanJson);
      const parts: string[] = [];
      if (parsed.level) parts.push(parsed.level);
      if (parsed.workoutType) parts.push(parsed.workoutType.replace(/_/g, " "));
      workout = parts.length > 0 ? parts.join(" - ") : null;
    } catch {
      workout = null;
    }
  }

  if (mealPlanJson) {
    try {
      const parsed = JSON.parse(mealPlanJson);
      const parts: string[] = [];
      if (parsed.calories) parts.push(`${parsed.calories} cal`);
      if (parsed.dietType) parts.push(parsed.dietType);
      meal = parts.length > 0 ? parts.join(" / ") : null;
    } catch {
      meal = null;
    }
  }

  return { workout, meal };
}
