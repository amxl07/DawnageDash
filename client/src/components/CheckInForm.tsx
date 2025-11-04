import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function CheckInForm() {
  const [formData, setFormData] = useState({
    morningWeight: "",
    workoutStatus: "",
    workoutPerformance: "",
    nutritionScore: "",
    dailySteps: "",
    sleepHours: "",
    waterLiters: "",
    energyLevel: "",
    digestion: "",
    hungerLevel: "",
    stressLevel: "",
    calorieIntake: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Check-in submitted:", formData);
  };

  return (
    <Card className="p-8 rounded-2xl max-w-3xl mx-auto" data-testid="form-check-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Daily Check-In</h2>
        <p className="text-muted-foreground">Track your progress and stay on top of your fitness goals</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Vitals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="morningWeight">Morning Weight (kg)</Label>
              <Input
                id="morningWeight"
                type="number"
                step="0.1"
                placeholder="78.5"
                value={formData.morningWeight}
                onChange={(e) => setFormData({ ...formData, morningWeight: e.target.value })}
                className="rounded-xl"
                data-testid="input-morning-weight"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleepHours">Sleep Hours</Label>
              <Input
                id="sleepHours"
                type="number"
                step="0.5"
                placeholder="7.5"
                value={formData.sleepHours}
                onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
                className="rounded-xl"
                data-testid="input-sleep-hours"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Workout</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="workoutStatus">Workout Status</Label>
              <Select value={formData.workoutStatus} onValueChange={(value) => setFormData({ ...formData, workoutStatus: value })}>
                <SelectTrigger className="rounded-xl" data-testid="select-workout-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="cardio_day">Cardio Day</SelectItem>
                  <SelectItem value="rest_day">Rest Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workoutPerformance">Performance (1-10)</Label>
              <Input
                id="workoutPerformance"
                type="number"
                min="1"
                max="10"
                placeholder="8"
                value={formData.workoutPerformance}
                onChange={(e) => setFormData({ ...formData, workoutPerformance: e.target.value })}
                className="rounded-xl"
                data-testid="input-workout-performance"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Nutrition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nutritionScore">Nutrition Score (1-10)</Label>
              <Input
                id="nutritionScore"
                type="number"
                min="1"
                max="10"
                placeholder="9"
                value={formData.nutritionScore}
                onChange={(e) => setFormData({ ...formData, nutritionScore: e.target.value })}
                className="rounded-xl"
                data-testid="input-nutrition-score"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calorieIntake">Calorie Intake</Label>
              <Input
                id="calorieIntake"
                type="number"
                placeholder="2200"
                value={formData.calorieIntake}
                onChange={(e) => setFormData({ ...formData, calorieIntake: e.target.value })}
                className="rounded-xl"
                data-testid="input-calorie-intake"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterLiters">Water Intake (L)</Label>
              <Input
                id="waterLiters"
                type="number"
                step="0.1"
                placeholder="2.5"
                value={formData.waterLiters}
                onChange={(e) => setFormData({ ...formData, waterLiters: e.target.value })}
                className="rounded-xl"
                data-testid="input-water-liters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailySteps">Daily Steps</Label>
              <Input
                id="dailySteps"
                type="number"
                placeholder="8500"
                value={formData.dailySteps}
                onChange={(e) => setFormData({ ...formData, dailySteps: e.target.value })}
                className="rounded-xl"
                data-testid="input-daily-steps"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4 uppercase text-xs tracking-wide text-muted-foreground">Wellbeing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="energyLevel">Energy Level (1-10)</Label>
              <Input
                id="energyLevel"
                type="number"
                min="1"
                max="10"
                placeholder="8"
                value={formData.energyLevel}
                onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value })}
                className="rounded-xl"
                data-testid="input-energy-level"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hungerLevel">Hunger Level (1-10)</Label>
              <Input
                id="hungerLevel"
                type="number"
                min="1"
                max="10"
                placeholder="5"
                value={formData.hungerLevel}
                onChange={(e) => setFormData({ ...formData, hungerLevel: e.target.value })}
                className="rounded-xl"
                data-testid="input-hunger-level"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stressLevel">Stress Level (1-10)</Label>
              <Input
                id="stressLevel"
                type="number"
                min="1"
                max="10"
                placeholder="3"
                value={formData.stressLevel}
                onChange={(e) => setFormData({ ...formData, stressLevel: e.target.value })}
                className="rounded-xl"
                data-testid="input-stress-level"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="digestion">Digestion</Label>
              <Select value={formData.digestion} onValueChange={(value) => setFormData({ ...formData, digestion: value })}>
                <SelectTrigger className="rounded-xl" data-testid="select-digestion">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bloated">Bloated</SelectItem>
                  <SelectItem value="constipated">Constipated</SelectItem>
                  <SelectItem value="diarrhea">Diarrhea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="rounded-xl px-8" data-testid="button-submit-checkin">
            Submit Check-In
          </Button>
        </div>
      </form>
    </Card>
  );
}
