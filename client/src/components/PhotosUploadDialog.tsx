import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { photoReferencesForSave } from "@shared/progress-photos";
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
    const [fetchError, setFetchError] = useState(false);
    const [uploads, setUploads] = useState<Record<string, boolean>>({});
    const uploading = Object.values(uploads).some(Boolean);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

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
        let active = true;

        const fetchData = async () => {
            setIsFetching(true);
            setFetchError(false);
            setUploads({});
            setFormData({ id: null, frontUrl: null, backUrl: null, sideLeftUrl: null, sideRightUrl: null });
            try {
                const dateStr = format(date, 'yyyy-MM-dd');

                const { data, error } = await supabase
                    .from("weekly_progress_photos")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("date", dateStr)
                    .maybeSingle();

                if (error) throw error;
                if (!active) return;

                if (data) {
                    setFormData({
                        id: data.id,
                        frontUrl: data.front_url,
                        backUrl: data.back_url,
                        sideLeftUrl: data.side_left_url,
                        sideRightUrl: data.side_right_url,
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
                if (active) setFetchError(true);
            } finally {
                if (active) setIsFetching(false);
            }
        };

        void fetchData();
        return () => { active = false; };
    }, [date, open, user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isFetching || fetchError || uploading || isLoading) return;

        // Check if at least one photo is uploaded (optional, but good practice)
        // Actually user might want to upload one by one.

        setIsLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');

            const payload = {
                user_id: user.id,
                date: dateStr,
                front_url: formData.frontUrl,
                back_url: formData.backUrl,
                side_left_url: formData.sideLeftUrl,
                side_right_url: formData.sideRightUrl,
            };

            const canonicalPayload = { ...payload, ...photoReferencesForSave(payload, import.meta.env.VITE_SUPABASE_URL, user.id) };
            let error;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from("weekly_progress_photos")
                    .update(canonicalPayload)
                    .eq("id", formData.id)
                    .eq("user_id", user.id)
                    .select("id")
                    .single();
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("weekly_progress_photos")
                    .insert(canonicalPayload).select("id").single();
                error = insertError;
            }

            if (error) throw error;
            if (!mounted.current) return;

            toast({
                title: "Success",
                description: "Progress photos saved successfully!",
            });

            onSuccess?.();
            onOpenChange(false);
        } catch {
            if (!mounted.current) return;
            toast({
                title: "Error",
                description: "Failed to save photos. Please try again.",
                variant: "destructive",
            });
        } finally {
            if (mounted.current) setIsLoading(false);
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
                                    disabled={!!selectedDate || uploading || isLoading || isFetching}
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

                    {fetchError && <p role="alert">Photo history could not load. Close and reopen to retry before saving.</p>}
                    {isFetching ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {user && (
                                <>
                                    <PhotoUploadCard
                                        key={`${user.id}:${format(date, 'yyyy-MM-dd')}:front`}
                                        label="Front View"
                                        disabled={isLoading}
                                        currentReference={formData.frontUrl}
                                        onUploadingChange={(busy) => setUploads(prev => ({ ...prev, frontUrl: busy }))}
                                        onUpload={(url) => handleUpdateUrl('frontUrl', url)}
                                        onDelete={() => handleUpdateUrl('frontUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                    <PhotoUploadCard
                                        key={`${user.id}:${format(date, 'yyyy-MM-dd')}:back`}
                                        label="Back View"
                                        disabled={isLoading}
                                        currentReference={formData.backUrl}
                                        onUploadingChange={(busy) => setUploads(prev => ({ ...prev, backUrl: busy }))}
                                        onUpload={(url) => handleUpdateUrl('backUrl', url)}
                                        onDelete={() => handleUpdateUrl('backUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                    <PhotoUploadCard
                                        key={`${user.id}:${format(date, 'yyyy-MM-dd')}:left`}
                                        label="Side (Left)"
                                        disabled={isLoading}
                                        currentReference={formData.sideLeftUrl}
                                        onUploadingChange={(busy) => setUploads(prev => ({ ...prev, sideLeftUrl: busy }))}
                                        onUpload={(url) => handleUpdateUrl('sideLeftUrl', url)}
                                        onDelete={() => handleUpdateUrl('sideLeftUrl', null)}
                                        userId={user.id}
                                        dateStr={format(date, 'yyyy-MM-dd')}
                                    />
                                    <PhotoUploadCard
                                        key={`${user.id}:${format(date, 'yyyy-MM-dd')}:right`}
                                        label="Side (Right)"
                                        disabled={isLoading}
                                        currentReference={formData.sideRightUrl}
                                        onUploadingChange={(busy) => setUploads(prev => ({ ...prev, sideRightUrl: busy }))}
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
                        <Button type="submit" disabled={isLoading || isFetching || fetchError || uploading}>
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Photos
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
