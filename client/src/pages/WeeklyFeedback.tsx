import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronRight, ChevronLeft, Send, UploadCloud, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientWeeklyFeedbackView } from "@/components/ClientWeeklyFeedbackView";

type CheckInFormData = {
  // Step 1: General
  overall_feeling: string;
  weekly_wins: string;
  // Step 2: Nutrition
  nutrition_adherence: string;
  digestion: string;
  enjoying_meals: string;
  hunger_levels: string;
  nutrition_questions: string;
  // Step 3: Training
  training_progress: string;
  enjoying_training: string;
  missed_sessions: string;
  joint_pain: string;
  step_count: string;
  training_questions: string;
  // Step 4: Wellbeing
  recovery_issues: string;
  water_intake: string;
  stress_level: string;
  overall_experience: string;
  // Step 5: Feedback
  feedback: string;
};

const initialData: CheckInFormData = {
  overall_feeling: "",
  weekly_wins: "",
  nutrition_adherence: "",
  digestion: "",
  enjoying_meals: "",
  hunger_levels: "",
  nutrition_questions: "",
  training_progress: "",
  enjoying_training: "",
  missed_sessions: "",
  joint_pain: "",
  step_count: "",
  training_questions: "",
  recovery_issues: "",
  water_intake: "",
  stress_level: "",
  overall_experience: "",
  feedback: "",
};

export default function WeeklyFeedback() {
  const { user, viewedUserId } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<CheckInFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issubmitted, setIsSubmitted] = useState(false);

  // If viewing as coach, show read-only view
  if (viewedUserId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <ClientWeeklyFeedbackView clientId={viewedUserId} />
      </div>
    );
  }


  // Fetch previous check-ins to determine current week
  const { data: checkIns } = useQuery({
    queryKey: ['weeklyCheckIns', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('weekly_check_ins')
        .select('id, created_at, week_start_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const weekNumber = (checkIns?.length || 0) + 1;

  const updateField = (field: keyof CheckInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    {
      title: `Welcome - Week ${weekNumber}`,
      description: "Weekly Check-in",
      content: (
        <div className="space-y-8 py-4">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Hi {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}! 👋</h2>
              <p className="text-muted-foreground text-lg mt-2 max-w-2xl mx-auto">
                Ready for your <strong>Week {weekNumber}</strong> check-in? Let's review your progress and fine-tune your plan for next week.
              </p>
            </div>

            <Button size="lg" onClick={() => setStep(1)} className="min-w-[200px] text-lg h-12">
              Start Week {weekNumber} Check-in <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* History Section - Inline Accordion */}
          {checkIns && checkIns.length > 0 && user?.id && (
            <div className="border-t pt-8 mt-8 text-left">
              <ClientWeeklyFeedbackView clientId={user.id} clientName="My" />
            </div>
          )}
        </div>
      )

    },
    {
      title: "Weekly Overview",
      description: "How was your week?",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base">Let me know how you felt overall in the past week?</Label>
            <Textarea
              placeholder="Summary of your week..."
              value={formData.overall_feeling}
              onChange={e => updateField('overall_feeling', e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-base">What's your small/biggest wins in the last week?</Label>
            <Textarea
              placeholder="Mention all your weekly wins..."
              value={formData.weekly_wins}
              onChange={e => updateField('weekly_wins', e.target.value)}
            />
          </div>
        </div>
      )
    },
    {
      title: "Nutrition",
      description: "Diet & Digestion",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base">Did you follow the nutrition plan 100% last week?</Label>
            <Select value={formData.nutrition_adherence} onValueChange={v => updateField('nutrition_adherence', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Mostly">Mostly (80-90%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">How is your overall digestion was there last week?</Label>
            <Input
              placeholder="e.g. Digestion was good, I felt very light"
              value={formData.digestion}
              onChange={e => updateField('digestion', e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-base">Are you currently enjoying the foods and meals you are eating?</Label>
            <Select value={formData.enjoying_meals} onValueChange={v => updateField('enjoying_meals', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">How would you rate your hunger levels this week?</Label>
            <Select value={formData.hunger_levels} onValueChange={v => updateField('hunger_levels', v)}>
              <SelectTrigger><SelectValue placeholder="Select hunger level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No hunger">Perfect, No hunger</SelectItem>
                <SelectItem value="Mild hunger">Mild hunger</SelectItem>
                <SelectItem value="High hunger">High hunger</SelectItem>
                <SelectItem value="Cravings">Strong Cravings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">Do you have any additional questions regarding your nutrition?</Label>
            <Textarea
              placeholder="Ask any diet related questions..."
              value={formData.nutrition_questions}
              onChange={e => updateField('nutrition_questions', e.target.value)}
            />
          </div>
        </div>
      )
    },
    {
      title: "Training",
      description: "Workouts & Activity",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base">Are you currently progressing in your training sessions? (Any strength/form improvements)</Label>
            <Select value={formData.training_progress} onValueChange={v => updateField('training_progress', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Stalled">Stalled/Plateaued</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">Are you currently enjoying all of your training sessions and exercises?</Label>
            <Select value={formData.enjoying_training} onValueChange={v => updateField('enjoying_training', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">Have you missed any training or cardio sessions this week?</Label>
            <Select value={formData.missed_sessions} onValueChange={v => updateField('missed_sessions', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">Do you have any joint pain or too much soreness during/after any session?</Label>
            <Select value={formData.joint_pain} onValueChange={v => updateField('joint_pain', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">What's your average step counts this week?</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={formData.step_count}
              onChange={e => updateField('step_count', e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-base">Do you have any additional questions around your training and activity?</Label>
            <Textarea
              placeholder="Ask any training questions..."
              value={formData.training_questions}
              onChange={e => updateField('training_questions', e.target.value)}
            />
          </div>
        </div>
      )
    },
    {
      title: "Wellbeing & Summary",
      description: "Recovery & Stress",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base">Did you have any recovery issues last week?</Label>
            <Select value={formData.recovery_issues} onValueChange={v => updateField('recovery_issues', v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-base">How much water you drank on an average last week (Liters)?</Label>
            <Input
              type="number"
              placeholder="e.g. 3"
              value={formData.water_intake}
              onChange={e => updateField('water_intake', e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-base">How was your stress level this week (1-10)?</Label>
            <Input
              type="number"
              min="1" max="10"
              placeholder="1-10"
              value={formData.stress_level}
              onChange={e => updateField('stress_level', e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <Label className="text-base">How would you summarise your overall experience this week?</Label>
            <Textarea
              placeholder="e.g. Very good..."
              value={formData.overall_experience}
              onChange={e => updateField('overall_experience', e.target.value)}
            />
          </div>
        </div>
      )
    },
    {
      title: "Feedback",
      description: "Final Thoughts",
      content: (
        <div className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg mb-6">
            <p className="text-muted-foreground">You're almost there! The final question is optional and just helps us improve the coaching you receive 🙂</p>
          </div>
          <div className="space-y-3">
            <Label className="text-base">Do you have any suggestions or feedback to give on how we could improve our coaching?</Label>
            <Textarea
              placeholder="Your feedback..."
              value={formData.feedback}
              onChange={e => updateField('feedback', e.target.value)}
            />
          </div>
        </div>
      )
    }
  ];

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('weekly_check_ins')
        .insert({
          user_id: user.id,
          ...formData
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Check-in Submitted!",
        description: "Your coach will review your update shortly.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit check-in",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (issubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Thanks {user?.user_metadata?.full_name?.split(' ')[0]}!</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Thanks for all your inputs. Have a good day ☺️
        </p>
        <Card className="p-6 bg-primary/5 border-primary/20 text-left space-y-4">
          <div className="flex items-start gap-4">
            <UploadCloud className="w-6 h-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-lg">Final Reminder</h3>
              <p className="text-muted-foreground">
                Please also ensure your <strong>morning empty stomach weigh-ins</strong>, <strong>measurements</strong> and <strong>progress pictures</strong> are uploaded to the App.
              </p>
              <p className="mt-2 text-primary font-medium">
                I will check everything and give my detailed feedback response within next 48 hours ☺️
              </p>
            </div>
          </div>
        </Card>
        <Button className="mt-8" variant="outline" onClick={() => {
          setIsSubmitted(false);
          setStep(0);
          setFormData(initialData);
        }}>
          Start New Check-in
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* ProgressBar (only after welcome step) */}
      {step > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>Step {step} of {steps.length - 1}</span>
            <span>{Math.round((step / (steps.length - 1)) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      <Card className="p-6 md:p-8 min-h-[400px] flex flex-col">
        {step > 0 && (
          <div className="mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold">{steps[step].title}</h2>
            <p className="text-muted-foreground">{steps[step].description}</p>
          </div>
        )}

        <div className="flex-1">
          {steps[step].content}
        </div>

        {step > 0 && (
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
                {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
