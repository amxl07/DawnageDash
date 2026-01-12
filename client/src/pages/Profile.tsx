import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Target, Calendar, Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionnaireWizard } from "@/components/QuestionnaireWizard";

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
    medicalCondition: "",
    startDate: "",
    packageEndDate: "", // Calculated
  });

  // Fetch user profile data from DB
  useEffect(() => {
    async function fetchProfile() {
      if (!targetUserId) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

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
            endDateStr = end.toLocaleDateString();
          }

          setFormData(prev => ({
            ...prev,
            name: data.full_name || "",
            email: data.email || "",
            phone: data.phone_number || "",
            country: data.country || "",
            timezone: profileData.timezone || "",
            goal: profileData.goal || "",
            injuries: profileData.injuries || "",
            medicalCondition: profileData.medicalCondition || "",
            startDate: pkgStart || "",
            packageEndDate: endDateStr,
          }));
        }
      } catch (err) {
        console.error("Fetch profile exception:", err);
      }
    }

    fetchProfile();
  }, [targetUserId]);

  const handleSave = async () => {
    if (!targetUserId) return;
    setIsLoading(true);

    try {
      // Only update Auth User Metadata if we are the user acting on ourselves
      if (!viewedUserId) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: formData.name }
        });
        if (authError) throw authError;
      }

      // Collect extra fields for profile_data
      const profileData = {
        // region is replaced by country column
        timezone: formData.timezone,
        goal: formData.goal,
        injuries: formData.injuries,
        medicalCondition: formData.medicalCondition,
      };

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: formData.name,
          phone_number: formData.phone,
          country: formData.country,
          profile_data: profileData
        })
        .eq('id', targetUserId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                      <span className="text-foreground">{formData.phone || "-"}</span>
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
                    <span className="text-foreground flex items-center h-10">{formData.packageEndDate}</span>
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
