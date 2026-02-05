import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Crown, Star, Shield, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, isValid } from "date-fns";
import { formatDisplayDate } from "@/lib/date-utils";

export type PackageType = 'elite' | 'standard' | 'beginner';

interface PackageSelectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (packageType: PackageType, duration: number, startDate?: string) => void;
    isLoading?: boolean;
    clientName: string;
    mode?: 'claim' | 'edit';
    initialPackage?: PackageType | null;
    initialDuration?: number | null;
    initialStartDate?: string | null;
}

export function PackageSelectDialog({
    open,
    onOpenChange,
    onConfirm,
    isLoading,
    clientName,
    mode = 'claim',
    initialPackage,
    initialDuration,
    initialStartDate
}: PackageSelectDialogProps) {
    // Cast initialPackage to new type if it matches legacy strings, or default to 'standard'
    // This is a rough safety cast; ideally callers pass correct types.
    const safeInitialPackage = (
        ((initialPackage as string) === 'premium' ? 'elite' :
            (initialPackage as string) === 'intermediate' ? 'standard' :
                (initialPackage as string) === 'basic' ? 'beginner' :
                    initialPackage) as PackageType
    ) || 'standard';

    const [selectedPackage, setSelectedPackage] = useState<PackageType>(safeInitialPackage);
    const [selectedDuration, setSelectedDuration] = useState<number>(initialDuration || 3);
    const [selectedStartDate, setSelectedStartDate] = useState<string>(initialStartDate || '');
    // Separate state for the text input to allow free typing
    const [dateInputValue, setDateInputValue] = useState<string>(
        initialStartDate ? formatDisplayDate(initialStartDate) : ''
    );

    // Update state when open changes to true
    /* eslint-disable react-hooks/exhaustive-deps */
    const [prevOpen, setPrevOpen] = useState(open);
    if (open && !prevOpen) {
        setPrevOpen(true);
        setSelectedPackage(safeInitialPackage);
        setSelectedDuration(initialDuration || 3);
        setSelectedStartDate(initialStartDate || '');
        setDateInputValue(initialStartDate ? formatDisplayDate(initialStartDate) : '');
    } else if (!open && prevOpen) {
        setPrevOpen(false);
    }

    // Handle date input change - allow free typing
    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDateInputValue(val);

        // Try to parse when it looks like a complete DD-MM-YYYY date
        if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
            const parsed = parse(val, 'dd-MM-yyyy', new Date());
            if (isValid(parsed)) {
                setSelectedStartDate(format(parsed, 'yyyy-MM-dd'));
            }
        }
    };

    // Handle blur - try to parse the date
    const handleDateInputBlur = () => {
        if (!dateInputValue) {
            setSelectedStartDate('');
            return;
        }
        const parsed = parse(dateInputValue, 'dd-MM-yyyy', new Date());
        if (isValid(parsed)) {
            setSelectedStartDate(format(parsed, 'yyyy-MM-dd'));
            setDateInputValue(format(parsed, 'dd-MM-yyyy'));
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedPackage, selectedDuration, selectedStartDate || undefined);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'claim' ? `Claim Client: ${clientName}` : `Edit Package: ${clientName}`}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'claim'
                            ? "Select a coaching package and duration for this client."
                            : "Update the coaching package and duration."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Package Tier</Label>
                        <RadioGroup
                            value={selectedPackage}
                            onValueChange={(value) => setSelectedPackage(value as PackageType)}
                            className="space-y-3"
                        >
                            {/* Elite Package */}
                            <Label
                                htmlFor="elite"
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                    selectedPackage === 'elite'
                                        ? "border-gold bg-gold/5"
                                        : "border-muted"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        selectedPackage === 'elite' ? "bg-gold text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-base">Elite Package</div>
                                        <div className="text-xs text-muted-foreground">Full coaching suite + priority support</div>
                                    </div>
                                </div>
                                <RadioGroupItem value="elite" id="elite" className="text-gold border-gold" />
                            </Label>

                            {/* Standard Package */}
                            <Label
                                htmlFor="standard"
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                    selectedPackage === 'standard'
                                        ? "border-blue-500 bg-blue-500/5"
                                        : "border-muted"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        selectedPackage === 'standard' ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-base">Standard Package</div>
                                        <div className="text-xs text-muted-foreground">Standard coaching + weekly check-ins</div>
                                    </div>
                                </div>
                                <RadioGroupItem value="standard" id="standard" className="text-blue-500 border-blue-500" />
                            </Label>

                            {/* Beginner Package */}
                            <Label
                                htmlFor="beginner"
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                    selectedPackage === 'beginner'
                                        ? "border-sidebar-foreground/20 bg-muted"
                                        : "border-muted"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        selectedPackage === 'beginner' ? "bg-sidebar-foreground text-sidebar-background" : "bg-muted text-muted-foreground"
                                    )}>
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-base">Student Package</div>
                                        <div className="text-xs text-muted-foreground">Access to plans + monthly review</div>
                                    </div>
                                </div>
                                <RadioGroupItem value="beginner" id="beginner" />
                            </Label>
                        </RadioGroup>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Duration</Label>
                        <RadioGroup
                            value={selectedDuration.toString()}
                            onValueChange={(value) => setSelectedDuration(parseInt(value))}
                            className="grid grid-cols-2 gap-4"
                        >
                            <Label
                                htmlFor="duration-3"
                                className={cn(
                                    "flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                    selectedDuration === 3
                                        ? "border-primary bg-primary/5"
                                        : "border-muted"
                                )}
                            >
                                <div className="text-center">
                                    <div className="font-bold text-lg">3 Months</div>
                                    <RadioGroupItem value="3" id="duration-3" className="sr-only" />
                                </div>
                            </Label>

                            <Label
                                htmlFor="duration-6"
                                className={cn(
                                    "flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                    selectedDuration === 6
                                        ? "border-primary bg-primary/5"
                                        : "border-muted"
                                )}
                            >
                                <div className="text-center">
                                    <div className="font-bold text-lg">6 Months</div>
                                    <RadioGroupItem value="6" id="duration-6" className="sr-only" />
                                </div>
                            </Label>
                        </RadioGroup>
                    </div>

                    {/* Start Date - Only show in Edit mode */}
                    {mode === 'edit' && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Start Date (Optional)</Label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="DD-MM-YYYY"
                                    value={dateInputValue}
                                    onChange={handleDateInputChange}
                                    onBlur={handleDateInputBlur}
                                    className="flex-1 p-3 rounded-xl border-2 border-muted bg-background text-foreground focus:border-primary focus:outline-none transition-all font-mono"
                                />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl shrink-0">
                                            <CalendarIcon className="h-5 w-5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar
                                            mode="single"
                                            selected={selectedStartDate ? parse(selectedStartDate, 'yyyy-MM-dd', new Date()) : undefined}
                                            onSelect={(date) => {
                                                if (date && isValid(date)) {
                                                    setSelectedStartDate(format(date, 'yyyy-MM-dd'));
                                                    setDateInputValue(format(date, 'dd-MM-yyyy'));
                                                }
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <p className="text-xs text-muted-foreground">Type the date (DD-MM-YYYY) or click the calendar icon to select.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isLoading}>
                        {isLoading
                            ? (mode === 'claim' ? "Claiming..." : "Updating...")
                            : (mode === 'claim' ? "Confirm & Claim" : "Update Package")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
