import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProgressPhotos, saveProgressPhotos } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PhotoUploadCard } from "@/components/PhotoUploadCard";

interface PhotosUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date;
    onSuccess?: () => void;
}

export function PhotosUploadDialog({ open, onOpenChange, selectedDate, onSuccess }: PhotosUploadDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    // Date state
    const [date, setDate] = useState<Date>(selectedDate || new Date());

    // Form state
    const [formData, setFormData] = useState({
        id: null as string | null,
        frontUrl: null as string | null,
        backUrl: null as string | null,
        sideLeftUrl: null as string | null,
        sideRightUrl: null as string | null,
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

                const data = await fetchProgressPhotos(user.id, dateStr);

                if (data) {
                    setFormData({
                        id: data.id,
                        frontUrl: data.frontUrl,
                        backUrl: data.backUrl,
                        sideLeftUrl: data.sideLeftUrl,
                        sideRightUrl: data.sideRightUrl,
                    });
                } else {
                    setFormData({
                        id: null,
                        frontUrl: null,
                        backUrl: null,
                        sideLeftUrl: null,
                        sideRightUrl: null,
                    });
                }
            } catch (error) {
                console.error("Error fetching photos:", error);
            } finally {
                setIsFetching(false);
            }
        };

        fetchData();
    }, [date, open, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Check if at least one photo is uploaded (optional, but good practice)
        // Actually user might want to upload one by one.

        setIsLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');

            await saveProgressPhotos(user.id, {
                id: formData.id,
                date: dateStr,
                frontUrl: formData.frontUrl,
                backUrl: formData.backUrl,
                sideLeftUrl: formData.sideLeftUrl,
                sideRightUrl: formData.sideRightUrl,
            });

            toast({
                title: "Success",
                description: "Progress photos saved successfully!",
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save photos",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUrl = (field: 'frontUrl' | 'backUrl' | 'sideLeftUrl' | 'sideRightUrl', url: string | null) => {
        setFormData(prev => ({ ...prev, [field]: url }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {formData.id ? "Edit Progress Photos" : "Log Progress Photos"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col space-y-2 max-w-[240px]">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {user && (
                                <>
                                    <PhotoUploadCard
                                        label="Front View"
                                        currentUrl={formData.frontUrl}
                                        onUpload={(url) => handleUpdateUrl('frontUrl', url)}
                                        onDelete={() => handleUpdateUrl('frontUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                    <PhotoUploadCard
                                        label="Back View"
                                        currentUrl={formData.backUrl}
                                        onUpload={(url) => handleUpdateUrl('backUrl', url)}
                                        onDelete={() => handleUpdateUrl('backUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                    <PhotoUploadCard
                                        label="Side (Left)"
                                        currentUrl={formData.sideLeftUrl}
                                        onUpload={(url) => handleUpdateUrl('sideLeftUrl', url)}
                                        onDelete={() => handleUpdateUrl('sideLeftUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                    <PhotoUploadCard
                                        label="Side (Right)"
                                        currentUrl={formData.sideRightUrl}
                                        onUpload={(url) => handleUpdateUrl('sideRightUrl', url)}
                                        onDelete={() => handleUpdateUrl('sideRightUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Photos
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
