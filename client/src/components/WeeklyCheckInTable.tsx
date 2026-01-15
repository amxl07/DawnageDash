import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus } from "lucide-react";
import { ProcessedCheckIn } from "@/lib/checkin-utils";

interface WeekData {
    weekNumber: number;
    days: ProcessedCheckIn[];
    averages: {
        weight: number | null;
        calories: number | null;
        nutritionScore: number | null;
        workoutsDone: number;
        totalWorkouts: number;
        steps: number | null;
        sleep: number | null;
        stress: number | null;
        energy: number | null;
        hunger: number | null;
        water: number | null;
        performance: number | null;
    };
}

interface WeeklyCheckInTableProps {
    checkIns: ProcessedCheckIn[];
    onEdit?: (date: Date) => void;
}

function groupCheckInsByWeek(checkIns: ProcessedCheckIn[]): WeekData[] {
    if (!checkIns || checkIns.length === 0) return [];

    // Sort by day number ascending
    const sorted = [...checkIns].sort((a, b) => a.dayNumber - b.dayNumber);

    const weeks: WeekData[] = [];

    for (let i = 0; i < sorted.length; i += 7) {
        const weekDays = sorted.slice(i, i + 7);
        const weekNumber = Math.floor(i / 7) + 1;

        // Calculate averages
        let weightSum = 0, weightCount = 0;
        let caloriesSum = 0, caloriesCount = 0;
        let nutritionSum = 0, nutritionCount = 0;
        let stepsSum = 0, stepsCount = 0;
        let sleepSum = 0, sleepCount = 0;
        let stressSum = 0, stressCount = 0;
        let energySum = 0, energyCount = 0;
        let hungerSum = 0, hungerCount = 0;
        let waterSum = 0, waterCount = 0;
        let performanceSum = 0, performanceCount = 0;
        let workoutsDone = 0, totalWorkouts = 0;

        weekDays.forEach(day => {
            if (day.status === 'done' && day.originalCheckIn) {
                const c = day.originalCheckIn;

                if (c.morning_weight) {
                    const w = parseFloat(c.morning_weight.toString());
                    if (!isNaN(w) && w > 0) { weightSum += w; weightCount++; }
                }
                if (c.calorie_intake) { caloriesSum += c.calorie_intake; caloriesCount++; }
                if (c.nutrition_score) { nutritionSum += c.nutrition_score; nutritionCount++; }
                if (c.daily_steps) { stepsSum += c.daily_steps; stepsCount++; }
                if (c.sleep_hours) {
                    const s = parseFloat(c.sleep_hours.toString());
                    if (!isNaN(s)) { sleepSum += s; sleepCount++; }
                }
                if (c.stress_level) { stressSum += c.stress_level; stressCount++; }
                if (c.energy_level) { energySum += c.energy_level; energyCount++; }
                if (c.hunger_level) { hungerSum += c.hunger_level; hungerCount++; }
                if (c.water_liters) {
                    const wl = parseFloat(c.water_liters.toString());
                    if (!isNaN(wl)) { waterSum += wl; waterCount++; }
                }
                if (c.workout_performance) { performanceSum += c.workout_performance; performanceCount++; }

                const status = (c.workout_status || '').toLowerCase().trim();
                if (status === 'done' || status === 'completed' || status === 'yes') {
                    workoutsDone++;
                    totalWorkouts++;
                } else if (status !== 'rest_day' && status !== 'rest') {
                    totalWorkouts++;
                }
            }
        });

        weeks.push({
            weekNumber,
            days: weekDays,
            averages: {
                weight: weightCount > 0 ? parseFloat((weightSum / weightCount).toFixed(1)) : null,
                calories: caloriesCount > 0 ? Math.round(caloriesSum / caloriesCount) : null,
                nutritionScore: nutritionCount > 0 ? parseFloat((nutritionSum / nutritionCount).toFixed(1)) : null,
                workoutsDone,
                totalWorkouts,
                steps: stepsCount > 0 ? Math.round(stepsSum / stepsCount) : null,
                sleep: sleepCount > 0 ? parseFloat((sleepSum / sleepCount).toFixed(1)) : null,
                stress: stressCount > 0 ? parseFloat((stressSum / stressCount).toFixed(1)) : null,
                energy: energyCount > 0 ? parseFloat((energySum / energyCount).toFixed(1)) : null,
                hunger: hungerCount > 0 ? parseFloat((hungerSum / hungerCount).toFixed(1)) : null,
                water: waterCount > 0 ? parseFloat((waterSum / waterCount).toFixed(1)) : null,
                performance: performanceCount > 0 ? parseFloat((performanceSum / performanceCount).toFixed(1)) : null,
            }
        });
    }

    // Return oldest weeks first (Week 1 at top)
    return weeks;
}

function WorkoutCell({ status }: { status: string | null | undefined }) {
    const normalizedStatus = (status || '').toLowerCase().trim();

    if (normalizedStatus === 'done' || normalizedStatus === 'completed' || normalizedStatus === 'yes') {
        return (
            <Badge variant="default" className="bg-success text-white px-2 py-0.5 text-xs">
                <Check className="w-3 h-3 mr-1" /> Yes
            </Badge>
        );
    }
    if (normalizedStatus === 'rest_day' || normalizedStatus === 'rest') {
        return (
            <Badge variant="outline" className="text-muted-foreground px-2 py-0.5 text-xs">
                Rest
            </Badge>
        );
    }
    if (normalizedStatus === 'cardio_day' || normalizedStatus === 'cardio') {
        return (
            <Badge variant="secondary" className="bg-gold/20 text-gold px-2 py-0.5 text-xs">
                Cardio
            </Badge>
        );
    }
    if (normalizedStatus === 'no' || normalizedStatus === 'missed') {
        return (
            <Badge variant="destructive" className="px-2 py-0.5 text-xs">
                <X className="w-3 h-3 mr-1" /> No
            </Badge>
        );
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function ScoreCell({ value, showOutOf10 = true }: { value: number | null | undefined; showOutOf10?: boolean }) {
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground">—</span>;
    }

    let colorClass = 'text-muted-foreground';
    if (value >= 8) colorClass = 'text-success';
    else if (value >= 6) colorClass = 'text-gold';
    else if (value >= 4) colorClass = 'text-orange-400';
    else colorClass = 'text-primary';

    return (
        <span className={`font-semibold ${colorClass}`}>
            {value}{showOutOf10 ? '/10' : ''}
        </span>
    );
}

export function WeeklyCheckInTable({ checkIns, onEdit }: WeeklyCheckInTableProps) {
    const weeks = groupCheckInsByWeek(checkIns);

    if (weeks.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {weeks.map((week) => (
                <div key={week.weekNumber}>
                    <div className="bg-primary/10 px-4 py-2 rounded-t-2xl border-b border-primary/10 flex justify-between items-center mb-0">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Week {week.weekNumber}</h3>
                        <span className="text-xs text-muted-foreground font-normal">Average Weight: {week.averages.weight ? `${week.averages.weight} kg` : '—'}</span>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="block md:hidden space-y-3 bg-card rounded-b-2xl p-3 border border-t-0 shadow-sm">
                        {week.days.map((day) => {
                            const c = day.originalCheckIn;
                            const isMissed = day.status === 'missed';

                            if (isMissed) return null; // Optional: Skip missed days on mobile history to save space, or show minimal

                            return (
                                <div
                                    key={day.dayNumber}
                                    onClick={() => onEdit?.(new Date(day.date))}
                                    className="bg-muted/30 rounded-xl p-3 space-y-3 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-sm">Day {day.dayNumber}</div>
                                            <div className="text-[10px] text-muted-foreground">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</div>
                                        </div>
                                        <WorkoutCell status={c?.workout_status} />
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="bg-background rounded-lg p-1.5 flex flex-col items-center justify-center">
                                            <span className="text-[9px] text-muted-foreground uppercase">Weight</span>
                                            <span className="text-xs font-bold">{c?.morning_weight ? c.morning_weight : '—'}</span>
                                        </div>
                                        <div className="bg-background rounded-lg p-1.5 flex flex-col items-center justify-center">
                                            <span className="text-[9px] text-muted-foreground uppercase">Cals</span>
                                            <span className="text-xs font-bold">{c?.calorie_intake ? c.calorie_intake : '—'}</span>
                                        </div>
                                        <div className="bg-background rounded-lg p-1.5 flex flex-col items-center justify-center">
                                            <span className="text-[9px] text-muted-foreground uppercase">Nutri</span>
                                            <span className={`text-xs font-bold ${c?.nutrition_score && c.nutrition_score >= 8 ? 'text-success' : 'text-primary'}`}>{c?.nutrition_score || '—'}</span>
                                        </div>
                                        <div className="bg-background rounded-lg p-1.5 flex flex-col items-center justify-center">
                                            <span className="text-[9px] text-muted-foreground uppercase">Steps</span>
                                            <span className="text-xs font-bold">{c?.daily_steps ? (c.daily_steps / 1000).toFixed(1) + 'k' : '—'}</span>
                                        </div>
                                        <div className="bg-background rounded-lg p-1.5 flex flex-col items-center justify-center">
                                            <span className="text-[9px] text-muted-foreground uppercase">Sleep</span>
                                            <span className="text-xs font-bold">{c?.sleep_hours || '—'}</span>
                                        </div>
                                        <div className="bg-background rounded-lg p-1.5 flex flex-col items-center justify-center">
                                            <span className="text-[9px] text-muted-foreground uppercase">Digestion</span>
                                            <span className="text-xs font-bold capitalize truncate max-w-full">{c?.digestion || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop View: Table */}
                    <Card className="hidden md:block overflow-hidden rounded-b-2xl rounded-t-none border-t-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/30 border-b">
                                        <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Day</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Weight</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Calories</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Nutrition</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Workout</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Steps</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Sleep</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Stress</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Energy</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Hunger</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Digestion</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Water</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Perf.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {week.days.map((day, idx) => {
                                        const c = day.originalCheckIn;
                                        const isMissed = day.status === 'missed';

                                        return (
                                            <tr
                                                key={day.dayNumber}
                                                className={`border-b transition-colors hover:bg-muted/20 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'} ${isMissed ? 'opacity-50' : ''} cursor-pointer hover:bg-muted/40`}
                                                onClick={() => onEdit?.(new Date(day.date))}
                                            >
                                                <td className="px-3 py-3 font-medium">
                                                    <div className="flex flex-col">
                                                        <span>Day {day.dayNumber}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center font-semibold">
                                                    {c?.morning_weight ? `${parseFloat(c.morning_weight.toString()).toFixed(1)} kg` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center font-semibold">
                                                    {c?.calorie_intake ? c.calorie_intake : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <ScoreCell value={c?.nutrition_score} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <WorkoutCell status={c?.workout_status} />
                                                </td>
                                                <td className="px-3 py-3 text-center font-medium">
                                                    {c?.daily_steps ? c.daily_steps.toLocaleString() : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center font-medium">
                                                    {c?.sleep_hours ? `${parseFloat(c.sleep_hours.toString()).toFixed(1)}h` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <ScoreCell value={c?.stress_level} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <ScoreCell value={c?.energy_level} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <ScoreCell value={c?.hunger_level} />
                                                </td>
                                                <td className="px-3 py-3 text-center capitalize">
                                                    {c?.digestion || '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center font-medium">
                                                    {c?.water_liters ? `${parseFloat(c.water_liters.toString()).toFixed(1)}L` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <ScoreCell value={c?.workout_performance} />
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Weekly Average Row */}
                                    <tr className="bg-primary/5 font-semibold border-t-2 border-primary/20">
                                        <td className="px-3 py-3 font-bold text-primary">AVG</td>
                                        <td className="px-3 py-3 text-center">
                                            {week.averages.weight ? `${week.averages.weight} kg` : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {week.averages.calories ? week.averages.calories : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <ScoreCell value={week.averages.nutritionScore} />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className="text-muted-foreground text-xs">
                                                {week.averages.workoutsDone}/{week.averages.totalWorkouts}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {week.averages.steps ? week.averages.steps.toLocaleString() : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {week.averages.sleep ? `${week.averages.sleep}h` : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <ScoreCell value={week.averages.stress} />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <ScoreCell value={week.averages.energy} />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <ScoreCell value={week.averages.hunger} />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            —
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {week.averages.water ? `${week.averages.water}L` : '—'}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <ScoreCell value={week.averages.performance} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    );
}
