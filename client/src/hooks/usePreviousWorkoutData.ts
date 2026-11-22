import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { workoutHistoryValues } from "@/lib/workout-record";

interface PreviousSetData {
  weight: string;
  reps: string;
  rpe: string;
}

export interface PreviousExerciseData {
  [exerciseName: string]: { sets: PreviousSetData[] };
}

export function usePreviousWorkoutData(userId: string | undefined, date: Date) {
  return useQuery<PreviousExerciseData>({
    queryKey: ["previousWorkoutData", userId, format(date, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!userId) return {};

      const currentDate = format(date, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("workout_logs")
        .select("content")
        .eq("user_id", userId)
        .lt("date", currentDate)
        .order("date", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) return {};

      return workoutHistoryValues(data);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
