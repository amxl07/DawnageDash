import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserCheck, Users, AlertTriangle, TrendingUp, Search, ChevronUp, ChevronDown, ShieldCheck, Eye, Dumbbell, Star, CalendarClock, LayoutTemplate } from "lucide-react";
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
} from "@/lib/admin-utils";
import { getComplianceColor, getPackageBadgeColor } from "@/lib/coach-utils";
import { formatDisplayDate } from "@/lib/date-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

type SortField = "name" | "clients" | "compliance" | "retention" | "attention" | "needsAttention" | "workoutRate" | "satisfaction" | "expiring";
type SortDirection = "asc" | "desc";

export default function AdminCoachesPage() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("clients");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { setViewedCoachId } = useAuth();
  const [, setLocation] = useLocation();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleViewCoach = useCallback((coachId: string) => {
    setViewedCoachId(coachId);
    setLocation("/coach/clients");
  }, [setViewedCoachId, setLocation]);

  const handleToggleTemplatePermission = useCallback(async (coachId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ can_edit_global_templates: !currentValue })
        .eq('id', coachId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-coaches'] });
      toast({ title: !currentValue ? "Permission Granted" : "Permission Revoked", description: `Coach can ${!currentValue ? 'now' : 'no longer'} edit global templates.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [queryClient, toast]);

  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ["admin-coaches"],
    queryFn: fetchAllCoaches,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["admin-all-clients"],
    queryFn: fetchAllClients,
  });

  // Fetch coach_client_history for retention calculation
  const { data: historyData } = useQuery({
    queryKey: ["admin-coach-client-history"],
    queryFn: fetchCoachClientHistory,
  });

  const clientIds = useMemo(
    () => (clients || []).map((c: any) => c.id),
    [clients]
  );

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

  // Calculate metrics per coach (including retention from history)
  const coachMetrics = useMemo(() => {
    if (!coaches || !clients) return [];
    return coaches.map((coach: any) => {
      const metrics = calculateCoachMetrics(
        coach.id,
        clients || [],
        checkInsByClient,
        weeklyByClient,
        measurementsByClient,
        photosByClient
      );
      const retention = calculateRetentionFromHistory(
        coach.id,
        historyData || [],
        clients || []
      );
      return { coach, metrics, retention };
    });
  }, [coaches, clients, checkInsByClient, weeklyByClient, measurementsByClient, photosByClient, historyData]);

  // Chart data: Compliance vs Retention per coach
  const complianceRetentionData = useMemo(() => {
    return coachMetrics
      .filter((cm) => cm.metrics.totalClients > 0)
      .map((cm) => ({
        name: (cm.coach.full_name || cm.coach.email || "Unknown").split(" ")[0],
        fullName: cm.coach.full_name || cm.coach.email || "Unknown",
        compliance: cm.metrics.avgCompliance,
        retention: cm.retention.hasData ? cm.retention.rate : 0,
        hasRetention: cm.retention.hasData,
        coachId: cm.coach.id,
      }))
      .sort((a, b) => b.compliance - a.compliance);
  }, [coachMetrics]);

  // Chart data: Attention distribution across all coaches
  const attentionDistData = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    coachMetrics.forEach((cm) => {
      if (cm.metrics.totalClients === 0) return;
      if (cm.metrics.avgAttentionLevel === "high") high++;
      else if (cm.metrics.avgAttentionLevel === "medium") medium++;
      else low++;
    });
    const result = [];
    if (low > 0) result.push({ name: "Low (Good)", value: low, color: "hsl(150, 60%, 45%)" });
    if (medium > 0) result.push({ name: "Medium", value: medium, color: "hsl(44, 94%, 50%)" });
    if (high > 0) result.push({ name: "High (Urgent)", value: high, color: "hsl(4, 89%, 55%)" });
    return result;
  }, [coachMetrics]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return coachMetrics;
    const q = search.toLowerCase();
    return coachMetrics.filter(
      (cm) =>
        cm.coach.full_name?.toLowerCase().includes(q) ||
        cm.coach.email?.toLowerCase().includes(q)
    );
  }, [coachMetrics, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortField) {
        case "name":
          aVal = a.coach.full_name || a.coach.email || "";
          bVal = b.coach.full_name || b.coach.email || "";
          return sortDirection === "asc"
            ? (aVal as string).localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal as string);
        case "clients":
          aVal = a.metrics.totalClients;
          bVal = b.metrics.totalClients;
          break;
        case "compliance":
          aVal = a.metrics.avgCompliance;
          bVal = b.metrics.avgCompliance;
          break;
        case "retention":
          aVal = a.retention.hasData ? a.retention.rate : -1;
          bVal = b.retention.hasData ? b.retention.rate : -1;
          break;
        case "attention":
          aVal = a.metrics.avgAttentionScore;
          bVal = b.metrics.avgAttentionScore;
          break;
        case "needsAttention":
          aVal = a.metrics.clientsNeedingAttention;
          bVal = b.metrics.clientsNeedingAttention;
          break;
        case "workoutRate":
          aVal = a.metrics.avgWorkoutRate;
          bVal = b.metrics.avgWorkoutRate;
          break;
        case "satisfaction":
          aVal = a.metrics.avgSatisfaction ?? -1;
          bVal = b.metrics.avgSatisfaction ?? -1;
          break;
        case "expiring":
          aVal = a.metrics.expiringPackages;
          bVal = b.metrics.expiringPackages;
          break;
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filtered, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  // Summary stats
  const coachesWithClients = coachMetrics.filter((cm) => cm.metrics.totalClients > 0);
  const totalCoaches = coaches?.length || 0;
  const totalClients = clients?.length || 0;
  const unassignedClients = (clients || []).filter((c: any) => !c.coach_id).length;
  const avgPlatformCompliance = coachesWithClients.length > 0
    ? Math.round(coachesWithClients.reduce((sum, cm) => sum + cm.metrics.avgCompliance, 0) / coachesWithClients.length)
    : 0;
  const totalNeedingAttention = coachMetrics.reduce((sum, cm) => sum + cm.metrics.clientsNeedingAttention, 0);
  const totalExpiring = coachMetrics.reduce((sum, cm) => sum + cm.metrics.expiringPackages, 0);

  // Platform-wide workout rate
  const coachesWithWorkoutData = coachMetrics.filter((cm) => cm.metrics.totalClients > 0 && cm.metrics.avgWorkoutRate > 0);
  const avgPlatformWorkoutRate = coachesWithWorkoutData.length > 0
    ? Math.round(coachesWithWorkoutData.reduce((sum, cm) => sum + cm.metrics.avgWorkoutRate, 0) / coachesWithWorkoutData.length)
    : 0;

  // Platform-wide satisfaction
  const coachesWithSatisfaction = coachMetrics.filter((cm) => cm.metrics.avgSatisfaction !== null);
  const avgPlatformSatisfaction = coachesWithSatisfaction.length > 0
    ? Math.round(coachesWithSatisfaction.reduce((sum, cm) => sum + (cm.metrics.avgSatisfaction || 0), 0) / coachesWithSatisfaction.length)
    : null;

  // Platform-wide retention from history
  const hasAnyHistory = (historyData || []).length > 0;
  const coachesWithHistory = coachMetrics.filter((cm) => cm.retention.hasData);
  const avgPlatformRetention = coachesWithHistory.length > 0
    ? Math.round(coachesWithHistory.reduce((sum, cm) => sum + Math.min(100, cm.retention.rate), 0) / coachesWithHistory.length)
    : 0;

  const isLoading = coachesLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading coaches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Coach Performance</h1>
        <p className="text-muted-foreground mt-1">
          Monitor all coaches and their client management metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coaches</CardTitle>
            <UserCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCoaches}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClients}</div>
            {unassignedClients > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{unassignedClients} unassigned</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Compliance</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", getComplianceColor(avgPlatformCompliance))}>
              {avgPlatformCompliance}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">30-day check-in rate</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retention</CardTitle>
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {hasAnyHistory ? (
              <>
                <div className={cn("text-3xl font-bold", getComplianceColor(avgPlatformRetention))}>
                  {avgPlatformRetention}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">clients retained</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-muted-foreground">--</div>
                <p className="text-xs text-muted-foreground mt-1">Tracking starts now</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Attention</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", totalNeedingAttention > 0 ? "text-red-500" : "text-green-600")}>
              {totalNeedingAttention}
            </div>
            <p className="text-xs text-muted-foreground mt-1">clients across all coaches</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workout Rate</CardTitle>
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", getComplianceColor(avgPlatformWorkoutRate))}>
              {avgPlatformWorkoutRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">training completion</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfaction</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {avgPlatformSatisfaction !== null ? (
              <>
                <div className={cn("text-3xl font-bold", getComplianceColor(avgPlatformSatisfaction))}>
                  {avgPlatformSatisfaction}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">from weekly feedback</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-muted-foreground">--</div>
                <p className="text-xs text-muted-foreground mt-1">No feedback yet</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring</CardTitle>
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", totalExpiring > 0 ? "text-amber-600" : "text-green-600")}>
              {totalExpiring}
            </div>
            <p className="text-xs text-muted-foreground mt-1">within 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {complianceRetentionData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compliance vs Retention */}
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Compliance vs Retention</CardTitle>
              <p className="text-xs text-muted-foreground">Side-by-side comparison per coach</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={complianceRetentionData} barGap={2} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "11px" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "10px" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    contentStyle={chartTooltipStyle}
                    labelFormatter={(label: string) =>
                      complianceRetentionData.find((d) => d.name === label)?.fullName || label
                    }
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="compliance" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Compliance" />
                  <Bar dataKey="retention" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Retention" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Attention Distribution */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Attention Levels</CardTitle>
              <p className="text-xs text-muted-foreground">Coach attention level distribution</p>
            </CardHeader>
            <CardContent>
              {attentionDistData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={attentionDistData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {attentionDistData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {attentionDistData.map((entry) => (
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
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  No coaches with clients
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search coaches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Coaches Table */}
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Coach <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer select-none"
                onClick={() => handleSort("clients")}
              >
                <div className="flex items-center justify-center gap-1">
                  Clients <SortIcon field="clients" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("compliance")}
              >
                <div className="flex items-center gap-1">
                  Avg Compliance <SortIcon field="compliance" />
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("retention")}
              >
                <div className="flex items-center gap-1">
                  Retention <SortIcon field="retention" />
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("needsAttention")}
              >
                <div className="flex items-center gap-1">
                  Needs Attention <SortIcon field="needsAttention" />
                </div>
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer select-none"
                onClick={() => handleSort("attention")}
              >
                <div className="flex items-center gap-1">
                  Attention Level <SortIcon field="attention" />
                </div>
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer select-none"
                onClick={() => handleSort("workoutRate")}
              >
                <div className="flex items-center gap-1">
                  Workout Rate <SortIcon field="workoutRate" />
                </div>
              </TableHead>
              <TableHead
                className="hidden lg:table-cell cursor-pointer select-none"
                onClick={() => handleSort("satisfaction")}
              >
                <div className="flex items-center gap-1">
                  Satisfaction <SortIcon field="satisfaction" />
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("expiring")}
              >
                <div className="flex items-center gap-1">
                  Expiring <SortIcon field="expiring" />
                </div>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Packages</TableHead>
              <TableHead className="hidden xl:table-cell">Last Activity</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                  {search ? `No coaches match "${search}"` : "No coaches found"}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(({ coach, metrics, retention }) => (
                <TableRow
                  key={coach.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewCoach(coach.id)}
                >
                  {/* Coach Info */}
                  <TableCell>
                    <div>
                      <p className="font-medium">{coach.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{coach.email}</p>
                    </div>
                  </TableCell>

                  {/* Total Clients */}
                  <TableCell className="text-center">
                    <span className="text-lg font-semibold">{metrics.totalClients}</span>
                  </TableCell>

                  {/* Avg Compliance with progress bar */}
                  <TableCell>
                    {metrics.totalClients > 0 ? (
                      <div className="flex items-center gap-2.5 min-w-[120px]">
                        <Progress value={metrics.avgCompliance} className="h-2 flex-1" />
                        <span className={cn("text-sm font-semibold w-10 text-right", getComplianceColor(metrics.avgCompliance))}>
                          {metrics.avgCompliance}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Retention */}
                  <TableCell className="hidden md:table-cell">
                    {retention.hasData ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn("text-sm font-semibold cursor-default", getComplianceColor(retention.rate))}>
                            {retention.rate}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-0.5">
                            <p>{retention.currentlyAssigned} current / {retention.totalEverAssigned} ever assigned</p>
                            {retention.lost > 0 && <p>{retention.lost} client{retention.lost > 1 ? "s" : ""} lost</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground text-sm cursor-default">--</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">No history yet. Tracking starts on next claim/unassign.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Clients Needing Attention */}
                  <TableCell className="hidden md:table-cell">
                    {metrics.totalClients > 0 ? (
                      metrics.clientsNeedingAttention > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-red-500/15 text-red-700 border-red-300"
                        >
                          {metrics.clientsNeedingAttention} client{metrics.clientsNeedingAttention > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-500/15 text-green-700 border-green-300"
                        >
                          All good
                        </Badge>
                      )
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Avg Attention Level */}
                  <TableCell className="hidden lg:table-cell">
                    {metrics.totalClients > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold cursor-default capitalize",
                              metrics.avgAttentionLevel === "high" && "bg-red-500/15 text-red-700 border-red-300",
                              metrics.avgAttentionLevel === "medium" && "bg-amber-500/15 text-amber-700 border-amber-300",
                              metrics.avgAttentionLevel === "low" && "bg-green-500/15 text-green-700 border-green-300"
                            )}
                          >
                            {metrics.avgAttentionLevel}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Score: {metrics.avgAttentionScore} (lower is better)</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Workout Completion Rate */}
                  <TableCell className="hidden lg:table-cell">
                    {metrics.totalClients > 0 && metrics.avgWorkoutRate > 0 ? (
                      <div className="flex items-center gap-2.5 min-w-[100px]">
                        <Progress value={metrics.avgWorkoutRate} className="h-2 flex-1" />
                        <span className={cn("text-sm font-semibold w-10 text-right", getComplianceColor(metrics.avgWorkoutRate))}>
                          {metrics.avgWorkoutRate}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Client Satisfaction */}
                  <TableCell className="hidden lg:table-cell">
                    {metrics.avgSatisfaction !== null ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold cursor-default",
                              metrics.avgSatisfaction >= 75 && "bg-green-500/15 text-green-700 border-green-300",
                              metrics.avgSatisfaction >= 40 && metrics.avgSatisfaction < 75 && "bg-amber-500/15 text-amber-700 border-amber-300",
                              metrics.avgSatisfaction < 40 && "bg-red-500/15 text-red-700 border-red-300"
                            )}
                          >
                            {metrics.avgSatisfaction}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">From weekly feedback (training progress, nutrition, enjoyment)</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Expiring Packages */}
                  <TableCell className="hidden md:table-cell">
                    {metrics.totalClients > 0 ? (
                      metrics.expiringPackages > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-500/15 text-amber-700 border-amber-300 cursor-default"
                            >
                              {metrics.expiringPackages}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{metrics.expiringPackages} client{metrics.expiringPackages > 1 ? "s" : ""} expiring within 30 days</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Package Breakdown */}
                  <TableCell className="hidden lg:table-cell">
                    {metrics.totalClients > 0 ? (
                      <div className="flex items-center gap-1">
                        {metrics.activePackages.elite > 0 && (
                          <Badge variant="outline" className={cn("text-[10px]", getPackageBadgeColor("elite"))}>
                            Elite: {metrics.activePackages.elite}
                          </Badge>
                        )}
                        {metrics.activePackages.standard > 0 && (
                          <Badge variant="outline" className={cn("text-[10px]", getPackageBadgeColor("standard"))}>
                            Std: {metrics.activePackages.standard}
                          </Badge>
                        )}
                        {metrics.activePackages.beginner > 0 && (
                          <Badge variant="outline" className={cn("text-[10px]", getPackageBadgeColor("beginner"))}>
                            Basic: {metrics.activePackages.beginner}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Last Activity */}
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {metrics.lastClientCheckIn
                        ? formatDisplayDate(metrics.lastClientCheckIn)
                        : "No activity"}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 rounded-full", coach.can_edit_global_templates && "text-primary")}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTemplatePermission(coach.id, !!coach.can_edit_global_templates);
                            }}
                          >
                            <LayoutTemplate className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {coach.can_edit_global_templates ? 'Can edit global templates (click to revoke)' : 'Cannot edit global templates (click to grant)'}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCoach(coach.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View coach's dashboard</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
