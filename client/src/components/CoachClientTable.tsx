import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MoreVertical,
  ArrowRight,
  Edit,
  UserX,
  CheckCircle2,
  Clock,
  XCircle,
  Ruler,
  Camera,
  Search,
  ChevronUp,
  ChevronDown,
  StickyNote,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/date-utils";
import {
  mapLegacyPackage,
  getPackageBadgeColor,
  calculatePackageProgress,
  checkWeeklyReviewStatus,
  checkBodyMeasurementStatus,
  getLatestDate,
  getWeeklyAlerts,
  checkProgressPhotoStatus,
  calculateAttentionScore,
  parseAssignedPlan,
} from "@/lib/coach-utils";

interface CoachClientTableProps {
  clients: any[];
  checkIns: Record<string, any[]>;
  weeklyCheckIns: Record<string, any[]>;
  bodyMeasurements: Record<string, any[]>;
  progressPhotos: Record<string, any[]>;
  onRowClick: (client: any) => void;
  onViewDashboard: (clientId: string) => void;
  onEditPackage: (client: any) => void;
  onUnassign: (client: any) => void;
  onSaveNote: (clientId: string, note: string) => void;
  savingNoteFor: string | null;
}

type SortField =
  | "name"
  | "package"
  | "attention"
  | "lastCheckin";
type SortDirection = "asc" | "desc";

export function CoachClientTable({
  clients,
  checkIns,
  weeklyCheckIns,
  bodyMeasurements,
  progressPhotos,
  onRowClick,
  onViewDashboard,
  onEditPackage,
  onUnassign,
  onSaveNote,
  savingNoteFor,
}: CoachClientTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("attention");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  // Pre-compute all derived data for sorting/filtering
  const clientsWithData = useMemo(() => {
    return clients.map((client) => {
      const clientCheckIns = checkIns[client.id] || [];
      const clientWeekly = weeklyCheckIns[client.id] || [];
      const clientMeasurements = bodyMeasurements[client.id] || [];
      const clientPhotos = progressPhotos[client.id] || [];

      const weeklyAlerts = getWeeklyAlerts(clientWeekly);
      const weeklyReview = checkWeeklyReviewStatus(clientWeekly);
      const photoStatus = checkProgressPhotoStatus(clientPhotos);
      const measurementStatus = checkBodyMeasurementStatus(clientMeasurements);
      const attention = calculateAttentionScore(
        clientCheckIns,
        clientWeekly,
        clientMeasurements,
        clientPhotos
      );
      const assignedPlan = parseAssignedPlan(
        client.active_workout_plan,
        client.active_meal_plan
      );
      const pkg = mapLegacyPackage(client.package_type);
      const pkgProgress = calculatePackageProgress(
        client.package_start_date,
        client.package_duration
      );
      const lastCheckIn = getLatestDate(
        clientCheckIns.map((c: any) => c.date || c.created_at)
      );

      return {
        client,
        weeklyAlerts,
        weeklyReview,
        photoStatus,
        measurementStatus,
        attention,
        assignedPlan,
        pkg,
        pkgProgress,
        lastCheckIn,
      };
    });
  }, [clients, checkIns, weeklyCheckIns, bodyMeasurements, progressPhotos]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clientsWithData;
    const q = searchQuery.toLowerCase();
    return clientsWithData.filter((item) =>
      (item.client.full_name || "").toLowerCase().includes(q)
    );
  }, [clientsWithData, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.client.full_name || "").localeCompare(
            b.client.full_name || ""
          );
          break;
        case "package":
          cmp = a.pkgProgress - b.pkgProgress;
          break;
        case "attention":
          cmp = a.attention.score - b.attention.score;
          break;
        case "lastCheckin": {
          const aDate = a.lastCheckIn || "1970-01-01";
          const bDate = b.lastCheckIn || "1970-01-01";
          cmp = aDate.localeCompare(bDate);
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

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
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Client <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("package")}
              >
                <div className="flex items-center gap-1">
                  Package <SortIcon field="package" />
                </div>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Feedback</TableHead>
              <TableHead className="hidden xl:table-cell">Photos</TableHead>
              <TableHead className="hidden xl:table-cell">
                Measurements
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("lastCheckin")}
              >
                <div className="flex items-center gap-1">
                  Last Check-in <SortIcon field="lastCheckin" />
                </div>
              </TableHead>
              <TableHead
                className="hidden sm:table-cell cursor-pointer select-none"
                onClick={() => handleSort("attention")}
              >
                <div className="flex items-center gap-1">
                  Attention <SortIcon field="attention" />
                </div>
              </TableHead>
              <TableHead className="hidden lg:table-cell">Notes</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(
              ({
                client,
                weeklyAlerts,
                weeklyReview,
                photoStatus,
                measurementStatus,
                attention,
                assignedPlan,
                pkg,
                pkgProgress,
                lastCheckIn,
              }) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick(client)}
                >
                  {/* Client name + package badge + assigned plans */}
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
                        {(assignedPlan.workout || assignedPlan.meal) && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                            {assignedPlan.workout && (
                              <span>{assignedPlan.workout}</span>
                            )}
                            {assignedPlan.workout && assignedPlan.meal && (
                              <span> · </span>
                            )}
                            {assignedPlan.meal && (
                              <span>{assignedPlan.meal}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
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

                  {/* Weekly Feedback + Alerts */}
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
                      {weeklyAlerts.hasAlerts && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[250px]">
                            <div className="space-y-1">
                              {weeklyAlerts.alerts.map((alert, i) => (
                                <p key={i} className="text-xs">
                                  {alert}
                                </p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  {/* Progress Photos */}
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex items-center gap-1.5">
                      {photoStatus.status === "done" && (
                        <Camera className="w-3.5 h-3.5 text-green-600" />
                      )}
                      {photoStatus.status === "pending" && (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {photoStatus.status === "overdue" && (
                        <Camera className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="text-xs">{photoStatus.label}</span>
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
                      <span className="text-xs">
                        {measurementStatus.label}
                      </span>
                    </div>
                  </TableCell>

                  {/* Last Check-in */}
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {lastCheckIn
                        ? formatDisplayDate(lastCheckIn)
                        : "Never"}
                    </span>
                  </TableCell>

                  {/* Attention Score */}
                  <TableCell className="hidden sm:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold cursor-default",
                            attention.level === "high" &&
                              "bg-red-500/15 text-red-700 border-red-300",
                            attention.level === "medium" &&
                              "bg-amber-500/15 text-amber-700 border-amber-300",
                            attention.level === "low" &&
                              "bg-green-500/15 text-green-700 border-green-300"
                          )}
                        >
                          {attention.level === "high" && "High"}
                          {attention.level === "medium" && "Medium"}
                          {attention.level === "low" && "Low"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        {attention.reasons.length > 0 ? (
                          <div className="space-y-1">
                            {attention.reasons.map((reason, i) => (
                              <p key={i} className="text-xs">
                                {reason}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs">All good!</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Coach Notes */}
                  <TableCell
                    className="hidden lg:table-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover
                      open={openNoteId === client.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenNoteId(client.id);
                          setNoteText((prev) => ({
                            ...prev,
                            [client.id]:
                              prev[client.id] ?? client.coach_note ?? "",
                          }));
                        } else {
                          setOpenNoteId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            client.coach_note && "text-blue-600"
                          )}
                        >
                          <StickyNote className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72"
                        side="left"
                        align="start"
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Coach Notes</p>
                          <Textarea
                            placeholder="Add a note about this client..."
                            value={noteText[client.id] ?? ""}
                            onChange={(e) =>
                              setNoteText((prev) => ({
                                ...prev,
                                [client.id]: e.target.value,
                              }))
                            }
                            rows={3}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={savingNoteFor === client.id}
                            onClick={() => {
                              onSaveNote(
                                client.id,
                                noteText[client.id] ?? ""
                              );
                              setOpenNoteId(null);
                            }}
                          >
                            {savingNoteFor === client.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Save
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
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
              )
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No clients match "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
