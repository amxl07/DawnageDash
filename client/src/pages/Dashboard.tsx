import { MetricCard } from "@/components/MetricCard";
import { WeightChart } from "@/components/WeightChart";
import { format, startOfWeek } from "date-fns";
import { PerformanceChart } from "@/components/PerformanceChart";
import { NutritionBreakdownChart } from "@/components/NutritionBreakdownChart";
import { WeeklyComparisonChart } from "@/components/WeeklyComparisonChart";

import { ProgressBar } from "@/components/ProgressBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Weight, Flame, Trophy, Zap, Activity, Target, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useAuth } from "@/contexts/AuthContext";
import { VideoDialog } from "@/components/VideoDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, PlayCircle, ExternalLink } from "lucide-react";

export default function Dashboard() {
  const {
    checkIns,
    metrics,
    weightTrend,
    weightChartData,
    performanceChartData,
    nutritionBreakdown,
    isLoading,
  } = useDashboardData();

  const { viewedUserId } = useAuth();
  const { step: onboardingStep, isLoading: onboardingLoading } = useOnboarding();
  const isViewingClient = !!viewedUserId;

  // Calculate weekly comparison data
  const weeklyComparisonData: Array<{
    week: string;
    workouts: number;
    avgNutrition: number;
    avgEnergy: number;
    avgSleep: number;
  }> = [];
  if (checkIns && checkIns.length > 0) {
    const weeksData = new Map();

    checkIns.forEach(checkIn => {
      const date = new Date(checkIn.date);
      // Group by week starting Monday so it persists across months/years correctly
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const weekLabel = `Week of ${format(weekStart, 'MMM d')}`;

      if (!weeksData.has(weekKey)) {
        weeksData.set(weekKey, {
          week: weekLabel,
          workouts: 0,
          nutritionSum: 0,
          energySum: 0,
          sleepSum: 0,
          count: 0,
        });
      }

      const week = weeksData.get(weekKey);
      if (checkIn.workout_status === 'done') week.workouts++;
      week.nutritionSum += checkIn.nutrition_score || 0;
      week.energySum += checkIn.energy_level || 0;
      week.sleepSum += parseFloat(checkIn.sleep_hours || '0');
      week.count++;
    });

    weeksData.forEach(week => {
      weeklyComparisonData.push({
        week: week.week,
        workouts: week.workouts,
        avgNutrition: week.count > 0 ? +(week.nutritionSum / week.count).toFixed(1) : 0,
        avgEnergy: week.count > 0 ? +(week.energySum / week.count).toFixed(1) : 0,
        avgSleep: week.count > 0 ? +(week.sleepSum / week.count).toFixed(1) : 0,
      });
    });
  }

  // Calculate progress metrics
  const totalDaysTracked = checkIns?.length || 0;
  const currentWeek = Math.ceil(totalDaysTracked / 7);
  const last7CheckIns = checkIns?.slice(-7) || [];
  const workoutsThisWeek = last7CheckIns.filter(c => c.workout_status === 'done').length;
  const sleepThisWeek = last7CheckIns.reduce((sum, c) => sum + parseFloat(c.sleep_hours || '0'), 0);
  const avgStepsThisWeek = last7CheckIns.length > 0
    ? Math.round(last7CheckIns.reduce((sum, c) => sum + (c.daily_steps || 0), 0) / last7CheckIns.length)
    : 0;

  if (isLoading || (!isViewingClient && onboardingLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // New Onboarding Flow — skip when coach/admin is viewing a client's dashboard
  if (!isViewingClient && onboardingStep < 3) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 bg-background/50 backdrop-blur-sm">
        <OnboardingFlow />
      </div>
    );
  }

  // Empty state (Post-onboarding but no data)
  if (!checkIns || checkIns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-2xl w-full space-y-6">
          <Card className="p-8 text-center bg-card/50 backdrop-blur border-primary/10 shadow-lg">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome to Dawnage Coaching! 🎉
            </h2>
            <p className="text-muted-foreground mb-4 text-lg">
              You're all set up! Start tracking your fitness journey by adding your first check-in or measurement.
            </p>
          </Card>

          <div className="flex justify-center">
            {/* Resources & Help Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 sm:h-10 gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Resources</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Onboarding & Help</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <div className="w-full cursor-pointer">
                    <VideoDialog videoId="QX3_LQxnMXI" title="Dawnage Introduction">
                      <div className="flex items-center w-full">
                        <PlayCircle className="w-4 h-4 mr-2 text-primary" />
                        <span>Watch Intro</span>
                      </div>
                    </VideoDialog>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                  <div className="w-full cursor-pointer">
                    <VideoDialog videoId="zmyQxmksUuc" title="How It Works">
                      <div className="flex items-center w-full">
                        <PlayCircle className="w-4 h-4 mr-2 text-primary" />
                        <span>How It Works</span>
                      </div>
                    </VideoDialog>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => {
                  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "918075054992";
                  const message = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || "Hi! I want to activate my Dawnage AI fitness assistant.";
                  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, "_blank");
                }}>
                  <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                  <span>Activate WhatsApp AI</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 sm:mb-2" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Comprehensive insights into your fitness journey</p>
        </div>
        <div className="flex flex-row md:flex-col gap-3 items-center md:items-end flex-wrap">
          <Badge className="rounded-full text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
            <Activity className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Day {totalDaysTracked} • Week {currentWeek}
          </Badge>
          {/* Resources & Help Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 sm:h-10 gap-2">
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Resources</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Onboarding & Help</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                <div className="w-full cursor-pointer">
                  <VideoDialog videoId="QX3_LQxnMXI" title="Dawnage Introduction">
                    <div className="flex items-center w-full">
                      <PlayCircle className="w-4 h-4 mr-2 text-primary" />
                      <span>Watch Intro</span>
                    </div>
                  </VideoDialog>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                <div className="w-full cursor-pointer">
                  <VideoDialog videoId="zmyQxmksUuc" title="How It Works">
                    <div className="flex items-center w-full">
                      <PlayCircle className="w-4 h-4 mr-2 text-primary" />
                      <span>How It Works</span>
                    </div>
                  </VideoDialog>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => {
                const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "918075054992";
                const message = import.meta.env.VITE_WHATSAPP_DEFAULT_MESSAGE || "Hi! I want to activate my Dawnage AI fitness assistant.";
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, "_blank");
              }}>
                <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                <span>Activate WhatsApp AI</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard
          title="Weight"
          value={`${metrics.currentWeight} kg`}
          icon={Weight}
          trend={weightTrend !== 0 ? { value: Math.round(Math.abs(weightTrend)), isPositive: weightTrend < 0 } : undefined}
          subtitle="Last 7 days"
        />
        <MetricCard
          title="Workouts"
          value={metrics.totalWorkouts.toString()}
          icon={Flame}
          subtitle="Total tracked"
        />
        <MetricCard
          title="Nutrition"
          value={metrics.avgNutritionScore}
          icon={Trophy}
          subtitle="Avg score"
        />
        <MetricCard
          title="Energy"
          value={`${metrics.avgEnergyLevel}/10`}
          icon={Zap}
          subtitle="Avg level"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeightChart data={weightChartData} />
        <PerformanceChart data={performanceChartData} />
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NutritionBreakdownChart
          protein={nutritionBreakdown.protein}
          carbs={nutritionBreakdown.carbs}
          fats={nutritionBreakdown.fats}
        />
        {weeklyComparisonData.length > 0 && <WeeklyComparisonChart data={weeklyComparisonData} />}
      </div>

      <Card className="p-6 rounded-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">Current Week Progress</h3>
            <Badge variant="outline" className="rounded-full">
              <Target className="w-4 h-4 mr-2" />
              {last7CheckIns.length}/7 days tracked
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Track your goals and stay on target this week</p>
        </div>
        <div className="space-y-6">
          <ProgressBar
            value={avgStepsThisWeek}
            max={10000}
            label="Daily Steps Goal (Avg)"
            variant="success"
          />
          <ProgressBar
            value={parseFloat(metrics.avgNutritionScore)}
            max={10}
            label="Nutrition Score"
            variant="gold"
          />
          <ProgressBar
            value={workoutsThisWeek}
            max={6}
            label="Workouts This Week"
            variant="primary"
          />
          <ProgressBar
            value={sleepThisWeek}
            max={56}
            label="Sleep Hours (Weekly)"
            variant="success"
          />
        </div>
      </Card>
    </div>
  );
}
