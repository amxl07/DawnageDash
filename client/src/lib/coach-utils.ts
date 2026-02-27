import { formatDisplayDate } from "@/lib/date-utils";
import { differenceInDays, subDays, isAfter, parseISO } from "date-fns";

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
  const cutoff = subDays(new Date(), days);
  const recentCheckIns = checkIns.filter((c) => {
    const d = getRecordDate(c);
    return d && isAfter(parseISO(d), cutoff);
  });
  // Expected: roughly 1 check-in per day for the period
  const expected = days;
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
