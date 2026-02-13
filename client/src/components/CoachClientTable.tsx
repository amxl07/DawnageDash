import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreVertical,
    ArrowRight,
    Edit,
    MessageSquare,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    User,
    CalendarCheck,
    Ruler,
    Image as ImageIcon,
    Utensils
} from "lucide-react";
import { formatDisplayDate } from "@/lib/date-utils";
import {
    calculateCompliance,
    calculatePackageProgress,
    checkRedFlag,
    getComplianceColor,
    checkWeeklyReviewStatus,
    calculateOverallConsistency,
    calculateAverageNutrition,
    getLatestDate
} from "@/lib/coach-utils";
import { PackageType } from "./PackageSelectDialog";

// Define simplified interfaces for props
interface Client {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    package_type: PackageType | null;
    package_duration: number | null;
    package_start_date: string | null;
    created_at: string;
}

interface CheckIn {
    user_id: string;
    date: string; // ISO date string
    nutrition_score?: number | null;
}

interface WeeklyCheckIn {
    user_id: string;
    created_at: string;
}

interface Measurement {
    user_id: string;
    date: string;
}

interface Photo {
    user_id: string;
    date: string;
}

interface CoachClientTableProps {
    clients: Client[];
    checkIns: CheckIn[];
    weeklyCheckIns: WeeklyCheckIn[];
    measurements?: Measurement[];
    photos?: Photo[];
    onViewDashboard: (client: Client) => void;
    onEditPackage: (client: Client) => void;
    onMessage?: (client: Client) => void; // Future hook
}

export function CoachClientTable({
    clients,
    checkIns,
    weeklyCheckIns,
    measurements = [],
    photos = [],
    onViewDashboard,
    onEditPackage,
    onMessage
}: CoachClientTableProps) {

    const getPackageBadgeColor = (type: string | null) => {
        switch (type) {
            case 'elite': return "bg-amber-500 hover:bg-amber-600";
            case 'premium': return "bg-amber-500 hover:bg-amber-600"; // Legacy
            case 'standard': return "bg-blue-500 hover:bg-blue-600";
            case 'intermediate': return "bg-blue-500 hover:bg-blue-600"; // Legacy
            case 'beginner': return "bg-slate-500 hover:bg-slate-600";
            case 'basic': return "bg-slate-500 hover:bg-slate-600"; // Legacy
            default: return "bg-gray-500";
        }
    };

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[220px]">Client</TableHead>
                        <TableHead className="w-[120px]">Overall Consistency</TableHead>
                        <TableHead className="w-[150px]">Package Progress</TableHead>
                        <TableHead className="w-[150px]">30-Day Compliance</TableHead>
                        <TableHead className="w-[120px]">Key Metrics</TableHead>
                        <TableHead className="w-[100px]">Nutrition</TableHead>
                        <TableHead className="w-[60px]">Review</TableHead>
                        <TableHead>Last Check-in</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                No active clients found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        clients.map((client) => {
                            // Filter data for this client
                            const clientCheckIns = checkIns.filter(ci => ci.user_id === client.id);
                            const clientMeasurements = measurements.filter(m => m.user_id === client.id);
                            const clientPhotos = photos.filter(p => p.user_id === client.id);

                            // Get check-in dates
                            const checkInDates = clientCheckIns.map(ci => ci.date);

                            // Get last check-in date
                            const sortedCheckIns = [...clientCheckIns].sort((a, b) =>
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                            );
                            const lastCheckIn = sortedCheckIns.length > 0 ? sortedCheckIns[0].date : null;

                            // Weekly Review Check
                            const clientWeeklyReviews = weeklyCheckIns.filter(w => w.user_id === client.id);
                            const sortedWeekly = [...clientWeeklyReviews].sort((a, b) =>
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            );
                            const lastWeeklyReview = sortedWeekly.length > 0 ? sortedWeekly[0].created_at : null;
                            const isWeeklyReviewDone = checkWeeklyReviewStatus(lastWeeklyReview);

                            // Calculations
                            const compliance30d = calculateCompliance(checkInDates);
                            const overallConsistency = calculateOverallConsistency(checkInDates, client.package_start_date || client.created_at);
                            const packageProgress = calculatePackageProgress(client.package_start_date, client.package_duration || 0);
                            const isRedFlag = checkRedFlag(lastCheckIn);
                            const avgNutrition = calculateAverageNutrition(clientCheckIns);

                            // Latest Metrics
                            const lastMeasurementDate = getLatestDate(clientMeasurements);
                            const lastPhotoDate = getLatestDate(clientPhotos);

                            return (
                                <TableRow key={client.id} className="hover:bg-muted/5 cursor-pointer" onClick={() => onViewDashboard(client)}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarImage src={client.avatar_url || ""} alt={client.full_name || ""} />
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {client.full_name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium truncate max-w-[150px]" title={client.full_name || ""}>
                                                    {client.full_name || "Unknown User"}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 border-0 text-white ${getPackageBadgeColor(client.package_type)}`}>
                                                        {client.package_type || 'None'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-sm font-bold ${overallConsistency >= 80 ? 'text-green-600' :
                                                        overallConsistency >= 50 ? 'text-amber-600' : 'text-red-500'
                                                    }`}>
                                                    {overallConsistency}%
                                                </span>
                                            </div>
                                            <Progress value={overallConsistency} className="h-2 w-16"
                                                indicatorClassName={getComplianceColor(overallConsistency)}
                                            />
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1.5 mobile-hide">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground text-[10px]">
                                                    {client.package_duration || 0}m Plan
                                                </span>
                                                <span className="text-[10px] font-medium">{Math.round(packageProgress)}%</span>
                                            </div>
                                            <Progress value={packageProgress} className="h-1.5" />
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium">{compliance30d}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getComplianceColor(compliance30d)}`}
                                                    style={{ width: `${compliance30d}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-[10px]">
                                            <div className="flex items-center gap-1 text-muted-foreground" title="Last Body Measurement">
                                                <Ruler className="w-3 h-3" />
                                                <span>{lastMeasurementDate ? formatDisplayDate(lastMeasurementDate.toISOString()) : '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground" title="Last Progress Photo">
                                                <ImageIcon className="w-3 h-3" />
                                                <span>{lastPhotoDate ? formatDisplayDate(lastPhotoDate.toISOString()) : '-'}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm font-medium">{avgNutrition}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {isWeeklyReviewDone ? (
                                            <div className="text-green-600 flex justify-center" title="Weekly Review Done">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground/30 flex justify-center" title="Pending">
                                                <XCircle className="h-5 w-5" />
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {lastCheckIn ? (
                                            <span className="text-xs font-medium block">
                                                {formatDisplayDate(lastCheckIn)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Never</span>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {isRedFlag ? (
                                            <div className="flex flex-col items-center justify-center text-destructive gap-1" title="Missed 5+ consecutive days">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-green-500 gap-1">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                                onClick={() => onViewDashboard(client)}
                                                title="View Dashboard"
                                            >
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => onViewDashboard(client)}>
                                                        <User className="h-4 w-4 mr-2" />
                                                        View Dashboard
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onEditPackage(client)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit Package
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => onMessage?.(client)} disabled={!onMessage}>
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        Message Client
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
