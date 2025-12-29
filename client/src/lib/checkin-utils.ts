
import { addDays, differenceInDays, format, startOfDay } from "date-fns";

// Define the shape of data as returned by Supabase (snake_case)
// We avoid using the Drizzle schema type DailyCheckIn because it uses camelCase keys
export interface RawDailyCheckIn {
    id: string;
    user_id: string;
    date: string;
    day_number?: number | null;

    morning_weight?: string | number | null;
    sleep_hours?: string | number | null;

    workout_status?: string | null;
    workout_performance?: number | null;

    nutrition_score?: number | null;
    calorie_intake?: number | null;
    water_liters?: string | number | null;
    daily_steps?: number | null;
    protein?: string | number | null;
    carbs?: string | number | null;
    fats?: string | number | null;

    energy_level?: number | null;
    hunger_level?: number | null;
    stress_level?: number | null;
    digestion?: string | null;

    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface ProcessedCheckIn {
    date: Date;
    dateString: string;
    dayNumber: number;
    status: 'done' | 'missed';
    originalCheckIn?: RawDailyCheckIn;
}

export function processCheckInHistory(checkIns: RawDailyCheckIn[]): ProcessedCheckIn[] {
    if (!checkIns || checkIns.length === 0) {
        return [];
    }

    // Sort check-ins by date (oldest first)
    const sortedCheckIns = [...checkIns].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstCheckIn = sortedCheckIns[0];
    const firstDate = startOfDay(new Date(firstCheckIn.date));

    // Use local time for "today"
    const now = new Date();
    const today = startOfDay(now);

    const totalDays = differenceInDays(today, firstDate) + 1;
    const processedHistory: ProcessedCheckIn[] = [];

    // Create a map for quick lookup of existing check-ins by date string (YYYY-MM-DD)
    const checkInMap = new Map<string, RawDailyCheckIn>();
    sortedCheckIns.forEach(checkIn => {
        // Ensure we work with the date part only string from the DB or ISO
        const dateStr = new Date(checkIn.date).toISOString().split('T')[0];
        checkInMap.set(dateStr, checkIn);
    });

    for (let i = 0; i < totalDays; i++) {
        const currentDate = addDays(firstDate, i);
        // Format to YYYY-MM-DD to match our map keys. 
        // Uses local system time logic which is what we want
        const dateKey = format(currentDate, 'yyyy-MM-dd');

        // Day number is 1-based index from start
        const dayNumber = i + 1;

        const existingCheckIn = checkInMap.get(dateKey);

        if (existingCheckIn) {
            processedHistory.push({
                date: currentDate,
                dateString: dateKey,
                dayNumber: dayNumber,
                status: 'done',
                originalCheckIn: existingCheckIn
            });
        } else {
            processedHistory.push({
                date: currentDate,
                dateString: dateKey,
                dayNumber: dayNumber,
                status: 'missed'
            });
        }
    }

    // Return in descending order (newest first) as usually expected by UI
    return processedHistory.reverse();
}
