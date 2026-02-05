import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar, Apple, Dumbbell, Heart, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatDisplayDate } from "@/lib/date-utils";

interface WeeklyCheckIn {
    id: string;
    created_at: string;
    week_start_date: string | null;
    // Weekly Overview
    overall_feeling: string | null;
    weekly_wins: string | null;
    // Nutrition
    nutrition_adherence: string | null;
    digestion: string | null;
    enjoying_meals: string | null;
    hunger_levels: string | null;
    nutrition_questions: string | null;
    // Training
    training_progress: string | null;
    enjoying_training: string | null;
    missed_sessions: string | null;
    joint_pain: string | null;
    step_count: string | null;
    training_questions: string | null;
    // Wellbeing
    recovery_issues: string | null;
    water_intake: string | null;
    stress_level: string | null;
    overall_experience: string | null;
    // Feedback
    feedback: string | null;
}

interface ClientWeeklyFeedbackViewProps {
    clientId: string;
    clientName?: string;
}

export function ClientWeeklyFeedbackView({ clientId, clientName }: ClientWeeklyFeedbackViewProps) {
    const { data: checkIns, isLoading, error } = useQuery({
        queryKey: ['clientWeeklyCheckIns', clientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('weekly_check_ins')
                .select('*')
                .eq('user_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as WeeklyCheckIn[];
        },
        enabled: !!clientId
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="p-6 text-center">
                <p className="text-destructive">Failed to load weekly feedback.</p>
            </Card>
        );
    }

    if (!checkIns || checkIns.length === 0) {
        return (
            <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Weekly Feedback Yet</h3>
                <p className="text-muted-foreground">
                    {clientName || "This client"} hasn't submitted any weekly feedback yet.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-2">Weekly Feedback</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Viewing {clientName || "client"}'s weekly check-ins ({checkIns.length} total)
                </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
                {checkIns.map((checkIn, index) => {
                    const weekNumber = checkIns.length - index;
                    const submittedDate = formatDisplayDate(checkIn.created_at);

                    return (
                        <AccordionItem
                            key={checkIn.id}
                            value={checkIn.id}
                            className="border rounded-xl px-4 bg-card"
                        >
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                        W{weekNumber}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">Week {weekNumber}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Submitted: {submittedDate}
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6">
                                <div className="space-y-6 pt-2">
                                    {/* Overall Summary */}
                                    {(checkIn.overall_feeling || checkIn.weekly_wins) && (
                                        <Section icon={<MessageSquare className="w-4 h-4" />} title="Weekly Overview">
                                            {checkIn.overall_feeling && (
                                                <Field label="Overall Feeling" value={checkIn.overall_feeling} />
                                            )}
                                            {checkIn.weekly_wins && (
                                                <Field label="Weekly Wins" value={checkIn.weekly_wins} />
                                            )}
                                        </Section>
                                    )}

                                    {/* Nutrition */}
                                    <Section icon={<Apple className="w-4 h-4" />} title="Nutrition">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <MetricBadge label="Adherence" value={checkIn.nutrition_adherence} />
                                            <MetricBadge label="Digestion" value={checkIn.digestion} />
                                            <MetricBadge label="Enjoying Meals" value={checkIn.enjoying_meals} />
                                            <MetricBadge label="Hunger" value={checkIn.hunger_levels} />
                                        </div>
                                        {checkIn.nutrition_questions && (
                                            <Field label="Questions" value={checkIn.nutrition_questions} className="mt-4" />
                                        )}
                                    </Section>

                                    {/* Training */}
                                    <Section icon={<Dumbbell className="w-4 h-4" />} title="Training">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <MetricBadge label="Progress" value={checkIn.training_progress} />
                                            <MetricBadge label="Enjoying" value={checkIn.enjoying_training} />
                                            <MetricBadge label="Missed Sessions" value={checkIn.missed_sessions} />
                                            <MetricBadge label="Joint Pain" value={checkIn.joint_pain} />
                                        </div>
                                        {checkIn.step_count && (
                                            <div className="mt-4 p-3 bg-muted/50 rounded-lg inline-block">
                                                <span className="text-sm text-muted-foreground">Avg Steps: </span>
                                                <span className="font-semibold">{parseInt(checkIn.step_count).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {checkIn.training_questions && (
                                            <Field label="Questions" value={checkIn.training_questions} className="mt-4" />
                                        )}
                                    </Section>

                                    {/* Wellbeing */}
                                    <Section icon={<Heart className="w-4 h-4" />} title="Wellbeing">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <MetricBadge label="Recovery Issues" value={checkIn.recovery_issues} />
                                            <MetricBadge label="Water (L)" value={checkIn.water_intake} />
                                            <MetricBadge label="Stress" value={checkIn.stress_level ? `${checkIn.stress_level}/10` : null} />
                                        </div>
                                        {checkIn.overall_experience && (
                                            <Field label="Overall Experience" value={checkIn.overall_experience} className="mt-4" />
                                        )}
                                    </Section>

                                    {/* Feedback */}
                                    {checkIn.feedback && (
                                        <Section icon={<MessageSquare className="w-4 h-4" />} title="Client Feedback">
                                            <p className="text-foreground bg-muted/50 p-4 rounded-lg italic">
                                                "{checkIn.feedback}"
                                            </p>
                                        </Section>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}

// Helper Components
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {icon}
                {title}
            </div>
            <div>{children}</div>
        </div>
    );
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
    return (
        <div className={className}>
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <p className="text-foreground">{value}</p>
        </div>
    );
}

function MetricBadge({ label, value }: { label: string; value: string | null }) {
    if (!value) return null;

    const getVariant = (val: string): "default" | "secondary" | "destructive" | "outline" => {
        const lowerVal = val.toLowerCase();
        if (lowerVal === 'yes' || lowerVal === 'no hunger' || lowerVal === 'perfect, no hunger') return 'default';
        if (lowerVal === 'no' && (label === 'Missed Sessions' || label === 'Joint Pain' || label === 'Recovery Issues')) return 'default';
        if (lowerVal === 'no') return 'secondary';
        if (lowerVal === 'stalled' || lowerVal === 'high hunger' || lowerVal === 'cravings') return 'destructive';
        return 'outline';
    };

    return (
        <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <Badge variant={getVariant(value)} className="font-normal">
                {value}
            </Badge>
        </div>
    );
}
