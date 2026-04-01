import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMeasurement, saveMeasurement } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MeasurementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date;
    onSuccess?: () => void;
}

export function MeasurementDialog({ open, onOpenChange, selectedDate, onSuccess }: MeasurementDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    // Date state
    const [date, setDate] = useState<Date>(selectedDate || new Date());

    // Form state
    const [formData, setFormData] = useState({
        id: null as string | null,
        chest: "",
        waist: "",
        hips: "",
        thighs: "",
        arms: "",
    });

    // Reset/Date logic
    useEffect(() => {
        if (open) {
            if (selectedDate) {
                setDate(selectedDate);
            }
        }
    }, [open, selectedDate]);

    // Fetch data
    useEffect(() => {
        if (!open || !user) return;

        const fetchData = async () => {
            setIsFetching(true);
            try {
                const dateStr = format(date, 'yyyy-MM-dd');
                const data = await fetchMeasurement(user.id, dateStr);

                if (data) {
                    setFormData({
                        id: data.id,
                        chest: data.chest?.toString() || "",
                        waist: data.waist?.toString() || "",
                        hips: data.hips?.toString() || "",
                        thighs: data.thighs?.toString() || "",
                        arms: data.arms?.toString() || "",
                    });
                } else {
                    setFormData({
                        id: null,
                        chest: "",
                        waist: "",
                        hips: "",
                        thighs: "",
                        arms: "",
                    });
                }
            } catch (error) {
                console.error("Error fetching measurement:", error);
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

            await saveMeasurement(user.id, {
                id: formData.id,
                date: dateStr,
                chest: formData.chest ? parseFloat(formData.chest) : null,
                waist: formData.waist ? parseFloat(formData.waist) : null,
                hips: formData.hips ? parseFloat(formData.hips) : null,
                thighs: formData.thighs ? parseFloat(formData.thighs) : null,
                arms: formData.arms ? parseFloat(formData.arms) : null,
            });

            toast({
                title: "Success",
                description: "Measurements saved successfully!",
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save measurements",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {formData.id ? "Edit Measurements" : "Log Measurements"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                                    disabled={!!selectedDate}
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="chest">Chest (cm)</Label>
                                <Input
                                    id="chest"
                                    type="number"
                                    step="0.1"
                                    value={formData.chest}
                                    onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="waist">Waist (cm)</Label>
                                <Input
                                    id="waist"
                                    type="number"
                                    step="0.1"
                                    value={formData.waist}
                                    onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hips">Hips (cm)</Label>
                                <Input
                                    id="hips"
                                    type="number"
                                    step="0.1"
                                    value={formData.hips}
                                    onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="thighs">Thighs (cm)</Label>
                                <Input
                                    id="thighs"
                                    type="number"
                                    step="0.1"
                                    value={formData.thighs}
                                    onChange={(e) => setFormData({ ...formData, thighs: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="arms">Arms (cm)</Label>
                                <Input
                                    id="arms"
                                    type="number"
                                    step="0.1"
                                    value={formData.arms}
                                    onChange={(e) => setFormData({ ...formData, arms: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Measurements
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
