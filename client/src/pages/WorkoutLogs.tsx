import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar, Dumbbell, Clock, TrendingUp, Flame, Target, Award, CheckCircle2, Loader2, ChevronDown, ChevronUp, Plus, CalendarRange } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MetricCard } from "@/components/MetricCard";
import { WorkoutLogDialog } from "@/components/WorkoutLogDialog";
import { startOfWeek, endOfWeek, format, parseISO, isSameWeek } from "date-fns";
import { cn } from "@/lib/utils";

export default function WorkoutLogs() {
    const { user, viewedUserId } = useAuth();
    const targetUserId = viewedUserId || user?.id;
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

    const { data: logs, isLoading } = useQuery({
        queryKey: ['workoutLogs', targetUserId],
        queryFn: async () => {
            if (!targetUserId) return [];

            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('user_id', targetUserId)
                .order('date', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!targetUserId,
    });

    // Group logs by week
    const weeklyLogs = useMemo(() => {
        if (!logs) return [];

        const groups = new Map<string, typeof logs>();

        logs.forEach(log => {
            const date = parseISO(log.date);
            // Get Monday of the week
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const key = format(weekStart, 'yyyy-MM-dd');

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)?.push(log);
        });

        // Convert to array and sort by date descending
        return Array.from(groups.entries())
            .map(([weekStartStr, weekLogs]) => {
                const weekStart = parseISO(weekStartStr);
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                return {
                    weekStart,
                    weekEnd,
                    logs: weekLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                };
            })
            .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
    }, [logs]);

    const calculateStats = (logs: any[]) => {
        const totalWorkouts = logs.length;
        const last7Days = logs.filter(log => {
            const logDate = new Date(log.date);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - logDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
        });

        const totalExercises = logs.reduce((acc, log) => {
            try {
                const content = JSON.parse(log.content);
                return acc + (Array.isArray(content) ? content.length : 0);
            } catch {
                return acc;
            }
        }, 0);

        return {
            totalWorkouts,
            last7Days: last7Days.length,
            avgPerWeek: totalWorkouts > 0 ? (totalWorkouts / Math.max(Math.ceil((new Date().getTime() - new Date(logs[logs.length - 1]?.date).getTime()) / (1000 * 60 * 60 * 24 * 7)), 1)).toFixed(1) : '0',
            totalExercises,
        };
    };

    const renderExerciseContent = (content: any) => {
        if (!content) return null;

        let parsedContent;
        try {
            parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        } catch (e) {
            return <p className="text-muted-foreground whitespace-pre-wrap">{content}</p>;
        }

        if (Array.isArray(parsedContent)) {
            return (
                <div className="space-y-3">
                    {parsedContent.map((exercise, idx) => {
                        // Handle simple string format or old object format
                        if (typeof exercise !== 'object') {
                            return <div key={idx} className="text-sm">{String(exercise)}</div>;
                        }

                        // Handle new structured format with multiple sets
                        const isNewFormat = Array.isArray(exercise.sets);

                        const exerciseName = exercise.Exercise || exercise.exercise || exercise.name || `Exercise ${idx + 1}`;

                        // For old format
                        const sets = exercise.Sets || exercise.sets;
                        const reps = exercise.Reps || exercise.reps;
                        const weight = exercise.Weight || exercise.weight;
                        const duration = exercise.Duration || exercise.duration;
                        const rest = exercise.Rest || exercise.rest;

                        return (
                            <div key={idx} className="group relative bg-gradient-to-br from-muted/40 to-muted/20 hover:from-primary/5 hover:to-primary/10 p-4 rounded-xl transition-all duration-200 border border-border/50 hover:border-primary/20">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base">{exerciseName}</h4>
                                            {duration && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {duration}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Done
                                    </Badge>
                                </div>

                                {isNewFormat ? (
                                    // Render table for new format
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-center">
                                            <thead>
                                                <tr className="text-xs text-muted-foreground border-b border-border/30">
                                                    <th className="py-1 font-medium">Set</th>
                                                    <th className="py-1 font-medium">Weight</th>
                                                    <th className="py-1 font-medium">Reps</th>
                                                    <th className="py-1 font-medium">RPE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exercise.sets.map((set: any, sIdx: number) => (
                                                    <tr key={sIdx} className="border-b border-border/10 last:border-0 hover:bg-muted/30">
                                                        <td className="py-1.5 font-bold text-muted-foreground">{set.setNumber}</td>
                                                        <td className="py-1.5 text-primary font-medium">{set.weight ? `${set.weight}` : '-'}</td>
                                                        <td className="py-1.5 font-medium">{set.reps || '-'}</td>
                                                        <td className="py-1.5 text-muted-foreground">{set.rpe || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    // Old format grid
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {sets && (
                                            <div className="bg-background/60 rounded-lg p-2.5 text-center border border-border/30">
                                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Sets</p>
                                                <p className="text-lg font-bold text-foreground">{sets}</p>
                                            </div>
                                        )}
                                        {reps && (
                                            <div className="bg-background/60 rounded-lg p-2.5 text-center border border-border/30">
                                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Reps</p>
                                                <p className="text-lg font-bold text-foreground">{reps}</p>
                                            </div>
                                        )}
                                        {weight && (
                                            <div className="bg-background/60 rounded-lg p-2.5 text-center border border-border/30">
                                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Weight</p>
                                                <p className="text-lg font-bold text-primary">{weight}</p>
                                            </div>
                                        )}
                                        {rest && (
                                            <div className="bg-background/60 rounded-lg p-2.5 text-center border border-border/30">
                                                <p className="text-xs font-medium text-muted-foreground mb-0.5">Rest</p>
                                                <p className="text-lg font-bold text-foreground">{rest}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(parsedContent, null, 2)}</pre>;
    };

    const stats = logs ? calculateStats(logs) : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading workout history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Workout Logs
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground">Your complete training journey and performance history</p>
                </div>

                <div className="flex items-center gap-2">
                    {logs && logs.length > 0 && (
                        <Badge variant="outline" className="hidden sm:flex h-10 px-4 text-base mr-2">
                            <Flame className="w-4 h-4 mr-2 text-orange-500" />
                            {stats?.last7Days} workouts this week
                        </Badge>
                    )}

                    {!viewedUserId && (
                        <Button className="rounded-xl shadow-lg hover:shadow-primary/20" onClick={() => setIsLogDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Log Workout
                        </Button>
                    )}
                </div>
            </div>

            {logs && logs.length > 0 && stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Workouts"
                        value={stats.totalWorkouts.toString()}
                        icon={Dumbbell}
                        subtitle="All time"
                    />
                    <MetricCard
                        title="This Week"
                        value={stats.last7Days.toString()}
                        icon={TrendingUp}
                        subtitle="Last 7 days"
                    />
                    <MetricCard
                        title="Avg Per Week"
                        value={stats.avgPerWeek}
                        icon={Target}
                        subtitle="Training frequency"
                    />
                    <MetricCard
                        title="Total Exercises"
                        value={stats.totalExercises.toString()}
                        icon={Award}
                        subtitle="Exercises logged"
                    />
                </div>
            )}

            {!logs || logs.length === 0 ? (
                <Card className="p-16 text-center border-dashed border-2">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Dumbbell className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">No Logs Found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Your workout history will appear here once you start logging. Track your progress and watch your gains grow!
                    </p>
                    {!viewedUserId && (
                        <Button onClick={() => setIsLogDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Log First Workout
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-6">
                    <Accordion
                        type="multiple"
                        className="space-y-4"
                        defaultValue={weeklyLogs.length > 0 ? [format(weeklyLogs[0].weekStart, 'yyyy-MM-dd')] : undefined}
                    >
                        {weeklyLogs.map(({ weekStart, weekEnd, logs }, weekIndex) => {
                            const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
                            const isCurrentWeek = isSameWeek(new Date(), weekStart, { weekStartsOn: 1 });
                            const uniqueKey = format(weekStart, 'yyyy-MM-dd');

                            return (
                                <AccordionItem key={uniqueKey} value={uniqueKey} className="border-0">
                                    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                        <AccordionTrigger className="px-6 py-5 hover:no-underline bg-muted/5 hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                    isCurrentWeek ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                                )}>
                                                    <CalendarRange className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold flex items-center gap-2">
                                                        {weekLabel}
                                                        {isCurrentWeek && (
                                                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                                Current Week
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground font-medium">
                                                        {logs.length} Workout{logs.length !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-2">
                                            <div className="grid grid-cols-1 gap-6 mt-4">
                                                {logs.map((log, index) => {
                                                    const isExpanded = expandedLogId === log.id;
                                                    const logDate = new Date(log.date);

                                                    let exerciseCount = 0;
                                                    try {
                                                        const content = JSON.parse(log.content);
                                                        exerciseCount = Array.isArray(content) ? content.length : 0;
                                                    } catch { }

                                                    return (
                                                        <Card key={log.id} className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : ''} hover:shadow-lg border-muted`}>
                                                            <div className="relative border-b bg-gradient-to-br from-muted/30 to-background p-6">
                                                                <div className="flex items-start gap-6">
                                                                    <div className="relative">
                                                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex flex-col items-center justify-center text-white shadow-lg">
                                                                            <span className="text-2xl font-bold leading-none">{logDate.getDate()}</span>
                                                                            <span className="text-[10px] uppercase font-medium opacity-90 leading-none mt-0.5">
                                                                                {logDate.toLocaleDateString('en-US', { month: 'short' })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center border-2 border-background">
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <h3 className="font-bold text-2xl mb-2">{log.title}</h3>
                                                                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Calendar className="w-4 h-4" />
                                                                                {logDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                                            </div>
                                                                            {exerciseCount > 0 && (
                                                                                <>
                                                                                    <span className="text-muted-foreground/40">•</span>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <Dumbbell className="w-4 h-4" />
                                                                                        {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                                        className="rounded-xl"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <>
                                                                                <ChevronUp className="w-4 h-4 mr-2" />
                                                                                Collapse
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown className="w-4 h-4 mr-2" />
                                                                                View Details
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="p-6 bg-gradient-to-br from-background to-muted/10">
                                                                    {renderExerciseContent(log.content)}
                                                                </div>
                                                            )}
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </div>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </div>
            )}

            <WorkoutLogDialog
                open={isLogDialogOpen}
                onOpenChange={setIsLogDialogOpen}
            />
        </div>
    );
}
