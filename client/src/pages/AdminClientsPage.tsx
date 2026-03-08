import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchAllCoaches,
  fetchAllClients,
  fetchCheckInsForClients,
  groupByField,
} from "@/lib/admin-utils";
import {
  calculateCompliance,
  getComplianceColor,
  mapLegacyPackage,
  getPackageBadgeColor,
  getLatestDate,
} from "@/lib/coach-utils";
import { formatDisplayDate } from "@/lib/date-utils";
import { differenceInDays, parseISO } from "date-fns";

type SortField = "name" | "coach" | "compliance" | "lastCheckin";
type SortDirection = "asc" | "desc";

export default function AdminClientsPage() {
  const [search, setSearch] = useState("");
  const [filterCoach, setFilterCoach] = useState<string>("all");
  const [filterPackage, setFilterPackage] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { setViewedUserId, setViewedCoachId } = useAuth();
  const [, setLocation] = useLocation();

  const handleViewClient = useCallback((clientId: string, coachId: string | null) => {
    if (coachId) {
      setViewedCoachId(coachId);
    }
    setViewedUserId(clientId);
    setLocation("/");
  }, [setViewedUserId, setViewedCoachId, setLocation]);

  const { data: coaches } = useQuery({
    queryKey: ["admin-coaches"],
    queryFn: fetchAllCoaches,
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin-all-clients"],
    queryFn: fetchAllClients,
  });

  const clientIds = useMemo(() => (clients || []).map((c: any) => c.id), [clients]);

  const { data: checkInsData } = useQuery({
    queryKey: ["admin-all-checkins", clientIds],
    queryFn: () => fetchCheckInsForClients(clientIds),
    enabled: clientIds.length > 0,
  });

  const checkInsByClient = useMemo(() => groupByField(checkInsData || [], "user_id"), [checkInsData]);

  // Coach name lookup
  const coachNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (coaches || []).forEach((c: any) => {
      map[c.id] = c.full_name || c.email || "Unknown";
    });
    return map;
  }, [coaches]);

  // Build client rows with computed fields
  const clientRows = useMemo(() => {
    return (clients || []).map((client: any) => {
      const checkIns = checkInsByClient[client.id] || [];
      const compliance = calculateCompliance(checkIns);
      const lastCheckIn = getLatestDate(checkIns.map((c: any) => c.date));
      const coachName = client.coach_id ? coachNameMap[client.coach_id] || "Unknown" : null;
      const packageName = mapLegacyPackage(client.package_type);

      let status: "active" | "inactive" | "unassigned" = "active";
      if (!client.coach_id) {
        status = "unassigned";
      } else if (!lastCheckIn || differenceInDays(new Date(), parseISO(lastCheckIn)) > 14) {
        status = "inactive";
      }

      return { client, compliance, lastCheckIn, coachName, packageName, status };
    });
  }, [clients, checkInsByClient, coachNameMap]);

  // Filter
  const filtered = useMemo(() => {
    return clientRows.filter((row) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !row.client.full_name?.toLowerCase().includes(q) &&
          !row.client.email?.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterCoach !== "all") {
        if (filterCoach === "unassigned" && row.client.coach_id) return false;
        if (filterCoach !== "unassigned" && row.client.coach_id !== filterCoach) return false;
      }
      if (filterPackage !== "all" && row.packageName !== filterPackage) return false;
      return true;
    });
  }, [clientRows, search, filterCoach, filterPackage]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.client.full_name || a.client.email || "").localeCompare(
            b.client.full_name || b.client.email || ""
          );
          break;
        case "coach":
          cmp = (a.coachName || "zzz").localeCompare(b.coachName || "zzz");
          break;
        case "compliance":
          cmp = a.compliance - b.compliance;
          break;
        case "lastCheckin":
          cmp = (a.lastCheckIn || "0000").localeCompare(b.lastCheckIn || "0000");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">All Clients</h1>
        <p className="text-muted-foreground mt-1">
          Platform-wide client overview ({clients?.length || 0} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCoach} onValueChange={setFilterCoach}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by coach" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coaches</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {(coaches || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name || c.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPackage} onValueChange={setFilterPackage}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Packages</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
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
                className="cursor-pointer select-none"
                onClick={() => handleSort("coach")}
              >
                <div className="flex items-center gap-1">
                  Coach <SortIcon field="coach" />
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell">Package</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("compliance")}
              >
                <div className="flex items-center gap-1">
                  Compliance <SortIcon field="compliance" />
                </div>
              </TableHead>
              <TableHead
                className="hidden md:table-cell cursor-pointer select-none"
                onClick={() => handleSort("lastCheckin")}
              >
                <div className="flex items-center gap-1">
                  Last Check-in <SortIcon field="lastCheckin" />
                </div>
              </TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search || filterCoach !== "all" || filterPackage !== "all"
                    ? "No clients match your filters"
                    : "No clients found"}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(({ client, compliance, lastCheckIn, coachName, packageName, status }) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewClient(client.id, client.coach_id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {coachName ? (
                      <span className="text-sm">{coachName}</span>
                    ) : (
                      <span className="text-sm text-amber-600">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={cn("text-[10px] capitalize", getPackageBadgeColor(packageName))}>
                      {packageName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-sm font-semibold", getComplianceColor(compliance))}>
                      {compliance}%
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {lastCheckIn ? formatDisplayDate(lastCheckIn) : "Never"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold capitalize",
                        status === "active" && "bg-green-500/15 text-green-700 border-green-300",
                        status === "inactive" && "bg-red-500/15 text-red-700 border-red-300",
                        status === "unassigned" && "bg-amber-500/15 text-amber-700 border-amber-300"
                      )}
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewClient(client.id, client.coach_id);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
