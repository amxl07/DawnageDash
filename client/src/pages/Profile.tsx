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
    region: "North America",
    timezone: "EST",
    goal: "Build muscle and lose fat",
    injuries: "None",
    medicalCondition: "None",
    preferredCheckinDay: "Monday",
    preferredCheckinTime: "09:00 AM",
    startDate: new Date().toISOString().split('T')[0],
    packageLength: "12 weeks",
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
          setFormData(prev => ({
            ...prev,
            name: data.full_name || "",
            email: data.email || "",
            phone: data.phone_number || "", // Map phone_number (DB) to phone (State)
            // Load extra fields from profile_data
            region: profileData.region || "North America",
            timezone: profileData.timezone || "EST",
            goal: profileData.goal || "Build muscle and lose fat",
            injuries: profileData.injuries || "None",
            medicalCondition: profileData.medicalCondition || "None",
            preferredCheckinDay: profileData.preferredCheckinDay || "Monday",
            preferredCheckinTime: profileData.preferredCheckinTime || "09:00 AM",
            startDate: profileData.startDate || new Date().toISOString().split('T')[0],
            packageLength: profileData.packageLength || "12 weeks",
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
        region: formData.region,
        timezone: formData.timezone,
        goal: formData.goal,
        injuries: formData.injuries,
        medicalCondition: formData.medicalCondition,
        preferredCheckinDay: formData.preferredCheckinDay,
        preferredCheckinTime: formData.preferredCheckinTime,
        startDate: formData.startDate,
        packageLength: formData.packageLength,
      };

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: formData.name,
          phone_number: formData.phone, // Map phone (State) to phone_number (DB)
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

          <Card className="p-8 rounded-2xl">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">{formData.name || "User"}</h2>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full">Active Client</Badge>
                  <Badge variant="outline" className="rounded-full">Week 4</Badge>
                </div>
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
                        <span className="text-foreground">{formData.name}</span>
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
                      <span className="text-foreground">{formData.phone}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      {isEditing ? (
                        <Input
                          id="region"
                          value={formData.region}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-region"
                        />
                      ) : (
                        <span className="text-foreground">{formData.region}</span>
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
                      {isEditing ? (
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="rounded-xl flex-1"
                          data-testid="input-start-date"
                        />
                      ) : (
                        <span className="text-foreground">{formData.startDate}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packageLength">Package Length</Label>
                    {isEditing ? (
                      <Input
                        id="packageLength"
                        value={formData.packageLength}
                        onChange={(e) => setFormData({ ...formData, packageLength: e.target.value })}
                        className="rounded-xl"
                        data-testid="input-package-length"
                      />
                    ) : (
                      <span className="text-foreground flex items-center h-10">{formData.packageLength}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredCheckinDay">Preferred Check-in Day</Label>
                    {isEditing ? (
                      <Select value={formData.preferredCheckinDay} onValueChange={(value) => setFormData({ ...formData, preferredCheckinDay: value })}>
                        <SelectTrigger className="rounded-xl" data-testid="select-checkin-day">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                          <SelectItem value="Sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-foreground flex items-center h-10">{formData.preferredCheckinDay}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredCheckinTime">Preferred Check-in Time</Label>
                    {isEditing ? (
                      <Input
                        id="preferredCheckinTime"
                        type="time"
                        value={formData.preferredCheckinTime}
                        onChange={(e) => setFormData({ ...formData, preferredCheckinTime: e.target.value })}
                        className="rounded-xl"
                        data-testid="input-checkin-time"
                      />
                    ) : (
                      <span className="text-foreground flex items-center h-10">{formData.preferredCheckinTime}</span>
                    )}
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
