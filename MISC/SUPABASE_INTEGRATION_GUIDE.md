# Supabase Integration Guide

## 🎉 Database Setup Complete!

Your Supabase database is now ready with all 7 tables created. Here's how to start using real data in your dashboard.

---

## 📊 Step 1: Add Sample Data (For Testing)

Before your dashboard can display data, you need some data in the database. You can add test data in two ways:

### Option A: Via Supabase Dashboard (Easiest for testing)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click **Table Editor**
3. Click on **users** table
4. Click **Insert row** button
5. Fill in:
   ```
   username: testuser
   password: (any hashed password or just "test123" for now)
   email: test@example.com
   fullName: Test User
   ```
6. Click **Save**
7. Copy the generated `id` (you'll need it for other tables)

8. Click on **daily_check_ins** table → **Insert row**:
   ```
   userId: (paste the id from step 7)
   date: 2025-02-04
   morningWeight: 78.5
   sleepHours: 7.5
   workoutStatus: done
   workoutPerformance: 9
   nutritionScore: 9
   calorieIntake: 2100
   waterLiters: 2.8
   dailySteps: 9200
   energyLevel: 9
   hungerLevel: 4
   stressLevel: 2
   digestion: none
   ```

Repeat for more dates to have data to display!

### Option B: Via SQL Editor (Faster for bulk data)

1. In Supabase, click **SQL Editor**
2. Click **New query**
3. Paste and run this:

```sql
-- Insert a test user
INSERT INTO users (username, password, email, full_name)
VALUES ('testuser', 'hashed_password_here', 'test@example.com', 'Test User')
RETURNING id;

-- Remember the ID returned above, then use it below
-- Replace 'USER_ID_HERE' with the actual ID

-- Insert daily check-ins (last 7 days)
INSERT INTO daily_check_ins (
  user_id, date, day_number, morning_weight, sleep_hours,
  workout_status, workout_performance, nutrition_score,
  calorie_intake, water_liters, daily_steps,
  energy_level, hunger_level, stress_level, digestion,
  protein, carbs, fats
) VALUES
  ('USER_ID_HERE', '2025-02-04', 28, 78.5, 7.5, 'done', 9, 9, 2100, 2.8, 9200, 9, 4, 2, 'none', 151, 207, 63),
  ('USER_ID_HERE', '2025-02-03', 27, 78.8, 8.0, 'rest_day', null, 8, 2000, 2.5, 6500, 8, 5, 3, 'none', 140, 195, 58),
  ('USER_ID_HERE', '2025-02-02', 26, 79.0, 7.0, 'done', 8, 9, 2050, 3.0, 10500, 8, 4, 2, 'none', 145, 200, 60),
  ('USER_ID_HERE', '2025-02-01', 25, 79.4, 6.5, 'cardio_day', 7, 8, 1950, 2.6, 12000, 7, 6, 4, 'none', 130, 180, 55),
  ('USER_ID_HERE', '2025-01-31', 24, 79.5, 8.0, 'done', 9, 10, 2100, 2.8, 8900, 9, 4, 2, 'none', 155, 210, 65),
  ('USER_ID_HERE', '2025-01-30', 23, 79.8, 7.5, 'done', 8, 9, 2000, 2.7, 9500, 8, 5, 3, 'none', 148, 198, 61),
  ('USER_ID_HERE', '2025-01-29', 22, 80.0, 7.0, 'no', null, 7, 2200, 2.0, 5500, 6, 7, 6, 'bloated', 125, 220, 70);

-- Insert body measurements
INSERT INTO body_measurements (
  user_id, date, weight, body_fat_percentage, muscle_mass,
  chest, waist, hips, thighs, arms, neck, calves
) VALUES
  ('USER_ID_HERE', '2025-02-04', 78.5, 18.2, 62.5, 102, 84, 98, 58, 36, 38, 38),
  ('USER_ID_HERE', '2025-02-01', 79.4, 18.8, 62.0, 102, 85, 99, 59, 36, 38, 38),
  ('USER_ID_HERE', '2025-01-29', 80.0, 19.2, 61.5, 103, 86, 100, 60, 37, 39, 39);
```

---

## 🔌 Step 2: Query Data from Supabase

Now let's update your Dashboard to fetch real data instead of using mock data.

### Example: Update Dashboard.tsx

Here's how to replace the mock weight data with real Supabase data:

**BEFORE (Mock Data):**
```typescript
export default function Dashboard() {
  // Mock data
  const weightData = [
    { date: 'W1', weight: 82.5 },
    { date: 'W2', weight: 81.8 },
    ...
  ];

  return <WeightChart data={weightData} />;
}
```

**AFTER (Real Supabase Data):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  // Fetch weight data from Supabase
  const { data: weightData, isLoading, error } = useQuery({
    queryKey: ['weight-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('date, morning_weight')
        .order('date', { ascending: true })
        .limit(7);

      if (error) throw error;

      // Transform data to match chart format
      return data.map((item, index) => ({
        date: `W${index + 1}`,
        weight: parseFloat(item.morning_weight)
      }));
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-red-500">
        Error loading data: {error.message}
      </div>
    );
  }

  return <WeightChart data={weightData || []} />;
}
```

---

## 📝 Common Query Patterns

### 1. Get Daily Check-Ins (Last 7 Days)

```typescript
const { data } = useQuery({
  queryKey: ['check-ins'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);

    if (error) throw error;
    return data;
  }
});
```

### 2. Get Body Measurements History

```typescript
const { data } = useQuery({
  queryKey: ['measurements'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('date, weight, body_fat_percentage, muscle_mass')
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  }
});
```

### 3. Get Workout Plans

```typescript
const { data } = useQuery({
  queryKey: ['workout-plans'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .order('day_of_week');

    if (error) throw error;
    return data;
  }
});
```

### 4. Insert New Check-In (Form Submission)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const CheckInForm = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (formData) => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .insert({
          user_id: 'USER_ID_HERE', // Get from auth context
          date: formData.date,
          morning_weight: formData.morningWeight,
          sleep_hours: formData.sleepHours,
          workout_status: formData.workoutStatus,
          workout_performance: formData.workoutPerformance,
          nutrition_score: formData.nutritionScore,
          calorie_intake: formData.calorieIntake,
          water_liters: formData.waterLiters,
          daily_steps: formData.dailySteps,
          energy_level: formData.energyLevel,
          hunger_level: formData.hungerLevel,
          stress_level: formData.stressLevel,
          digestion: formData.digestion,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh check-ins data
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });

      toast({
        title: "Success!",
        description: "Check-in saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // ... rest of form
};
```

---

## 🔥 Step 3: Enable Real-Time Updates

Make your dashboard update automatically when data changes:

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to changes in daily_check_ins table
    const channel = supabase
      .channel('daily-check-ins-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'daily_check_ins'
        },
        (payload) => {
          console.log('Change received!', payload);

          // Refresh all queries related to check-ins
          queryClient.invalidateQueries({ queryKey: ['check-ins'] });
          queryClient.invalidateQueries({ queryKey: ['weight-history'] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ... rest of component
}
```

---

## 🛠️ Complete Example: Dashboard with Real Data

Here's a complete example showing how to update your Dashboard page:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MetricCard } from "@/components/MetricCard";
import { WeightChart } from "@/components/WeightChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Weight, Flame, Trophy, Zap } from "lucide-react";

export default function Dashboard() {
  // Fetch weight data
  const { data: weightData, isLoading: loadingWeight } = useQuery({
    queryKey: ['weight-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('date, morning_weight')
        .not('morning_weight', 'is', null)
        .order('date', { ascending: true })
        .limit(7);

      if (error) throw error;

      return data.map((item, index) => ({
        date: `W${index + 1}`,
        weight: parseFloat(item.morning_weight)
      }));
    }
  });

  // Fetch summary metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Get latest check-in
      const { data: latest, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      // Get workouts this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { count: workoutCount } = await supabase
        .from('daily_check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('workout_status', 'done')
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      // Calculate average nutrition score (last 7 days)
      const { data: recentCheckins } = await supabase
        .from('daily_check_ins')
        .select('nutrition_score, energy_level')
        .not('nutrition_score', 'is', null)
        .order('date', { ascending: false })
        .limit(7);

      const avgNutrition = recentCheckins
        ? (recentCheckins.reduce((sum, item) => sum + (item.nutrition_score || 0), 0) / recentCheckins.length).toFixed(1)
        : '0';

      const avgEnergy = recentCheckins && recentCheckins.length > 0
        ? Math.round(recentCheckins.reduce((sum, item) => sum + (item.energy_level || 0), 0) / recentCheckins.length)
        : 0;

      return {
        currentWeight: latest.morning_weight,
        workoutCount,
        avgNutrition,
        avgEnergy,
      };
    }
  });

  if (loadingWeight || loadingMetrics) {
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Weight"
          value={`${metrics?.currentWeight || 0} kg`}
          icon={Weight}
          subtitle="Latest check-in"
        />
        <MetricCard
          title="Workouts"
          value={metrics?.workoutCount || 0}
          icon={Flame}
          subtitle="This month"
        />
        <MetricCard
          title="Nutrition Score"
          value={metrics?.avgNutrition || '0'}
          icon={Trophy}
          subtitle="Average this week"
        />
        <MetricCard
          title="Energy Level"
          value={`${metrics?.avgEnergy || 0}/10`}
          icon={Zap}
        />
      </div>

      <WeightChart data={weightData || []} />
    </div>
  );
}
```

---

## 📊 Testing Your Integration

1. **Add sample data** using SQL or Supabase dashboard
2. **Start your dev server:**
   ```bash
   npm run dev
   ```
3. **Open the dashboard** at http://localhost:5000
4. **Check browser console** for any errors
5. **Verify data loads** - you should see real data from Supabase!

---

## 🐛 Troubleshooting

### Error: "Missing environment variables"
- Make sure you restart the dev server after updating `.env`
- Verify `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (with `VITE_` prefix!)

### Error: "Failed to fetch"
- Check your Supabase URL is correct
- Verify your anon key is correct
- Check browser network tab for 401/403 errors

### No data showing
- Verify you inserted data into the tables
- Check the query is using the correct table name
- Open browser DevTools → Network → Find the Supabase request → Check response

### Real-time not working
- Make sure you're subscribed to the correct table
- Check if real-time is enabled in Supabase (Settings → API → Realtime is enabled by default)

---

## 🎯 Next Steps

Now that your database is connected:

1. ✅ Add sample data to test
2. ✅ Update one page (like Dashboard) to use real data
3. ✅ Test the queries work
4. ✅ Set up n8n workflow to sync Google Sheets → Supabase
5. ✅ Update remaining pages to use Supabase
6. ✅ Enable real-time updates across the app

**Ready to set up n8n?** Let me know and I'll provide the n8n workflow configuration!
