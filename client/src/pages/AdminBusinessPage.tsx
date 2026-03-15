import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
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
  TrendingUp,
  TrendingDown,
  Users,
  Percent,
  Plus,
  Pencil,
  Eye,
  Search,
  CircleCheck,
  CircleDot,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { fetchAllCoaches, fetchAllClients } from "@/lib/admin-utils";
import {
  fetchCoachCommissions,
  upsertCoachCommission,
  fetchClientPayments,
  upsertClientPayment,
  fetchPaymentTransactions,
  addPaymentTransaction,
  deletePaymentTransaction,
  calculateFinancialSummary,
  calculateCoachEarnings,
  fetchTransactionsForPayment,
} from "@/lib/admin-business-utils";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500/15 text-green-600 border-green-500/30"><CircleCheck className="w-3 h-3 mr-1" />Paid</Badge>;
    case "partial":
      return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30"><CircleDot className="w-3 h-3 mr-1" />Partial</Badge>;
    case "pending":
      return <Badge className="bg-red-500/15 text-red-600 border-red-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminBusinessPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---- Data fetching ----
  const { data: coaches = [] } = useQuery({ queryKey: ["admin-coaches"], queryFn: fetchAllCoaches });
  const { data: clients = [] } = useQuery({ queryKey: ["admin-all-clients"], queryFn: fetchAllClients });
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery({ queryKey: ["admin-commissions"], queryFn: fetchCoachCommissions });
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({ queryKey: ["admin-payments"], queryFn: fetchClientPayments });
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({ queryKey: ["admin-transactions"], queryFn: fetchPaymentTransactions });

  const isLoading = commissionsLoading || paymentsLoading || transactionsLoading;

  // ---- State ----
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [commissionSearch, setCommissionSearch] = useState("");

  // Dialog states
  const [setAmountDialogOpen, setSetAmountDialogOpen] = useState(false);
  const [selectedClientForAmount, setSelectedClientForAmount] = useState<any>(null);
  const [amountInput, setAmountInput] = useState("");
  const [amountNotes, setAmountNotes] = useState("");

  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [selectedPaymentForTransaction, setSelectedPaymentForTransaction] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionMethod, setTransactionMethod] = useState("");
  const [transactionNotes, setTransactionNotes] = useState("");

  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedCoachForCommission, setSelectedCoachForCommission] = useState<any>(null);
  const [commissionInput, setCommissionInput] = useState("");

  const [viewTransactionsDialogOpen, setViewTransactionsDialogOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<any>(null);
  const [viewingTransactions, setViewingTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // ---- Computed data ----
  const summary = useMemo(
    () => calculateFinancialSummary(clients, payments, transactions, commissions),
    [clients, payments, transactions, commissions],
  );

  const coachEarnings = useMemo(
    () => calculateCoachEarnings(coaches, clients, payments, transactions, commissions),
    [coaches, clients, payments, transactions, commissions],
  );

  // Maps for quick lookups
  const clientMap = useMemo(() => new Map(clients.map((c: any) => [c.id, c])), [clients]);
  const coachMap = useMemo(() => new Map(coaches.map((c: any) => [c.id, c])), [coaches]);
  const paymentByClient = useMemo(() => new Map(payments.map((p: any) => [p.client_id, p])), [payments]);
  const commissionByCoach = useMemo(() => new Map(commissions.map((c: any) => [c.coach_id, c])), [commissions]);

  // Transactions grouped by payment
  const transactionsByPayment = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const current = map.get(t.client_payment_id) || 0;
      map.set(t.client_payment_id, current + parseFloat(t.amount || 0));
    }
    return map;
  }, [transactions]);

  // ---- Filtered client payments ----
  const filteredPaymentClients = useMemo(() => {
    // Show all clients that have a payment record OR all clients if search is active
    let list = clients.map((client: any) => {
      const payment = paymentByClient.get(client.id);
      const coach = client.coach_id ? coachMap.get(client.coach_id) : null;
      const totalPaid = payment ? (transactionsByPayment.get(payment.id) || 0) : 0;
      const totalAmount = payment ? parseFloat(payment.total_amount || 0) : 0;

      return {
        ...client,
        coachName: coach?.full_name || coach?.email || "Unassigned",
        payment,
        totalAmount,
        totalPaid,
        pending: totalAmount - totalPaid,
        status: payment?.payment_status || "no_deal",
      };
    });

    // Filter by status
    if (paymentFilter === "paid") list = list.filter((c: any) => c.status === "paid");
    else if (paymentFilter === "partial") list = list.filter((c: any) => c.status === "partial");
    else if (paymentFilter === "pending") list = list.filter((c: any) => c.status === "pending");
    else if (paymentFilter === "no_deal") list = list.filter((c: any) => c.status === "no_deal");

    // Search
    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase();
      list = list.filter(
        (c: any) =>
          (c.full_name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.coachName || "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [clients, paymentByClient, coachMap, transactionsByPayment, paymentFilter, paymentSearch]);

  // ---- Filtered coaches for commission tab ----
  const filteredCoaches = useMemo(() => {
    let list = coachEarnings;
    if (commissionSearch.trim()) {
      const q = commissionSearch.toLowerCase();
      list = list.filter((c: any) => (c.coachName || "").toLowerCase().includes(q));
    }
    return list;
  }, [coachEarnings, commissionSearch]);

  // ---- Mutations ----
  const setAmountMutation = useMutation({
    mutationFn: ({ clientId, amount, notes }: { clientId: string; amount: number; notes?: string }) =>
      upsertClientPayment(clientId, amount, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast({ title: "Deal amount set successfully" });
      setSetAmountDialogOpen(false);
      resetAmountDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const recordTransactionMutation = useMutation({
    mutationFn: ({
      paymentId,
      amount,
      date,
      method,
      notes,
    }: {
      paymentId: string;
      amount: number;
      date: string;
      method?: string;
      notes?: string;
    }) => addPaymentTransaction(paymentId, amount, date, method, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast({ title: "Payment recorded successfully" });
      setRecordPaymentDialogOpen(false);
      resetTransactionDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const setCommissionMutation = useMutation({
    mutationFn: ({ coachId, percentage }: { coachId: string; percentage: number }) =>
      upsertCoachCommission(coachId, percentage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast({ title: "Commission updated successfully" });
      setCommissionDialogOpen(false);
      resetCommissionDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: ({ transactionId, paymentId }: { transactionId: string; paymentId: string }) =>
      deletePaymentTransaction(transactionId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast({ title: "Transaction deleted" });
      // Refresh the viewing dialog
      if (viewingPayment) {
        handleViewTransactions(viewingPayment);
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ---- Handlers ----
  function resetAmountDialog() {
    setSelectedClientForAmount(null);
    setAmountInput("");
    setAmountNotes("");
  }

  function resetTransactionDialog() {
    setSelectedPaymentForTransaction(null);
    setTransactionAmount("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setTransactionMethod("");
    setTransactionNotes("");
  }

  function resetCommissionDialog() {
    setSelectedCoachForCommission(null);
    setCommissionInput("");
  }

  function handleSetAmount(client: any) {
    setSelectedClientForAmount(client);
    const existing = paymentByClient.get(client.id);
    setAmountInput(existing ? String(parseFloat(existing.total_amount)) : "");
    setAmountNotes(existing?.notes || "");
    setSetAmountDialogOpen(true);
  }

  function handleRecordPayment(client: any) {
    const payment = paymentByClient.get(client.id);
    if (!payment) {
      toast({ title: "Set deal amount first", variant: "destructive" });
      return;
    }
    setSelectedPaymentForTransaction({ ...payment, clientName: client.full_name || client.email });
    setRecordPaymentDialogOpen(true);
  }

  function handleSetCommission(coach: any) {
    setSelectedCoachForCommission(coach);
    const existing = commissionByCoach.get(coach.coachId);
    setCommissionInput(existing ? String(parseFloat(existing.commission_percentage)) : String(coach.commissionPercentage || ""));
    setCommissionDialogOpen(true);
  }

  const handleViewTransactions = useCallback(async (payment: any) => {
    setViewingPayment(payment);
    setLoadingTransactions(true);
    setViewTransactionsDialogOpen(true);
    try {
      const txns = await fetchTransactionsForPayment(payment.id);
      setViewingTransactions(txns);
    } catch {
      setViewingTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

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
        <h1 className="text-2xl font-bold tracking-tight">Business & Finance</h1>
        <p className="text-muted-foreground">Manage client payments, coach commissions, and revenue tracking</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* OVERVIEW TAB */}
        {/* ================================================================ */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">{payments.length} client deals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCollected)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalRevenue > 0
                    ? `${((summary.totalCollected / summary.totalRevenue) * 100).toFixed(0)}% collected`
                    : "No deals yet"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalPending)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.partialCount} partial, {summary.pendingCount} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Coach Commissions</CardTitle>
                <Percent className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalCommissions)}</div>
                <p className="text-xs text-muted-foreground">
                  Net: {formatCurrency(summary.netRevenue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Status Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Fully Paid</span>
                  </div>
                  <span className="font-semibold">{summary.paidCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Partial Payment</span>
                  </div>
                  <span className="font-semibold">{summary.partialCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Pending (No Payment)</span>
                  </div>
                  <span className="font-semibold">{summary.pendingCount}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-sm">No Deal Set</span>
                  </div>
                  <span className="font-semibold">{clients.length - payments.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coach Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[240px] overflow-y-auto">
                  {coachEarnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No coaches found</p>
                  ) : (
                    coachEarnings.map((coach: any) => (
                      <div key={coach.coachId} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-sm font-medium">{coach.coachName}</p>
                          <p className="text-xs text-muted-foreground">
                            {coach.commissionPercentage}% commission &middot; {coach.totalClients} clients
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(coach.commissionEarned)}</p>
                          <p className="text-xs text-muted-foreground">
                            of {formatCurrency(coach.totalCollected)} collected
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions recorded yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map((t: any) => {
                      // Find client name from payment -> client
                      const payment = payments.find((p: any) => p.id === t.client_payment_id);
                      const client = payment ? clientMap.get(payment.client_id) : null;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">{t.payment_date}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {client?.full_name || client?.email || "—"}
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-green-600">
                            {formatCurrency(parseFloat(t.amount))}
                          </TableCell>
                          <TableCell className="text-sm capitalize">{t.payment_method || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {t.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* PAYMENTS TAB */}
        {/* ================================================================ */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, email, or coach..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="no_deal">No Deal Set</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead className="text-right">Deal Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaymentClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No clients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPaymentClients.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{client.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{client.coachName}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {client.payment ? formatCurrency(client.totalAmount) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-green-600">
                          {client.totalPaid > 0 ? formatCurrency(client.totalPaid) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-red-600">
                          {client.pending > 0 ? formatCurrency(client.pending) : client.payment ? "0" : "—"}
                        </TableCell>
                        <TableCell>
                          {client.payment ? getStatusBadge(client.status) : (
                            <Badge variant="outline" className="text-muted-foreground">No Deal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetAmount(client)}
                              title={client.payment ? "Edit deal amount" : "Set deal amount"}
                            >
                              {client.payment ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </Button>
                            {client.payment && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRecordPayment(client)}
                                  title="Record payment"
                                >
                                  <IndianRupee className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewTransactions(client.payment)}
                                  title="View transactions"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
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
        {/* COMMISSIONS TAB */}
        {/* ================================================================ */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coaches..."
              value={commissionSearch}
              onChange={(e) => setCommissionSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead className="text-center">Commission %</TableHead>
                    <TableHead className="text-center">Clients</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Commission Earned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoaches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No coaches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCoaches.map((coach: any) => (
                      <TableRow key={coach.coachId}>
                        <TableCell className="font-medium text-sm">{coach.coachName}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {coach.commissionPercentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{coach.totalClients}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(coach.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-sm text-green-600 font-medium">
                          {formatCurrency(coach.totalCollected)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-red-600">
                          {formatCurrency(coach.totalPending)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {formatCurrency(coach.commissionEarned)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetCommission(coach)}
                            title="Set commission %"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totals row */}
          {filteredCoaches.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total across all coaches</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="font-semibold">{formatCurrency(summary.totalRevenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Collected</p>
                      <p className="font-semibold text-green-600">{formatCurrency(summary.totalCollected)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Commissions</p>
                      <p className="font-semibold">{formatCurrency(summary.totalCommissions)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Net Revenue</p>
                      <p className="font-semibold">{formatCurrency(summary.netRevenue)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* DIALOGS */}
      {/* ================================================================ */}

      {/* Set Deal Amount Dialog */}
      <Dialog open={setAmountDialogOpen} onOpenChange={setSetAmountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedClientForAmount?.payment ? "Edit Deal Amount" : "Set Deal Amount"}
            </DialogTitle>
            <DialogDescription>
              {selectedClientForAmount?.full_name || selectedClientForAmount?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Total Amount (INR)</Label>
              <Input
                type="number"
                placeholder="e.g. 30000"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. 3-month package, referred by..."
                value={amountNotes}
                onChange={(e) => setAmountNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetAmountDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amount = parseFloat(amountInput);
                if (!amount || amount <= 0) {
                  toast({ title: "Enter a valid amount", variant: "destructive" });
                  return;
                }
                setAmountMutation.mutate({
                  clientId: selectedClientForAmount.id,
                  amount,
                  notes: amountNotes || undefined,
                });
              }}
              disabled={setAmountMutation.isPending}
            >
              {setAmountMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment / Transaction Dialog */}
      <Dialog open={recordPaymentDialogOpen} onOpenChange={setRecordPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedPaymentForTransaction?.clientName} &mdash; Deal:{" "}
              {selectedPaymentForTransaction
                ? formatCurrency(parseFloat(selectedPaymentForTransaction.total_amount))
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount Received (INR)</Label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={transactionMethod} onValueChange={setTransactionMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. First installment"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amount = parseFloat(transactionAmount);
                if (!amount || amount <= 0) {
                  toast({ title: "Enter a valid amount", variant: "destructive" });
                  return;
                }
                if (!transactionDate) {
                  toast({ title: "Select a date", variant: "destructive" });
                  return;
                }
                recordTransactionMutation.mutate({
                  paymentId: selectedPaymentForTransaction.id,
                  amount,
                  date: transactionDate,
                  method: transactionMethod || undefined,
                  notes: transactionNotes || undefined,
                });
              }}
              disabled={recordTransactionMutation.isPending}
            >
              {recordTransactionMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Commission Dialog */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Commission Percentage</DialogTitle>
            <DialogDescription>
              {selectedCoachForCommission?.coachName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Commission Percentage (%)</Label>
              <Input
                type="number"
                placeholder="e.g. 15"
                min="0"
                max="100"
                step="0.5"
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The coach will earn this percentage of the collected payment amount from their clients.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const pct = parseFloat(commissionInput);
                if (isNaN(pct) || pct < 0 || pct > 100) {
                  toast({ title: "Enter a valid percentage (0-100)", variant: "destructive" });
                  return;
                }
                setCommissionMutation.mutate({
                  coachId: selectedCoachForCommission.coachId,
                  percentage: pct,
                });
              }}
              disabled={setCommissionMutation.isPending}
            >
              {setCommissionMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transactions Dialog */}
      <Dialog open={viewTransactionsDialogOpen} onOpenChange={setViewTransactionsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              {viewingPayment && (
                <>
                  Deal: {formatCurrency(parseFloat(viewingPayment.total_amount))} &mdash;{" "}
                  {getStatusBadge(viewingPayment.payment_status)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {loadingTransactions ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : viewingTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {viewingTransactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(parseFloat(t.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.payment_date} &middot; {t.payment_method || "—"}
                      </p>
                      {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm("Delete this transaction?")) {
                          deleteTransactionMutation.mutate({
                            transactionId: t.id,
                            paymentId: t.client_payment_id,
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-sm font-medium">Total Paid</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(viewingTransactions.reduce((s: number, t: any) => s + parseFloat(t.amount), 0))}
                  </span>
                </div>
                {viewingPayment && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(
                        parseFloat(viewingPayment.total_amount) -
                          viewingTransactions.reduce((s: number, t: any) => s + parseFloat(t.amount), 0),
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
