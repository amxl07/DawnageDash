import { useState, useEffect, useRef } from "react";
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
import { questionnaireSections, Question, parseAnswers, parseCompletedSections, changedAnswers, missingRequired, visibleQuestions, validCompletedSections, suggestProfileAnswers } from "@/lib/questionnaire-data";
import { QuestionnaireSummary } from "@/components/QuestionnaireSummary";
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Save } from "lucide-react";

import { saveAssessment } from '../../../shared/assessment-save';

export function QuestionnaireWizard({ onComplete }: { onComplete?: () => void }) {
    const { user, viewedUserId } = useAuth();
    const { toast } = useToast();
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [completedSections, setCompletedSections] = useState<string[]>([]);
    const [showSummary, setShowSummary] = useState(false); // Show summary when completed

    // Determine the target user ID for fetching/saving data
    const targetUserId = viewedUserId || user?.id;

    const identity = useRef(targetUserId);
    const generation = useRef(0);
    if (identity.current !== targetUserId) { identity.current = targetUserId; generation.current++; }
    const baseline = useRef<Record<string, unknown>>({});
    const saveLock = useRef(false);
    const acknowledgedComplete = useRef(false);
    const [loadError, setLoadError] = useState(false);
    const currentSection = questionnaireSections[currentSectionIndex];

    useEffect(() => {
        if (targetUserId) {
            fetchProgress();
        }
        return () => { generation.current++; };
    }, [targetUserId]);

    const fetchProgress = async () => {
        const userId = targetUserId; const epoch = ++generation.current;
        const active = () => identity.current === userId && generation.current === epoch;
        setIsLoading(true); setLoadError(false); setShowSummary(false); setAnswers({}); setCompletedSections([]); setCurrentSectionIndex(0); setIsSaving(false); saveLock.current = false;
        try {
            const { data, error } = await supabase.from('onboarding_questionnaire').select('*').eq('user_id', userId).maybeSingle();
            if (!active()) return; if (error) throw error;
            const { data: profile, error: profileError } = await supabase.from('users').select('full_name, phone_number, profile_data').eq('id', userId).maybeSingle();
            if (!active()) return; if (profileError) throw profileError;
            const parsed = parseAnswers(data?.answers); const history = parseCompletedSections(data?.completed_sections);
            baseline.current = parsed; setAnswers(suggestProfileAnswers(parsed, profile)); setCompletedSections(history);
            const valid = validCompletedSections(parsed,history);
            setShowSummary(valid.length === questionnaireSections.length);
            setCurrentSectionIndex(Math.max(0,questionnaireSections.findIndex(s=>!valid.includes(s.id))));
        } catch { if (active()) setLoadError(true); }
        finally { if (active()) setIsLoading(false); }
    };

    const saveProgress = async (markSectionComplete = false): Promise<boolean> => {
        if (!targetUserId || saveLock.current) return false;
        const userId = targetUserId; const epoch = generation.current;
        const active = () => identity.current === userId && generation.current === epoch;
        saveLock.current = true; setIsSaving(true);
        try {
            const history = markSectionComplete ? [...completedSections,currentSection.id] : completedSections;
            const saved = await saveAssessment(supabase,userId,changedAnswers(baseline.current,answers),history,active);
            if (!active() || !saved) return false;
            acknowledgedComplete.current = saved.status === 'completed';
            baseline.current=saved.answers; setAnswers(saved.answers); setCompletedSections(saved.completed);
            toast({title:'Saved',description:'Your answers have been saved to your account.'});
            return true;
        } catch { if (active()) toast({title:'Could not save',description:'Your answers are still here. Try saving again.',variant:'destructive'}); return false; }
        finally { if (active()) { saveLock.current=false; setIsSaving(false); } }
    };

    const handleNext = async () => {
        const origin = generation.current; const userId = targetUserId;
        // Basic validation
        const requiredMissing = missingRequired(currentSection, answers);
        if (requiredMissing.length > 0) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        if (!await saveProgress(true) || generation.current !== origin || identity.current !== userId) return;

        if (currentSectionIndex < questionnaireSections.length - 1) {
            setCurrentSectionIndex(prev => prev + 1);
            window.scrollTo(0, 0);
        } else {
            // Completed
            if (!acknowledgedComplete.current) {
                toast({title:'Draft saved',description:'Complete the remaining required sections before finishing.'}); return;
            }
            setShowSummary(true);
            if (onComplete) onComplete();
            toast({
                title: "Questionnaire Completed! 🎉",
                description: "Thank you for providing your details.",
            });
        }
    };

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (Object.keys(changedAnswers(baseline.current,answers)).length) { event.preventDefault(); event.returnValue = ''; }
        };
        window.addEventListener('beforeunload',warn);
        return () => window.removeEventListener('beforeunload',warn);
    }, [answers]);

    const handleBack = () => {
        if (currentSectionIndex > 0) {
            setCurrentSectionIndex(prev => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleEdit = () => {
        setShowSummary(false);
        // Optional: you could scroll to top or set index to 0 or leave as is
        window.scrollTo(0, 0);
    };

    const renderQuestionInput = (question: Question) => {
        const value = answers[question.id] ?? "";

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
            case 'rating':
                return (
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: (question.max ?? 5) - (question.min ?? 1) + 1 }, (_, i) => (question.min ?? 1) + i).map((num) => (
                            <Button
                                key={num}
                                variant={value === num ? "default" : "outline"}
                                className={value === num ? "ring-2 ring-primary" : ""}
                                onClick={() => setAnswers({ ...answers, [question.id]: num })}
                            >
                                {num} {num === question.min ? '' : ''}
                            </Button>
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

    if (loadError) return <Card className="p-6"><p>Could not load your assessment.</p><Button onClick={fetchProgress}>Retry</Button></Card>;

    // Always show summary view for coaches viewing clients
    const isCoachViewing = user?.user_metadata?.role === 'coach' && !!viewedUserId;

    if (showSummary || isCoachViewing) {
        return <QuestionnaireSummary answers={baseline.current} completed={completedSections} onEdit={handleEdit} />;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <details className="mb-6"><summary className="cursor-pointer py-3">{validCompletedSections(answers,completedSections).length} of {questionnaireSections.length} sections complete · View sections</summary><nav className="grid gap-2">{questionnaireSections.map((s,i)=><Button key={s.id} variant="outline" disabled={isSaving} onClick={()=>setCurrentSectionIndex(i)}>{s.title}</Button>)}</nav></details>
            <Card className="p-8 rounded-2xl border-primary/10 shadow-lg">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold">{currentSection.title}</h2>
                    <p className="text-muted-foreground">{currentSection.description}</p>
                </div>

                <Separator className="mb-6" />

                <fieldset disabled={isSaving} className="space-y-8">
                    {visibleQuestions(currentSection, answers).map((question) => (
                        <div key={question.id} className="space-y-3">
                            <Label className="text-base font-medium">
                                {question.text} {question.required && <span className="text-destructive">*</span>}
                            </Label>
                            {question.description && (
                                <p className="text-sm text-muted-foreground -mt-1">{question.description}</p>
                            )}
                            {renderQuestionInput(question)}
                        </div>
                    ))}
                </fieldset>

                <div className="flex justify-between mt-8 pt-6 border-t">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentSectionIndex === 0 || isSaving}
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
