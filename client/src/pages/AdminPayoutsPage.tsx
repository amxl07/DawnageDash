import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IndianRupee,
  CircleCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchAllCoaches, fetchAllClients, fetchCoachClientHistory } from "@/lib/admin-utils";
import {
  fetchCoachCommissions,
  fetchClientPayments,
  fetchCoachPayouts,
  upsertCoachPayout,
  calculateMonthlyCoachPayouts,
  calculatePayoutSummary,
} from "@/lib/admin-business-utils";
import type { PayoutWarnings } from "@/lib/admin-business-utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPayoutStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500/15 text-green-600 border-green-500/30"><CircleCheck className="w-3 h-3 mr-1" />Paid</Badge>;
    case "pending":
    default:
      return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }
}

function WarningsBanner({ warnings }: { warnings: PayoutWarnings }) {
  const hasWarnings =
    warnings.clientsWithoutHistory.length > 0 ||
    warnings.clientsWithoutPackageDuration.length > 0;

  if (!hasWarnings) return null;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            {warnings.clientsWithoutHistory.length > 0 && (
              <p>
                <span className="font-medium text-yellow-700">
                  {warnings.clientsWithoutHistory.length} client(s) without assignment history
                </span>
                <span className="text-muted-foreground"> (using current coach as fallback): </span>
                <span className="text-muted-foreground">{warnings.clientsWithoutHistory.join(", ")}</span>
              </p>
            )}
            {warnings.clientsWithoutPackageDuration.length > 0 && (
              <p>
                <span className="font-medium text-red-600">
                  {warnings.clientsWithoutPackageDuration.length} client(s) missing package duration
                </span>
                <span className="text-muted-foreground"> (skipped from calculation): </span>
                <span className="text-muted-foreground">{warnings.clientsWithoutPackageDuration.join(", ")}</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState("monthly");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  // Record payout dialog state
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedCoachForPayout, setSelectedCoachForPayout] = useState<any>(null);
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutDate, setPayoutDate] = useState(now.toISOString().split("T")[0]);
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutAmountOverride, setPayoutAmountOverride] = useState("");

  // ---- Data fetching ----
  const { data: coaches = [] } = useQuery({ queryKey: ["admin-coaches"], queryFn: fetchAllCoaches });
  const { data: clients = [] } = useQuery({ queryKey: ["admin-all-clients"], queryFn: fetchAllClients });
  const { data: commissions = [] } = useQuery({ queryKey: ["admin-commissions"], queryFn: fetchCoachCommissions });
  const { data: payments = [] } = useQuery({ queryKey: ["admin-payments"], queryFn: fetchClientPayments });
  const { data: history = [], isLoading: historyLoading } = useQuery({ queryKey: ["admin-coach-history"], queryFn: fetchCoachClientHistory });
  const { data: allPayouts = [], isLoading: payoutsLoading } = useQuery({ queryKey: ["admin-payouts"], queryFn: fetchCoachPayouts });

  const isLoading = historyLoading || payoutsLoading;

  // ---- Computed data ----
  const { results: monthlyPayouts, warnings } = useMemo(
    () => calculateMonthlyCoachPayouts(coaches, clients, payments, commissions, history, selectedMonth, selectedYear),
    [coaches, clients, payments, commissions, history, selectedMonth, selectedYear],
  );

  const payoutsForMonth = useMemo(
    () => allPayouts.filter((p: any) => p.payout_month === selectedMonth && p.payout_year === selectedYear),
    [allPayouts, selectedMonth, selectedYear],
  );

  const payoutByCoach = useMemo(
    () => new Map(payoutsForMonth.map((p: any) => [p.coach_id, p])),
    [payoutsForMonth],
  );

  const summary = useMemo(
    () => calculatePayoutSummary(monthlyPayouts, payoutsForMonth),
    [monthlyPayouts, payoutsForMonth],
  );

  // Merge calculated payouts with recorded payout status
  const coachPayoutRows = useMemo(() => {
    return monthlyPayouts
      .map((cp) => {
        const record = payoutByCoach.get(cp.coachId);
        return {
          ...cp,
          payoutRecord: record || null,
          status: record?.status || "pending",
        };
      })
      .sort((a, b) => b.commissionEarned - a.commissionEarned);
  }, [monthlyPayouts, payoutByCoach]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    const coachMap = new Map(coaches.map((c: any) => [c.id, c]));
    let list = allPayouts.map((p: any) => {
      const coach = coachMap.get(p.coach_id);
      return {
        ...p,
        coachName: coach?.full_name || coach?.email || "Unknown",
      };
    });

    if (historyFilter !== "all") {
      list = list.filter((p: any) => p.status === historyFilter);
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter((p: any) => (p.coachName || "").toLowerCase().includes(q));
    }

    return list;
  }, [allPayouts, coaches, historyFilter, historySearch]);

  // ---- Mutations ----
  const recordPayoutMutation = useMutation({
    mutationFn: (params: {
      coachId: string;
      grossAmount: number;
      commissionPercentage: number;
      commissionAmount: number;
      method?: string;
      date?: string;
      notes?: string;
    }) =>
      upsertCoachPayout(
        params.coachId,
        selectedMonth,
        selectedYear,
        params.grossAmount,
        params.commissionPercentage,
        params.commissionAmount,
        "paid",
        params.method,
        params.date,
        params.notes,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      toast({ title: "Payout recorded successfully" });
      setPayoutDialogOpen(false);
      resetPayoutDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ---- Handlers ----
  function resetPayoutDialog() {
    setSelectedCoachForPayout(null);
    setPayoutMethod("");
    setPayoutDate(new Date().toISOString().split("T")[0]);
    setPayoutNotes("");
    setPayoutAmountOverride("");
  }

  function handleMarkAsPaid(row: any) {
    setSelectedCoachForPayout(row);
    setPayoutAmountOverride(String(Math.round(row.commissionEarned * 100) / 100));
    setPayoutDialogOpen(true);
  }

  function handlePrevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function handleNextMonth() {
    const isCurrentMo = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    if (isCurrentMo) return;

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }

  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();

  // Build year options (2024 to current year)
  const yearOptions = [];
  for (let y = 2024; y <= now.getFullYear(); y++) {
    yearOptions.push(y);
  }

  // Build month options (cap at current month if current year is selected)
  const monthOptions = MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name })).filter(
    (m) => selectedYear < now.getFullYear() || m.value <= now.getMonth() + 1,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coach Payouts</h1>
        <p className="text-muted-foreground">
          Monthly coach commission payouts — payout for {MONTH_NAMES[selectedMonth - 1]} is due by{" "}
          {MONTH_NAMES[selectedMonth % 12]} 4th, {selectedMonth === 12 ? selectedYear + 1 : selectedYear}
        </p>
      </div>

      {/* Warnings Banner */}
      <WarningsBanner warnings={warnings} />

      {/* Month/Year Selector */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isCurrentMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
            <IndianRupee className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPayable)}</div>
            <p className="text-xs text-muted-foreground">
              {coachPayoutRows.filter((r) => r.commissionEarned > 0).length} coaches with earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid Out</CardTitle>
            <CircleCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaidOut)}</div>
            <p className="text-xs text-muted-foreground">
              {payoutsForMonth.filter((p: any) => p.status === "paid").length} payouts completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="monthly">Monthly Payouts</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* MONTHLY PAYOUTS TAB */}
        {/* ================================================================ */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} — Coach Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead className="text-right">Commission %</TableHead>
                    <TableHead className="text-right">Monthly Gross</TableHead>
                    <TableHead className="text-right">Commission Earned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachPayoutRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No coaches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    coachPayoutRows.map((row) => (
                      <TableRow key={row.coachId} className={row.commissionEarned === 0 ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.coachName}</p>
                            <p className="text-xs text-muted-foreground">{row.totalClients} active clients</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.commissionPercentage > 0 ? (
                            `${row.commissionPercentage}%`
                          ) : (
                            <span className="text-red-500 text-xs">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.monthlyGross)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.commissionEarned)}</TableCell>
                        <TableCell>{getPayoutStatusBadge(row.status)}</TableCell>
                        <TableCell className="text-right">
                          {row.commissionEarned > 0 && row.status !== "paid" && (
                            <Button size="sm" onClick={() => handleMarkAsPaid(row)}>
                              <Wallet className="w-4 h-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          {row.status === "paid" && row.payoutRecord && (
                            <span className="text-xs text-muted-foreground">
                              {row.payoutRecord.payment_method?.replace("_", " ") || "—"} &middot;{" "}
                              {row.payoutRecord.payment_date || "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* PAYOUT HISTORY TAB */}
        {/* ================================================================ */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by coach name..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={historyFilter} onValueChange={setHistoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Monthly Gross</TableHead>
                    <TableHead className="text-right">Commission %</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No payout records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.coachName}</TableCell>
                        <TableCell>
                          {MONTH_NAMES[record.payout_month - 1]} {record.payout_year}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(record.gross_amount || 0))}</TableCell>
                        <TableCell className="text-right">{parseFloat(record.commission_percentage || 0)}%</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(parseFloat(record.commission_amount || 0))}
                        </TableCell>
                        <TableCell className="capitalize">{record.payment_method?.replace("_", " ") || "—"}</TableCell>
                        <TableCell>{record.payment_date || "—"}</TableCell>
                        <TableCell>{getPayoutStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* RECORD PAYOUT DIALOG */}
      {/* ================================================================ */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payout</DialogTitle>
            <DialogDescription>
              {selectedCoachForPayout?.coachName} — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Monthly Gross (Deal Portion)</span>
                <p className="font-semibold">{formatCurrency(selectedCoachForPayout?.monthlyGross || 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Commission Rate</span>
                <p className="font-semibold">{selectedCoachForPayout?.commissionPercentage || 0}%</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payout Amount (INR)</Label>
              <Input
                type="number"
                value={payoutAmountOverride}
                onChange={(e) => setPayoutAmountOverride(e.target.value)}
                placeholder="Commission amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Any notes about this payout"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayoutDialogOpen(false); resetPayoutDialog(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedCoachForPayout) return;
                const amount = parseFloat(payoutAmountOverride) || selectedCoachForPayout.commissionEarned;
                recordPayoutMutation.mutate({
                  coachId: selectedCoachForPayout.coachId,
                  grossAmount: selectedCoachForPayout.monthlyGross,
                  commissionPercentage: selectedCoachForPayout.commissionPercentage,
                  commissionAmount: Math.round(amount * 100) / 100,
                  method: payoutMethod || undefined,
                  date: payoutDate || undefined,
                  notes: payoutNotes || undefined,
                });
              }}
              disabled={recordPayoutMutation.isPending || !payoutAmountOverride}
            >
              {recordPayoutMutation.isPending ? "Recording..." : "Record Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
