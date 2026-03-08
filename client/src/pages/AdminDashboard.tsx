import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, Users, UserX, TrendingUp, Activity, Calendar, Eye, Dumbbell, Star, CalendarClock } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  fetchAllCoaches,
  fetchAllClients,
  fetchCheckInsForClients,
  fetchWeeklyCheckInsForClients,
  fetchMeasurementsForClients,
  fetchPhotosForClients,
  fetchCoachClientHistory,
  groupByField,
  calculateCoachMetrics,
  calculateRetentionFromHistory,
  countExpiringPackages,
  calculateWorkoutCompletionRate,
} from "@/lib/admin-utils";
import { getComplianceColor, calculateCompliance, getPackageBadgeColor } from "@/lib/coach-utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

const PACKAGE_COLORS = {
  elite: "hsl(45, 93%, 47%)",
  standard: "hsl(210, 80%, 55%)",
  beginner: "hsl(150, 60%, 45%)",
  none: "hsl(var(--muted-foreground))",
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { setViewedCoachId } = useAuth();

  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ["admin-coaches"],
    queryFn: fetchAllCoaches,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["admin-all-clients"],
    queryFn: fetchAllClients,
  });

  const { data: historyData } = useQuery({
    queryKey: ["admin-coach-client-history"],
    queryFn: fetchCoachClientHistory,
  });

  const clientIds = useMemo(() => (clients || []).map((c: any) => c.id), [clients]);

  const { data: checkInsData } = useQuery({
    queryKey: ["admin-all-checkins", clientIds],
    queryFn: () => fetchCheckInsForClients(clientIds),
    enabled: clientIds.length > 0,
  });

  const { data: weeklyData } = useQuery({
    queryKey: ["admin-all-weekly", clientIds],
    queryFn: () => fetchWeeklyCheckInsForClients(clientIds),
    enabled: clientIds.length > 0,
  });

  const { data: measurementsData } = useQuery({
    queryKey: ["admin-all-measurements", clientIds],
    queryFn: () => fetchMeasurementsForClients(clientIds),
    enabled: clientIds.length > 0,
  });

  const { data: photosData } = useQuery({
    queryKey: ["admin-all-photos", clientIds],
    queryFn: () => fetchPhotosForClients(clientIds),
    enabled: clientIds.length > 0,
  });

  const checkInsByClient = useMemo(() => groupByField(checkInsData || [], "user_id"), [checkInsData]);
  const weeklyByClient = useMemo(() => groupByField(weeklyData || [], "user_id"), [weeklyData]);
  const measurementsByClient = useMemo(() => groupByField(measurementsData || [], "user_id"), [measurementsData]);
  const photosByClient = useMemo(() => groupByField(photosData || [], "user_id"), [photosData]);

  // KPI Stats
  const totalCoaches = coaches?.length || 0;
  const totalClients = clients?.length || 0;
  const assignedClients = (clients || []).filter((c: any) => c.coach_id).length;
  const unassignedClients = totalClients - assignedClients;

  const avgCompliance = useMemo(() => {
    if (!clients || clients.length === 0) return 0;
    const assigned = clients.filter((c: any) => c.coach_id);
    if (assigned.length === 0) return 0;
    const total = assigned.reduce((sum: number, c: any) => {
      return sum + calculateCompliance(checkInsByClient[c.id] || []);
    }, 0);
    return Math.round(total / assigned.length);
  }, [clients, checkInsByClient]);

  const checkInsToday = useMemo(() => {
    if (!checkInsData) return 0;
    const today = new Date().toISOString().split("T")[0];
    return checkInsData.filter((c: any) => c.date === today).length;
  }, [checkInsData]);

  const recentSignups = useMemo(() => {
    if (!clients) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return clients.filter((c: any) => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= thirtyDaysAgo;
    }).length;
  }, [clients]);

  // Platform-wide workout completion rate
  const avgWorkoutRate = useMemo(() => {
    if (!checkInsData || checkInsData.length === 0) return 0;
    const withStatus = checkInsData.filter((c: any) => c.workout_status);
    if (withStatus.length === 0) return 0;
    const nonRest = withStatus.filter((c: any) => c.workout_status !== "rest_day");
    if (nonRest.length === 0) return 0;
    const completed = nonRest.filter(
      (c: any) => c.workout_status === "done" || c.workout_status === "completed" || c.workout_status === "cardio_day"
    );
    return Math.round((completed.length / nonRest.length) * 100);
  }, [checkInsData]);

  // Total expiring packages
  const totalExpiring = useMemo(() => {
    return countExpiringPackages(clients || []);
  }, [clients]);

  // ── Chart Data ──

  // 1. Check-in Activity Trend (last 60 days, grouped by date)
  const checkInTrendData = useMemo(() => {
    if (!checkInsData || checkInsData.length === 0) return [];
    const countByDate: Record<string, number> = {};
    // Generate all dates for the last 60 days
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      countByDate[key] = 0;
    }
    checkInsData.forEach((c: any) => {
      if (c.date && countByDate[c.date] !== undefined) {
        countByDate[c.date]++;
      }
    });
    return Object.entries(countByDate).map(([date, count]) => ({
      date: `${date.slice(5, 7)}/${date.slice(8, 10)}`,
      fullDate: date,
      checkIns: count,
    }));
  }, [checkInsData]);

  // 2. Coach Compliance + Workout Rate Comparison
  const coachComplianceData = useMemo(() => {
    if (!coaches || !clients) return [];
    return coaches
      .map((coach: any) => {
        const metrics = calculateCoachMetrics(
          coach.id, clients, checkInsByClient, weeklyByClient, measurementsByClient, photosByClient
        );
        return {
          name: (coach.full_name || coach.email || "Unknown").split(" ")[0],
          fullName: coach.full_name || coach.email || "Unknown",
          compliance: metrics.avgCompliance,
          workoutRate: metrics.avgWorkoutRate,
          satisfaction: metrics.avgSatisfaction,
          clients: metrics.totalClients,
          attention: metrics.clientsNeedingAttention,
          expiring: metrics.expiringPackages,
          coachId: coach.id,
        };
      })
      .filter((d) => d.clients > 0)
      .sort((a, b) => b.compliance - a.compliance);
  }, [coaches, clients, checkInsByClient, weeklyByClient, measurementsByClient, photosByClient]);

  // 3. Package Distribution (Donut)
  const packageDistData = useMemo(() => {
    const dist = { elite: 0, standard: 0, beginner: 0, none: 0 };
    (clients || []).forEach((c: any) => {
      const pkg = c.package_type;
      if (pkg === "premium" || pkg === "elite") dist.elite++;
      else if (pkg === "intermediate" || pkg === "standard") dist.standard++;
      else if (pkg === "basic" || pkg === "beginner") dist.beginner++;
      else dist.none++;
    });
    const result = [];
    if (dist.elite > 0) result.push({ name: "Elite", value: dist.elite, color: PACKAGE_COLORS.elite });
    if (dist.standard > 0) result.push({ name: "Standard", value: dist.standard, color: PACKAGE_COLORS.standard });
    if (dist.beginner > 0) result.push({ name: "Beginner", value: dist.beginner, color: PACKAGE_COLORS.beginner });
    if (dist.none > 0) result.push({ name: "None", value: dist.none, color: PACKAGE_COLORS.none });
    return result;
  }, [clients]);

  // 4. Client Growth (cumulative signups over time, by month)
  const clientGrowthData = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    const sorted = [...clients]
      .filter((c: any) => c.created_at)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sorted.length === 0) return [];

    // Group by month
    const monthMap: Record<string, number> = {};
    sorted.forEach((c: any) => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    });

    let cumulative = 0;
    return Object.entries(monthMap).map(([month, count]) => {
      cumulative += count;
      const [y, m] = month.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        month: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
        newClients: count,
        total: cumulative,
      };
    });
  }, [clients]);

  // 5. Coach Workload (clients per coach, with retention)
  const coachWorkloadData = useMemo(() => {
    if (!coaches || !clients) return [];
    return coaches
      .map((coach: any) => {
        const coachClients = (clients || []).filter((c: any) => c.coach_id === coach.id);
        const retention = calculateRetentionFromHistory(coach.id, historyData || [], clients || []);
        return {
          name: (coach.full_name || coach.email || "Unknown").split(" ")[0],
          fullName: coach.full_name || coach.email || "Unknown",
          clients: coachClients.length,
          retention: retention.hasData ? retention.rate : null,
          coachId: coach.id,
        };
      })
      .sort((a, b) => b.clients - a.clients);
  }, [coaches, clients, historyData]);

  const handleViewCoach = useCallback((coachId: string) => {
    setViewedCoachId(coachId);
    setLocation("/coach/clients");
  }, [setViewedCoachId, setLocation]);

  const isLoading = coachesLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Coaches</CardTitle>
            <UserCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCoaches}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClients}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unassigned</CardTitle>
            <UserX className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", unassignedClients > 0 && "text-amber-600")}>
              {unassignedClients}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Compliance</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", getComplianceColor(avgCompliance))}>
              {avgCompliance}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">30-day check-in rate</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Check-ins Today</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{checkInsToday}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">New Clients (30d)</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentSignups}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Workout Rate</CardTitle>
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", getComplianceColor(avgWorkoutRate))}>
              {avgWorkoutRate}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">training completion</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expiring</CardTitle>
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", totalExpiring > 0 ? "text-amber-600" : "text-green-600")}>
              {totalExpiring}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">packages in 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Check-in Activity Trend + Package Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-in Activity Trend — 2/3 width */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Check-in Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Daily check-ins across all clients (last 60 days)</p>
          </CardHeader>
          <CardContent>
            {checkInTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={checkInTrendData}>
                  <defs>
                    <linearGradient id="checkInGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "10px" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(checkInTrendData.length / 8)}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "10px" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="checkIns"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#checkInGradient)"
                    name="Check-ins"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No check-in data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Package Distribution Donut — 1/3 width */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Package Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">{totalClients} total clients</p>
          </CardHeader>
          <CardContent>
            {packageDistData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={packageDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {packageDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                  {packageDistData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.name} ({entry.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No package data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Coach Compliance + Coach Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coach Compliance + Workout Rate */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Compliance & Workout Rate</CardTitle>
            <p className="text-xs text-muted-foreground">Check-in compliance vs training completion per coach</p>
          </CardHeader>
          <CardContent>
            {coachComplianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, coachComplianceData.length * 52)}>
                <BarChart data={coachComplianceData} layout="vertical" barGap={2} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "10px" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={70}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "11px" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(label: string) =>
                      coachComplianceData.find((d) => d.name === label)?.fullName || label
                    }
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="compliance"
                    fill="hsl(var(--chart-2))"
                    radius={[0, 4, 4, 0]}
                    name="Compliance"
                    cursor="pointer"
                    onClick={(data) => {
                      if (data?.coachId) handleViewCoach(data.coachId);
                    }}
                  />
                  <Bar
                    dataKey="workoutRate"
                    fill="hsl(var(--chart-4))"
                    radius={[0, 4, 4, 0]}
                    name="Workout Rate"
                    cursor="pointer"
                    onClick={(data) => {
                      if (data?.coachId) handleViewCoach(data.coachId);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No coaches with clients yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach Workload + Retention */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Coach Workload</CardTitle>
            <p className="text-xs text-muted-foreground">Clients per coach with retention rate</p>
          </CardHeader>
          <CardContent>
            {coachWorkloadData.length > 0 ? (
              <div className="space-y-3">
                {coachWorkloadData.map((coach) => (
                  <div
                    key={coach.coachId}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewCoach(coach.coachId)}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {coach.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{coach.fullName}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold">{coach.clients}</span>
                          <span className="text-[10px] text-muted-foreground">clients</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={totalClients > 0 ? (coach.clients / totalClients) * 100 : 0}
                          className="h-1.5 flex-1"
                        />
                        {coach.retention !== null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] shrink-0",
                              coach.retention >= 70
                                ? "bg-green-500/15 text-green-700 border-green-300"
                                : coach.retention >= 40
                                  ? "bg-amber-500/15 text-amber-700 border-amber-300"
                                  : "bg-red-500/15 text-red-700 border-red-300"
                            )}
                          >
                            {coach.retention}% ret.
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No coaches yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Client Growth */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Client Growth</CardTitle>
          <p className="text-xs text-muted-foreground">Cumulative client signups over time</p>
        </CardHeader>
        <CardContent>
          {clientGrowthData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={clientGrowthData}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="newGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "10px" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "10px" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  fill="url(#growthGradient)"
                  name="Total Clients"
                />
                <Area
                  type="monotone"
                  dataKey="newClients"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  fill="url(#newGradient)"
                  name="New Signups"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : clientGrowthData.length === 1 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              Only 1 month of data — chart will appear with more history
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              No client signup data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-3">
        <Button onClick={() => setLocation("/admin/coaches")} variant="outline" className="rounded-xl">
          <UserCheck className="w-4 h-4 mr-2" />
          Coach Performance
        </Button>
        <Button onClick={() => setLocation("/admin/clients")} variant="outline" className="rounded-xl">
          <Users className="w-4 h-4 mr-2" />
          All Clients
        </Button>
      </div>
    </div>
  );
}
