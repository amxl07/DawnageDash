import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    CalendarIcon,
    Target,
    Activity,
    AlertTriangle,
    ExternalLink,
    Dumbbell,
    Utensils
} from "lucide-react";
import { formatDisplayDate } from "@/lib/date-utils";
import { format } from "date-fns";
import { PackageType } from "./PackageSelectDialog";

interface Client {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    package_type: PackageType | null;
    package_duration: number | null;
    package_start_date: string | null;
    profile_data: any; // JSONB
    created_at: string;
}

interface ClientDetailsSheetProps {
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onViewDashboard: (clientId: string) => void;
}

export function ClientDetailsSheet({
    client,
    open,
    onOpenChange,
    onViewDashboard
}: ClientDetailsSheetProps) {
    if (!client) return null;

    const profile = client.profile_data || {};

    // Extract key info safely
    // Based on questionnaire-data and Profile.tsx
    const goal = profile.goal || "Not specified";
    const injuries = profile.injuries || "None reported";
    const medicalConditions = profile.medicalConditions || "None reported";

    // Equipment is often in section 4 (Training History) or profile
    // Assuming it's in profile or we might need to parse it if it's deep in section answers
    // For now, let's display what we have at top level

    const formattedStartDate = client.package_start_date
        ? formatDisplayDate(client.package_start_date)
        : "Not started";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader className="mb-6">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/10">
                            <AvatarImage src={client.avatar_url || ""} />
                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                {client.full_name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <SheetTitle className="text-xl">{client.full_name}</SheetTitle>
                            <SheetDescription>{client.email}</SheetDescription>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="capitalize">
                                    {client.package_type || 'No Plan'}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    Joined {formatDisplayDate(client.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="space-y-6">
                        {/* Quick Stats Grid can go here if we pass stats in props later */}

                        {/* Primary Goal */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium flex items-center gap-2 text-primary">
                                <Target className="h-4 w-4" />
                                Primary Goal
                            </h3>
                            <div className="p-4 bg-muted/40 rounded-lg text-sm">
                                {goal}
                            </div>
                        </div>

                        {/* Health & Safety */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium flex items-center gap-2 text-red-500">
                                <AlertTriangle className="h-4 w-4" />
                                Critical Health Info
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 border border-red-100 bg-red-50/50 rounded-lg">
                                    <span className="text-xs font-semibold text-red-600 uppercase block mb-1">
                                        Injuries
                                    </span>
                                    <p className="text-sm text-foreground/90">{injuries}</p>
                                </div>
                                <div className="p-3 border bg-muted/20 rounded-lg">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                                        Medical Conditions
                                    </span>
                                    <p className="text-sm text-foreground/90">{medicalConditions}</p>
                                </div>
                            </div>
                        </div>

                        {/* Package Info */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium flex items-center gap-2 text-blue-500">
                                <Activity className="h-4 w-4" />
                                Program Details
                            </h3>
                            <div className="p-4 border rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Start Date</span>
                                    <span className="font-medium">{formattedStartDate}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span className="font-medium">{client.package_duration || 0} Months</span>
                                </div>
                            </div>
                        </div>

                        {/* Debug / Raw Profile Data (Coach often needs to dig) */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Contact & Bio
                            </h3>
                            <div className="text-sm space-y-1">
                                {/* @ts-ignore */}
                                {profile.phone && <p><span className="text-muted-foreground">Phone:</span> {profile.phone}</p>}
                                {/* @ts-ignore */}
                                {profile.country && <p><span className="text-muted-foreground">Location:</span> {profile.country}</p>}
                                {/* @ts-ignore */}
                                {profile.age && <p><span className="text-muted-foreground">Age:</span> {profile.age}</p>}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="mt-6 pt-4 border-t">
                    <Button
                        className="w-full"
                        onClick={() => {
                            onOpenChange(false);
                            onViewDashboard(client.id);
                        }}
                    >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Full Dashboard
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
