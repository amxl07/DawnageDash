import { differenceInDays, isSameDay, subDays, startOfDay, parseISO } from "date-fns";

/**
 * Calculates the compliance percentage for a client based on their check-ins over a specific period.
 * 
 * @param checkInDates - Array of date strings or Date objects representing when the client checked in.
 * @param periodDays - The number of days to look back (default 30).
 * @returns The percentage of days with a check-in (0-100).
 */
export function calculateCompliance(checkInDates: (string | Date)[], periodDays: number = 30): number {
    if (periodDays <= 0) return 0;

    const now = startOfDay(new Date());
    const startDate = subDays(now, periodDays - 1); // -1 to include today if checked in

    // Filter check-ins within the period
    const relevantCheckIns = checkInDates.filter(date => {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return d >= startDate && d <= now; // Simple comparison works for dates
    });

    // Count unique days (in case of multiple check-ins per day, though unlikely for daily check-ins)
    const uniqueDays = new Set(
        relevantCheckIns.map(d => {
            const dateObj = typeof d === 'string' ? parseISO(d) : d;
            return startOfDay(dateObj).toISOString();
        })
    ).size;

    return Math.min(100, Math.round((uniqueDays / periodDays) * 100));
}

/**
 * Checks if a client is a "Red Flag" case (missed 5 consecutive check-ins immediately preceding today).
 * 
 * @param lastCheckInDate - The date string or object of the client's last active check-in.
 * @returns true if the client has missed 5 or more consecutive days up to today.
 */
export function checkRedFlag(lastCheckInDate: string | Date | null | undefined): boolean {
    if (!lastCheckInDate) return true; // Never checked in or null date is a red flag if they are an active client

    const last = typeof lastCheckInDate === 'string' ? parseISO(lastCheckInDate) : lastCheckInDate;
    const now = startOfDay(new Date());

    // Difference in days between today and last check-in
    // If today is Friday and last check-in was Sunday (5 days ago), diff is 5.
    const diff = differenceInDays(now, startOfDay(last));

    return diff >= 5;
}

/**
 * Calculates the percentage of the package duration that has elapsed.
 * 
 * @param startDate - The start date of the package.
 * @param durationMonths - The total duration of the package in months.
 * @returns The percentage elapsed (0-100).
 */
export function calculatePackageProgress(startDate: string | Date | null | undefined, durationMonths: number): number {
    if (!startDate || !durationMonths || durationMonths <= 0) return 0;

    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const now = new Date();

    // Calculate total days in the package (approximate month as 30.44 days)
    const totalDays = durationMonths * 30.44;
    const daysElapsed = differenceInDays(now, start);

    if (daysElapsed < 0) return 0; // Not started yet

    const percentage = (daysElapsed / totalDays) * 100;

    return Math.min(100, Math.round(percentage));
}

/**
 * Helper to determine the color of the compliance bar.
 */
export function getComplianceColor(percentage: number): string {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
}

/**
 * Checks if a weekly review has been submitted for the current week.
 * 
 * @param lastWeeklyCheckInDate - Date string of the last weekly check-in.
 * @returns true if the check-in is within the current ISO week.
 */
export function checkWeeklyReviewStatus(lastWeeklyCheckInDate: string | Date | null | undefined): boolean {
    if (!lastWeeklyCheckInDate) return false;

    const last = typeof lastWeeklyCheckInDate === 'string' ? parseISO(lastWeeklyCheckInDate) : lastWeeklyCheckInDate;
    const now = new Date();

    // Check if within last 7 days? Or strictly this week? 
    // Usually "Weekly Check-in" is done once a week. 
    // Let's check if it was done in the last 7 days for simplicity and robustness.
    const diff = differenceInDays(now, last);
    return diff < 7;
}

/**
 * Calculates the overall consistency from the start date to today.
 * 
 * @param checkInDates - Array of all check-in dates.
 * @param startDate - The client's package start date or first check-in date.
 * @returns The percentage of days with a check-in since start (0-100).
 */
export function calculateOverallConsistency(checkInDates: (string | Date)[], startDate: string | Date | null | undefined): number {
    if (!startDate) return 0; // Or maybe calculate from first check-in if start date is missing?

    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const now = startOfDay(new Date());

    const totalDays = differenceInDays(now, start);

    // If started today or in future, avoid division by zero
    if (totalDays <= 0) return checkInDates.length > 0 ? 100 : 0;

    // Filter check-ins after start date
    const relevantCheckIns = checkInDates.filter(date => {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return d >= start && d <= now;
    });

    const uniqueDays = new Set(
        relevantCheckIns.map(d => {
            const dateObj = typeof d === 'string' ? parseISO(d) : d;
            return startOfDay(dateObj).toISOString();
        })
    ).size;

    return Math.min(100, Math.round((uniqueDays / totalDays) * 100));
}

/**
 * Calculates the average nutrition score for the last 7 days.
 * 
 * @param checkIns - Array of check-in objects containing nutrition_score and date.
 * @returns The average score formatted as a string (e.g. "8.5") or "N/A" if no data.
 */
export function calculateAverageNutrition(checkIns: { nutrition_score?: number | null, date: string }[]): string {
    const now = startOfDay(new Date());
    const sevenDaysAgo = subDays(now, 7);

    const recentCheckIns = checkIns.filter(ci => {
        const d = parseISO(ci.date);
        return d >= sevenDaysAgo && d <= now && ci.nutrition_score != null;
    });

    if (recentCheckIns.length === 0) return "N/A";

    const totalScore = recentCheckIns.reduce((sum, ci) => sum + (ci.nutrition_score || 0), 0);
    const avg = totalScore / recentCheckIns.length;

    return avg.toFixed(1);
}

/**
 * Finds the latest date from a list of records.
 * 
 * @param records - Array of objects with a date field.
 * @param dateField - The name of the date field in the objects (default 'date' or 'created_at').
 * @returns The Date object of the latest record or null.
 */
export function getLatestDate(records: any[], dateField: string = 'date'): Date | null {
    if (!records || records.length === 0) return null;

    // Filter out null dates
    const validRecords = records.filter(r => r[dateField]);
    if (validRecords.length === 0) return null;

    // Sort descending
    validRecords.sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime());

    return new Date(validRecords[0][dateField]);
}
