import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { questionnaireSections, Question } from "@/lib/questionnaire-data";
import { CheckCircle2, Edit3, Star, User, Ruler, Target, Wine, Dumbbell, UtensilsCrossed, Stethoscope, Activity, Moon, Brain } from "lucide-react";

interface QuestionnaireSummaryProps {
    answers: Record<string, any>;
    onEdit: () => void;
}

// Map section IDs to icons
const sectionIcons: Record<string, React.ReactNode> = {
    basic_details: <User className="w-5 h-5" />,
    body_measurements: <Ruler className="w-5 h-5" />,
    goals: <Target className="w-5 h-5" />,
    lifestyle: <Wine className="w-5 h-5" />,
    training_history: <Dumbbell className="w-5 h-5" />,
    nutrition_history: <UtensilsCrossed className="w-5 h-5" />,
    health_medical: <Stethoscope className="w-5 h-5" />,
    daily_activity: <Activity className="w-5 h-5" />,
    sleep_recovery: <Moon className="w-5 h-5" />,
    stress_gut: <Brain className="w-5 h-5" />,
};

export function QuestionnaireSummary({ answers, onEdit }: QuestionnaireSummaryProps) {
    const renderAnswerValue = (question: Question, value: any) => {
        if (value === undefined || value === null || value === "") {
            return <span className="text-muted-foreground italic">Not provided</span>;
        }

        switch (question.type) {
            case 'rating':
                const max = question.max || 5;
                const min = question.min || 1;
                return (
                    <div className="flex items-center gap-1">
                        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
                            <div
                                key={num}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${num <= value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {num}
                            </div>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">({value}/{max})</span>
                    </div>
                );
            case 'multiselect':
                if (!Array.isArray(value) || value.length === 0) {
                    return <span className="text-muted-foreground italic">None selected</span>;
                }
                return (
                    <div className="flex flex-wrap gap-2">
                        {value.map((item: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-sm">
                                {item}
                            </Badge>
                        ))}
                    </div>
                );
            case 'radio':
            case 'select':
                return (
                    <Badge variant="outline" className="text-sm font-normal">
                        {value}
                    </Badge>
                );
            case 'textarea':
                return (
                    <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 text-sm">
                        {value}
                    </p>
                );
            default:
                return <span className="text-foreground">{value}</span>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header with completion status */}
            <Card className="p-6 rounded-2xl border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-green-600 dark:text-green-400">
                                Assessment Complete
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                All sections have been completed
                            </p>
                        </div>
                    </div>
                    <Button onClick={onEdit} variant="outline" className="rounded-xl gap-2">
                        <Edit3 className="w-4 h-4" />
                        Edit Responses
                    </Button>
                </div>
            </Card>

            {/* Section summaries */}
            {questionnaireSections.map((section) => {
                // Check if this section has any answers
                const sectionHasAnswers = section.questions.some(q => answers[q.id] !== undefined && answers[q.id] !== "");

                return (
                    <Card key={section.id} className="rounded-2xl overflow-hidden">
                        <div className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-transparent border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    {sectionIcons[section.id] || <CheckCircle2 className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{section.title}</h3>
                                    {section.description && (
                                        <p className="text-sm text-muted-foreground">{section.description}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-5">
                            {section.questions.map((question, idx) => {
                                const value = answers[question.id];

                                return (
                                    <div key={question.id}>
                                        {idx > 0 && <Separator className="mb-5" />}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {question.text}
                                                {question.required && <span className="text-destructive ml-1">*</span>}
                                            </p>
                                            {question.description && (
                                                <p className="text-xs text-muted-foreground/70 italic">
                                                    {question.description}
                                                </p>
                                            )}
                                            <div className="pt-1">
                                                {renderAnswerValue(question, value)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
