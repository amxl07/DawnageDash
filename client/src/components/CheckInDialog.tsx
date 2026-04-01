import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCheckIn, saveCheckIn } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CheckInDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date; // If provided, locks to this date (Edit mode) or specific add
    onSuccess?: () => void;
}

export function CheckInDialog({ open, onOpenChange, selectedDate, onSuccess }: CheckInDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    // Date state
    const [date, setDate] = useState<Date>(selectedDate || new Date());

    // Form state
    const [formData, setFormData] = useState({
        id: null as string | null, // Check-in ID if exists
        morningWeight: "",
        sleepHours: "",
        workoutStatus: "",
        workoutPerformance: "",
        nutritionScore: "",
        calorieIntake: "",
        waterLiters: "",
        dailySteps: "",
        energyLevel: "",
        hungerLevel: "",
        stressLevel: "",
        digestion: "",
    });

    // Reset form when dialog opens or date changes
    useEffect(() => {
        if (open) {
            // If a specific date was passed via props, use it. Otherwise retain current local date state (default today)
            if (selectedDate) {
                setDate(selectedDate);
            } else {
                // If not forced, we might want to default to today ONLY if we aren't already editing something
                // But for simplicity, let's say if selectedDate is undefined, we default to today initially
                // and let user change it.
            }
        }
    }, [open, selectedDate]);

    // Fetch data when date changes (or on open)
    useEffect(() => {
        if (!open || !user) return;

        const fetchData = async () => {
            setIsFetching(true);
            try {
                const dateStr = format(date, 'yyyy-MM-dd');

                const data = await fetchCheckIn(user.id, dateStr);

                if (data) {
                    setFormData({
                        id: data.id,
                        morningWeight: data.morningWeight?.toString() || "",
                        sleepHours: data.sleepHours?.toString() || "",
                        workoutStatus: data.workoutStatus || "",
                        workoutPerformance: data.workoutPerformance?.toString() || "",
                        nutritionScore: data.nutritionScore?.toString() || "",
                        calorieIntake: data.calorieIntake?.toString() || "",
                        waterLiters: data.waterLiters?.toString() || "",
                        dailySteps: data.dailySteps?.toString() || "",
                        energyLevel: data.energyLevel?.toString() || "",
                        hungerLevel: data.hungerLevel?.toString() || "",
                        stressLevel: data.stressLevel?.toString() || "",
                        digestion: data.digestion || "",
                    });
                } else {
                    // Reset form for fresh entry
                    setFormData({
                        id: null,
                        morningWeight: "",
                        sleepHours: "",
                        workoutStatus: "",
                        workoutPerformance: "",
                        nutritionScore: "",
                        calorieIntake: "",
                        waterLiters: "",
                        dailySteps: "",
                        energyLevel: "",
                        hungerLevel: "",
                        stressLevel: "",
                        digestion: "",
                    });
                }
            } catch (error) {
                console.error("Error fetching check-in:", error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchData();
    }, [date, open, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');

            await saveCheckIn(user.id, {
                id: formData.id,
                date: dateStr,
                morningWeight: formData.morningWeight ? parseFloat(formData.morningWeight) : null,
                sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : null,
                workoutStatus: formData.workoutStatus || null,
                workoutPerformance: formData.workoutPerformance ? parseInt(formData.workoutPerformance) : null,
                nutritionScore: formData.nutritionScore ? parseInt(formData.nutritionScore) : null,
                calorieIntake: formData.calorieIntake ? parseInt(formData.calorieIntake) : null,
                waterLiters: formData.waterLiters ? parseFloat(formData.waterLiters) : null,
                dailySteps: formData.dailySteps ? parseInt(formData.dailySteps) : null,
                energyLevel: formData.energyLevel ? parseInt(formData.energyLevel) : null,
                hungerLevel: formData.hungerLevel ? parseInt(formData.hungerLevel) : null,
                stressLevel: formData.stressLevel ? parseInt(formData.stressLevel) : null,
                digestion: formData.digestion || null,
            });

            toast({
                title: "Success",
                description: "Daily check-in saved successfully!",
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save check-in",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {formData.id ? "Edit Check-In" : "Daily Check-In"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Date Selector */}
                    <div className="flex flex-col space-y-2">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    disabled={!!selectedDate} // Disable if date is forced (Edit mode from table)
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {isFetching ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Vitals */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Vitals & Sleep</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="morningWeight">Weight (kg)</Label>
                                        <Input
                                            id="morningWeight"
                                            type="number"
                                            step="0.1"
                                            placeholder="78.5"
                                            value={formData.morningWeight}
                                            onChange={(e) => setFormData({ ...formData, morningWeight: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sleepHours">Sleep (hrs)</Label>
                                        <Input
                                            id="sleepHours"
                                            type="number"
                                            step="0.5"
                                            placeholder="7.5"
                                            value={formData.sleepHours}
                                            onChange={(e) => setFormData({ ...formData, sleepHours: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Workout */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Activity</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="workoutStatus">Workout Status</Label>
                                        <Select value={formData.workoutStatus} onValueChange={(value) => setFormData({ ...formData, workoutStatus: value })}>
                                            <SelectTrigger>
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
                                            value={formData.workoutPerformance}
                                            onChange={(e) => setFormData({ ...formData, workoutPerformance: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="dailySteps">Daily Steps</Label>
                                        <Input
                                            id="dailySteps"
                                            type="number"
                                            value={formData.dailySteps}
                                            onChange={(e) => setFormData({ ...formData, dailySteps: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Nutrition */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Nutrition</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nutritionScore">Score (1-10)</Label>
                                        <Input
                                            id="nutritionScore"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.nutritionScore}
                                            onChange={(e) => setFormData({ ...formData, nutritionScore: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="calorieIntake">Calories</Label>
                                        <Input
                                            id="calorieIntake"
                                            type="number"
                                            value={formData.calorieIntake}
                                            onChange={(e) => setFormData({ ...formData, calorieIntake: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="waterLiters">Water (L)</Label>
                                        <Input
                                            id="waterLiters"
                                            type="number"
                                            step="0.1"
                                            value={formData.waterLiters}
                                            onChange={(e) => setFormData({ ...formData, waterLiters: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="digestion">Digestion</Label>
                                        <Select value={formData.digestion} onValueChange={(value) => setFormData({ ...formData, digestion: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Normal</SelectItem>
                                                <SelectItem value="bloated">Bloated</SelectItem>
                                                <SelectItem value="constipated">Constipated</SelectItem>
                                                <SelectItem value="diarrhea">Diarrhea</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Wellbeing */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Wellbeing (1-10)</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="energyLevel">Energy</Label>
                                        <Input
                                            id="energyLevel"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.energyLevel}
                                            onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="hungerLevel">Hunger</Label>
                                        <Input
                                            id="hungerLevel"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.hungerLevel}
                                            onChange={(e) => setFormData({ ...formData, hungerLevel: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="stressLevel">Stress</Label>
                                        <Input
                                            id="stressLevel"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.stressLevel}
                                            onChange={(e) => setFormData({ ...formData, stressLevel: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Save Check-In
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
