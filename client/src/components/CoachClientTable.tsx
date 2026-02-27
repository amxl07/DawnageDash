import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  UserX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/date-utils";
import {
  mapLegacyPackage,
  getPackageBadgeColor,
  calculatePackageProgress,
  calculateCompliance,
  getComplianceColor,
  checkRedFlag,
  checkWeeklyReviewStatus,
  checkBodyMeasurementStatus,
  calculateOverallConsistency,
  getLatestDate,
} from "@/lib/coach-utils";

interface CoachClientTableProps {
  clients: any[];
  checkIns: Record<string, any[]>;
  weeklyCheckIns: Record<string, any[]>;
  bodyMeasurements: Record<string, any[]>;
  onRowClick: (client: any) => void;
  onViewDashboard: (clientId: string) => void;
  onEditPackage: (client: any) => void;
  onUnassign: (client: any) => void;
}

export function CoachClientTable({
  clients,
  checkIns,
  weeklyCheckIns,
  bodyMeasurements,
  onRowClick,
  onViewDashboard,
  onEditPackage,
  onUnassign,
}: CoachClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No clients assigned yet.</p>
        <p className="text-sm">
          Head to "Claim Clients" to add clients to your roster.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead className="hidden lg:table-cell">Consistency</TableHead>
            <TableHead className="hidden md:table-cell">Package Progress</TableHead>
            <TableHead className="hidden lg:table-cell">30d Compliance</TableHead>
            <TableHead className="hidden lg:table-cell">Weekly Feedback</TableHead>
            <TableHead className="hidden xl:table-cell">Measurements</TableHead>
            <TableHead className="hidden md:table-cell">Last Check-in</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const clientCheckIns = checkIns[client.id] || [];
            const clientWeeklyCheckIns = weeklyCheckIns[client.id] || [];
            const clientMeasurements = bodyMeasurements[client.id] || [];
            const pkg = mapLegacyPackage(client.package_type);
            const pkgProgress = calculatePackageProgress(
              client.package_start_date,
              client.package_duration
            );
            const compliance = calculateCompliance(clientCheckIns);
            const complianceColor = getComplianceColor(compliance);
            const hasRedFlag = checkRedFlag(clientCheckIns);
            const weeklyReview = checkWeeklyReviewStatus(clientWeeklyCheckIns);
            const measurementStatus = checkBodyMeasurementStatus(clientMeasurements);
            const consistency = calculateOverallConsistency(clientCheckIns);
            const lastCheckIn = getLatestDate(
              clientCheckIns.map((c: any) => c.date || c.created_at)
            );

            return (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => onRowClick(client)}
              >
                {/* Client name + package badge */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={client.avatar_url} />
                      <AvatarFallback className="text-xs font-semibold">
                        {client.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {client.full_name || "Unknown"}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] mt-0.5 capitalize",
                          getPackageBadgeColor(pkg)
                        )}
                      >
                        {pkg}
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                {/* Overall Consistency */}
                <TableCell className="hidden lg:table-cell">
                  <span className={cn("font-semibold", getComplianceColor(consistency))}>
                    {consistency}%
                  </span>
                </TableCell>

                {/* Package Progress */}
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress value={pkgProgress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8">
                      {pkgProgress}%
                    </span>
                  </div>
                </TableCell>

                {/* 30-Day Compliance */}
                <TableCell className="hidden lg:table-cell">
                  <span className={cn("font-semibold", complianceColor)}>
                    {compliance}%
                  </span>
                </TableCell>

                {/* Weekly Feedback */}
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    {weeklyReview.status === "done" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    )}
                    {weeklyReview.status === "pending" && (
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    {weeklyReview.status === "overdue" && (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className="text-xs">{weeklyReview.label}</span>
                  </div>
                </TableCell>

                {/* Body Measurements */}
                <TableCell className="hidden xl:table-cell">
                  <div className="flex items-center gap-1.5">
                    {measurementStatus.status === "done" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    )}
                    {measurementStatus.status === "pending" && (
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    {measurementStatus.status === "overdue" && (
                      <Ruler className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className="text-xs">{measurementStatus.label}</span>
                  </div>
                </TableCell>

                {/* Last Check-in */}
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {lastCheckIn ? formatDisplayDate(lastCheckIn) : "Never"}
                  </span>
                </TableCell>

                {/* Status (Red Flag) */}
                <TableCell className="hidden sm:table-cell">
                  {hasRedFlag ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => onViewDashboard(client.id)}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          View Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onEditPackage(client)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Package
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onUnassign(client)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Unassign Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
