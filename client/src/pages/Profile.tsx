import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Target, Calendar, Activity, Loader2, AlertCircle, Dumbbell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatDisplayDate } from "@/lib/date-utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionnaireWizard } from "@/components/QuestionnaireWizard";

import { answerText, parseAnswers, changedAnswers } from '@/lib/questionnaire-data';
import { saveProfilePatch } from '../../../shared/profile-save';
import { saveAssessment } from '../../../shared/assessment-save';

export default function Profile() {
  const { user, viewedUserId } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const targetUserId = viewedUserId || user?.id;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    timezone: "",
    goal: "",
    injuries: "",
    allergies: "",
    workoutDays: "",
    medicalCondition: "",
    startDate: "",
    packageEndDate: "", // Calculated
  });

  const baseline = useRef(formData);
  const identity = useRef(targetUserId);
  const epoch = useRef(0);
  if (identity.current !== targetUserId) { identity.current = targetUserId; epoch.current++; }
  const [loadError,setLoadError] = useState(false);
  const [loadAttempt,setLoadAttempt] = useState(0);
  const [ready,setReady] = useState(false);
  // Fetch user profile data from DB and questionnaire
  useEffect(() => {
    async function fetchProfile() {
      if (!targetUserId) return;
      const generation = ++epoch.current;
      const active = () => identity.current === targetUserId && epoch.current === generation;
      setReady(false); setLoadError(false); setIsEditing(false); setIsLoading(false);
      try {
        // Fetch user data
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (!active()) return;
        if (error || !data) throw error ?? new Error('Profile missing');

        // Fetch questionnaire data
        const { data: questionnaireData, error: assessmentError } = await supabase
          .from('onboarding_questionnaire')
          .select('answers')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (!active()) return;
        if (assessmentError) throw assessmentError;
        const questionnaireAnswers = parseAnswers(questionnaireData?.answers);

        if (data) {
          const profileData = data.profile_data || {};

          // Calculate End Date
          let endDateStr = "";
          // @ts-ignore
          const pkgStart = data.package_start_date;
          // @ts-ignore
          const pkgDuration = data.package_duration;

          if (pkgStart && pkgDuration) {
            const start = new Date(pkgStart);
            const end = new Date(start.setMonth(start.getMonth() + pkgDuration));
            endDateStr = formatDisplayDate(end);
          }

          // Sync logic: prefer questionnaire answers, fallback to profile_data
          const next = {
            ...baseline.current,
            name: data.full_name || "",
            email: data.email || "",
            phone: data.phone_number || "",
            country: data.country || "",
            timezone: profileData.timezone || "",
            goal: answerText(questionnaireAnswers,'q14',profileData.goal),
            injuries: answerText(questionnaireAnswers,'q56',profileData.injuries),
            allergies: answerText(questionnaireAnswers,'q64',profileData.allergies),
            workoutDays: answerText(questionnaireAnswers,'q33',profileData.workoutDays),
            medicalCondition: profileData.medicalCondition || "",
            startDate: formatDisplayDate(pkgStart),
            packageEndDate: endDateStr,
          };
          baseline.current = next; setFormData(next); setReady(true);
        }
      } catch (err) {
        if (active()) setLoadError(true);
      }
    }

    void fetchProfile();
    return () => { epoch.current++; };
  }, [targetUserId,loadAttempt]);

  const handleSave = async () => {
    if (!targetUserId || !ready || isLoading) return;
    const userId = targetUserId; const generation = epoch.current;
    const active = () => identity.current === userId && epoch.current === generation;
    const snapshot = {...formData};
    const overlap = (form: typeof formData) => ({q14:form.goal,q56:form.injuries,q64:form.allergies,q33:form.workoutDays});
    const extra = (form: typeof formData) => ({timezone:form.timezone,goal:form.goal,injuries:form.injuries,allergies:form.allergies,workoutDays:form.workoutDays,medicalCondition:form.medicalCondition});
    setIsLoading(true);
    try {
      // Fail closed before either row is changed if assessment cannot be read.
      const {error:assessmentReadError} = await supabase.from('onboarding_questionnaire').select('id, answers, completed_sections').eq('user_id',userId).maybeSingle();
      if (!active()) return; if(assessmentReadError) throw assessmentReadError;
      if (!viewedUserId && snapshot.name !== baseline.current.name) {
        const {error} = await supabase.auth.updateUser({data:{full_name:snapshot.name}});
        if (!active()) return; if(error) throw error;
      }
      const patch = changedAnswers({full_name:baseline.current.name,phone_number:baseline.current.phone,country:baseline.current.country},{full_name:snapshot.name,phone_number:snapshot.phone,country:snapshot.country});
      await saveProfilePatch(supabase,userId,patch,changedAnswers(extra(baseline.current),extra(snapshot)),active);
      if (!active()) return;
      await saveAssessment(supabase,userId,changedAnswers(overlap(baseline.current),overlap(snapshot)),[],active,{create:false});
      if (!active()) return;
      baseline.current=snapshot; setIsEditing(false); toast({title:'Saved',description:'Profile saved to your account.'});
    } catch { if(active()) toast({title:'Could not finish saving',description:'Your edits are still here. Retry to finish updating your profile and assessment.',variant:'destructive'}); }
    finally { if(active()) setIsLoading(false); }
  };

  if (loadError) return <Card className="p-6"><p>Could not load your profile.</p><Button onClick={()=>setLoadAttempt(n=>n+1)}>Retry</Button></Card>;
  if (!ready) return <p>Loading profile…</p>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-4xl font-bold mb-2" data-testid="text-profile-title">Client Profile</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage your personal information and complete your onboarding assessment</p>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 rounded-xl p-1 h-auto bg-muted/50">
          <TabsTrigger value="details" className="rounded-lg py-3 text-base">Basic Details</TabsTrigger>
          <TabsTrigger value="questionnaire" className="rounded-lg py-3 text-base">Detailed Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-8">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="rounded-xl"
              data-testid="button-edit-profile"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </div>

          <Card className="p-4 sm:p-8 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 sm:mb-8 text-center sm:text-left">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">{formData.name || "User"}</h2>
              </div>
            </div>

            <Separator className="mb-8" />

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-name"
                        />
                      ) : (
                        <span className="text-foreground">{formData.name || "-"}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{formData.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-phone"
                        />
                      ) : (
                        <span className="text-foreground">{formData.phone || "-"}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-country"
                        />
                      ) : (
                        <span className="text-foreground">{formData.country || "-"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Fitness Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="goal">Primary Goal</Label>
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Textarea
                          id="goal"
                          value={formData.goal}
                          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-goal"
                        />
                      ) : (
                        <span className="text-foreground">{formData.goal}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="injuries">Injuries</Label>
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Textarea
                          id="injuries"
                          value={formData.injuries}
                          onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-injuries"
                        />
                      ) : (
                        <span className="text-foreground">{formData.injuries}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allergies">Food Allergies</Label>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Textarea
                          id="allergies"
                          value={formData.allergies}
                          onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-allergies"
                        />
                      ) : (
                        <span className="text-foreground">{formData.allergies || "None reported"}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workoutDays">Workout Days Per Week</Label>
                    <div className="flex items-center gap-3">
                      <Dumbbell className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Select value={formData.workoutDays} onValueChange={(val) => setFormData({ ...formData, workoutDays: val })}>
                          <SelectTrigger className="rounded-xl flex-1" data-testid="input-workoutDays">
                            <SelectValue placeholder="Select workout days" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-2 days">1-2 days</SelectItem>
                            <SelectItem value="3-4 days">3-4 days</SelectItem>
                            <SelectItem value="5-6 days">5-6 days</SelectItem>
                            <SelectItem value="Every day">Every day</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-foreground">{formData.workoutDays || "-"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Program Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{formData.startDate}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packageEnd">End Date</Label>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span className="text-foreground">{formData.packageEndDate || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="questionnaire">
          <QuestionnaireWizard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
