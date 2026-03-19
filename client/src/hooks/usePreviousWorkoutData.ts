import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

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

      const result: PreviousExerciseData = {};

      for (const log of data) {
        try {
          const content =
            typeof log.content === "string"
              ? JSON.parse(log.content)
              : log.content;

          if (!Array.isArray(content)) continue;

          for (const ex of content) {
            const name = (ex.exercise || "").toLowerCase().trim();
            if (!name || result[name]) continue;

            result[name] = {
              sets: (ex.sets || []).map((s: any) => ({
                weight: s.weight || "",
                reps: s.reps || "",
                rpe: s.rpe || "",
              })),
            };
          }
        } catch {
          continue;
        }
      }

      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
