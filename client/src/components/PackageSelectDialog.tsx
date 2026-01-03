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
import { Crown, Star, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type PackageType = 'premium' | 'intermediate' | 'basic';

interface PackageSelectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (packageType: PackageType) => void;
    isLoading?: boolean;
    clientName: string;
}

export function PackageSelectDialog({
    open,
    onOpenChange,
    onConfirm,
    isLoading,
    clientName
}: PackageSelectDialogProps) {
    const [selectedPackage, setSelectedPackage] = useState<PackageType>('intermediate');

    const handleConfirm = () => {
        onConfirm(selectedPackage);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Claim Client: {clientName}</DialogTitle>
                    <DialogDescription>
                        Select a coaching package for this client. This will determine their service level and dashboard features.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <RadioGroup
                        value={selectedPackage}
                        onValueChange={(value) => setSelectedPackage(value as PackageType)}
                        className="space-y-3"
                    >
                        {/* Premium Package */}
                        <Label
                            htmlFor="premium"
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                selectedPackage === 'premium'
                                    ? "border-gold bg-gold/5"
                                    : "border-muted"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    selectedPackage === 'premium' ? "bg-gold text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    <Crown className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-base">Premium Package</div>
                                    <div className="text-xs text-muted-foreground">Full coaching suite + priority support</div>
                                </div>
                            </div>
                            <RadioGroupItem value="premium" id="premium" className="text-gold border-gold" />
                        </Label>

                        {/* Intermediate Package */}
                        <Label
                            htmlFor="intermediate"
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                selectedPackage === 'intermediate'
                                    ? "border-blue-500 bg-blue-500/5"
                                    : "border-muted"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    selectedPackage === 'intermediate' ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    <Star className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-base">Intermediate Package</div>
                                    <div className="text-xs text-muted-foreground">Standard coaching + weekly check-ins</div>
                                </div>
                            </div>
                            <RadioGroupItem value="intermediate" id="intermediate" className="text-blue-500 border-blue-500" />
                        </Label>

                        {/* Basic Package */}
                        <Label
                            htmlFor="basic"
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                                selectedPackage === 'basic'
                                    ? "border-sidebar-foreground/20 bg-muted"
                                    : "border-muted"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-full",
                                    selectedPackage === 'basic' ? "bg-sidebar-foreground text-sidebar-background" : "bg-muted text-muted-foreground"
                                )}>
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-base">Basic Package</div>
                                    <div className="text-xs text-muted-foreground">Access to plans + monthly review</div>
                                </div>
                            </div>
                            <RadioGroupItem value="basic" id="basic" />
                        </Label>
                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isLoading}>
                        {isLoading ? "Claiming..." : "Confirm & Claim"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
