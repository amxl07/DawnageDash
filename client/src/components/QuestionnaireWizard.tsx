import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { questionnaireSections, Question } from "@/lib/questionnaire-data";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Save } from "lucide-react";

export function QuestionnaireWizard({ onComplete }: { onComplete?: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [completedSections, setCompletedSections] = useState<string[]>([]);

    const currentSection = questionnaireSections[currentSectionIndex];
    const progress = Math.round(((currentSectionIndex) / questionnaireSections.length) * 100);

    useEffect(() => {
        if (user) {
            fetchProgress();
        }
    }, [user]);

    const fetchProgress = async () => {
        try {
            const { data, error } = await supabase
                .from('onboarding_questionnaire')
                .select('*')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setAnswers(JSON.parse(data.answers || '{}'));
                setCompletedSections(JSON.parse(data.completed_sections || '[]'));

                // Find first incomplete section to resume
                const firstIncomplete = questionnaireSections.findIndex(s => !JSON.parse(data.completed_sections || '[]').includes(s.id));
                if (firstIncomplete !== -1) {
                    setCurrentSectionIndex(firstIncomplete);
                } else if (data.status === 'completed') {
                    setCurrentSectionIndex(questionnaireSections.length - 1); // Go to last or show summary
                }
            }
        } catch (error) {
            console.error("Error fetching questionnaire:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveProgress = async (markSectionComplete = false) => {
        if (!user) return;
        setIsSaving(true);

        try {
            const updatedCompletedSections = markSectionComplete
                ? Array.from(new Set([...completedSections, currentSection.id]))
                : completedSections;

            const payload = {
                user_id: user.id,
                answers: JSON.stringify(answers),
                completed_sections: JSON.stringify(updatedCompletedSections),
                status: updatedCompletedSections.length === questionnaireSections.length ? 'completed' : 'in_progress'
            };

            // Check if exists
            const { data: existing } = await supabase
                .from('onboarding_questionnaire')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('onboarding_questionnaire')
                    .update(payload)
                    .eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('onboarding_questionnaire')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            if (markSectionComplete) {
                setCompletedSections(updatedCompletedSections);
            }

            toast({
                title: "Progress Saved",
                description: "Your answers have been saved.",
            });

        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to save progress.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        // Basic validation
        const missingRequired = currentSection.questions.filter(q => q.required && !answers[q.id]);
        if (missingRequired.length > 0) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        await saveProgress(true);

        if (currentSectionIndex < questionnaireSections.length - 1) {
            setCurrentSectionIndex(prev => prev + 1);
            window.scrollTo(0, 0);
        } else {
            // Completed
            if (onComplete) onComplete();
            toast({
                title: "Questionnaire Completed! 🎉",
                description: "Thank you for providing your details.",
            });
        }
    };

    const handleBack = () => {
        if (currentSectionIndex > 0) {
            setCurrentSectionIndex(prev => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const renderQuestionInput = (question: Question) => {
        const value = answers[question.id] || "";

        switch (question.type) {
            case 'text':
            case 'number':
                return (
                    <Input
                        type={question.type}
                        placeholder={question.placeholder}
                        value={value}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="rounded-xl"
                        step={question.type === 'number' ? 'any' : undefined}
                    />
                );
            case 'textarea':
                return (
                    <Textarea
                        placeholder={question.placeholder}
                        value={value}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="rounded-xl min-h-[100px]"
                    />
                );
            case 'select':
                return (
                    <Select value={value} onValueChange={(val) => setAnswers({ ...answers, [question.id]: val })}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {question.options?.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'radio':
                return (
                    <RadioGroup value={value} onValueChange={(val) => setAnswers({ ...answers, [question.id]: val })}>
                        <div className="flex flex-col gap-2">
                            {question.options?.map(opt => (
                                <div key={opt} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
                                    <Label htmlFor={`${question.id}-${opt}`}>{opt}</Label>
                                </div>
                            ))}
                        </div>
                    </RadioGroup>
                );
            case 'multiselect':
                // Simple implementation for multiselect using checkboxes
                const selected = Array.isArray(value) ? value : [];
                return (
                    <div className="grid grid-cols-2 gap-2">
                        {question.options?.map(opt => (
                            <div key={opt} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${question.id}-${opt}`}
                                    checked={selected.includes(opt)}
                                    onCheckedChange={(checked) => {
                                        const newSelected = checked
                                            ? [...selected, opt]
                                            : selected.filter((s: string) => s !== opt);
                                        setAnswers({ ...answers, [question.id]: newSelected });
                                    }}
                                />
                                <Label htmlFor={`${question.id}-${opt}`}>{opt}</Label>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{Math.round(((currentSectionIndex) / questionnaireSections.length) * 100)}%</span>
                </div>
                <Progress value={Math.round(((currentSectionIndex) / questionnaireSections.length) * 100)} className="h-2" />
            </div>

            <Card className="p-8 rounded-2xl border-primary/10 shadow-lg">
                <div className="mb-6">
                    <Badge variant="outline" className="mb-2">Section {currentSectionIndex + 1} of {questionnaireSections.length}</Badge>
                    <h2 className="text-2xl font-bold">{currentSection.title}</h2>
                    <p className="text-muted-foreground">{currentSection.description}</p>
                </div>

                <Separator className="mb-6" />

                <div className="space-y-8">
                    {currentSection.questions.map((question) => (
                        <div key={question.id} className="space-y-3">
                            <Label className="text-base font-medium">
                                {question.text} {question.required && <span className="text-destructive">*</span>}
                            </Label>
                            {renderQuestionInput(question)}
                        </div>
                    ))}
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentSectionIndex === 0}
                        className="rounded-xl"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => saveProgress(false)}
                            className="rounded-xl"
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Draft
                        </Button>
                        <Button
                            onClick={handleNext}
                            className="rounded-xl"
                            disabled={isSaving}
                        >
                            {currentSectionIndex === questionnaireSections.length - 1 ? 'Complete' : 'Next'}
                            {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <ChevronRight className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
