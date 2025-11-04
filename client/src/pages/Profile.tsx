import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Target, Calendar, Activity } from "lucide-react";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "John Mitchell",
    email: "john.mitchell@example.com",
    phone: "+1 (555) 123-4567",
    region: "North America",
    timezone: "EST",
    goal: "Build muscle and lose fat",
    injuries: "Previous knee injury (recovered)",
    medicalCondition: "None",
    preferredCheckinDay: "Monday",
    preferredCheckinTime: "09:00 AM",
    startDate: "2025-01-01",
    packageLength: "12 weeks",
  });

  const handleSave = () => {
    console.log("Profile saved:", formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-profile-title">Client Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="rounded-xl"
          data-testid="button-edit-profile"
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </Button>
      </div>

      <Card className="p-8 rounded-2xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-1">{formData.name}</h2>
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
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="rounded-xl flex-1"
                      data-testid="input-email"
                    />
                  ) : (
                    <span className="text-foreground">{formData.email}</span>
                  )}
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
                    <span className="text-foreground">{formData.phone}</span>
                  )}
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
    </div>
  );
}
