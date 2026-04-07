import { supabase } from "@/lib/supabase";

// ============================================================================
// COACH COMMISSIONS
// ============================================================================

export async function fetchCoachCommissions() {
  const { data, error } = await supabase
    .from("coach_commissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertCoachCommission(coachId: string, commissionPercentage: number) {
  // Try update first, then insert
  const { data: existing } = await supabase
    .from("coach_commissions")
    .select("id")
    .eq("coach_id", coachId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("coach_commissions")
      .update({ commission_percentage: commissionPercentage, updated_at: new Date().toISOString() })
      .eq("coach_id", coachId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("coach_commissions")
      .insert({ coach_id: coachId, commission_percentage: commissionPercentage })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ============================================================================
// CLIENT PAYMENTS
// ============================================================================

export async function fetchClientPayments() {
  const { data, error } = await supabase
    .from("client_payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertClientPayment(clientId: string, totalAmount: number, notes?: string) {
  const { data: existing } = await supabase
    .from("client_payments")
    .select("id")
    .eq("client_id", clientId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("client_payments")
      .update({
        total_amount: totalAmount,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("client_payments")
      .insert({
        client_id: clientId,
        total_amount: totalAmount,
        payment_status: "pending",
        notes: notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function updatePaymentStatus(clientPaymentId: string, status: string) {
  const { data, error } = await supabase
    .from("client_payments")
    .update({ payment_status: status, updated_at: new Date().toISOString() })
    .eq("id", clientPaymentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// PAYMENT TRANSACTIONS (Installments)
// ============================================================================

export async function fetchPaymentTransactions() {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTransactionsForPayment(clientPaymentId: string) {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("client_payment_id", clientPaymentId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPaymentTransaction(
  clientPaymentId: string,
  amount: number,
  paymentDate: string,
  paymentMethod?: string,
  notes?: string,
) {
  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      client_payment_id: clientPaymentId,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod || null,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  // After adding a transaction, auto-update the payment status
  await recalculatePaymentStatus(clientPaymentId);

  return data;
}

export async function deletePaymentTransaction(transactionId: string, clientPaymentId: string) {
  const { error } = await supabase
    .from("payment_transactions")
    .delete()
    .eq("id", transactionId);
  if (error) throw error;

  // Recalculate status after deletion
  await recalculatePaymentStatus(clientPaymentId);
}

// Auto-recalculate payment status based on transactions
async function recalculatePaymentStatus(clientPaymentId: string) {
  // Get the payment record
  const { data: payment } = await supabase
    .from("client_payments")
    .select("total_amount")
    .eq("id", clientPaymentId)
    .single();

  if (!payment) return;

  // Get sum of all transactions
  const { data: transactions } = await supabase
    .from("payment_transactions")
    .select("amount")
    .eq("client_payment_id", clientPaymentId);

  const totalPaid = (transactions || []).reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
  const totalAmount = parseFloat(payment.total_amount);

  let status = "pending";
  if (totalPaid >= totalAmount) {
    status = "paid";
  } else if (totalPaid > 0) {
    status = "partial";
  }

  await supabase
    .from("client_payments")
    .update({ payment_status: status, updated_at: new Date().toISOString() })
    .eq("id", clientPaymentId);
}

// ============================================================================
// COACH PAYOUTS
// ============================================================================

export async function fetchCoachPayouts() {
  const { data, error } = await supabase
    .from("coach_payouts")
    .select("*")
    .order("payout_year", { ascending: false })
    .order("payout_month", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertCoachPayout(
  coachId: string,
  payoutMonth: number,
  payoutYear: number,
  grossAmount: number,
  commissionPercentage: number,
  commissionAmount: number,
  status: string,
  paymentMethod?: string,
  paymentDate?: string,
  notes?: string,
) {
  const { data: existing } = await supabase
    .from("coach_payouts")
    .select("id")
    .eq("coach_id", coachId)
    .eq("payout_month", payoutMonth)
    .eq("payout_year", payoutYear)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("coach_payouts")
      .update({
        gross_amount: grossAmount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        status,
        payment_method: paymentMethod || null,
        payment_date: paymentDate || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("coach_payouts")
      .insert({
        coach_id: coachId,
        payout_month: payoutMonth,
        payout_year: payoutYear,
        gross_amount: grossAmount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        status,
        payment_method: paymentMethod || null,
        payment_date: paymentDate || null,
        notes: notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export interface PayoutWarnings {
  clientsWithoutHistory: string[];
  clientsWithoutPackageDuration: string[];
}

export interface MonthlyCoachPayout {
  coachId: string;
  coachName: string;
  commissionPercentage: number;
  totalClients: number;
  monthlyGross: number;
  commissionEarned: number;
}

export function calculateMonthlyCoachPayouts(
  coaches: any[],
  clients: any[],
  payments: any[],
  commissions: any[],
  history: any[],
  month: number,
  year: number,
): { results: MonthlyCoachPayout[]; warnings: PayoutWarnings } {
  const commissionMap = new Map(
    commissions.map((c: any) => [c.coach_id, parseFloat(c.commission_percentage || 0)]),
  );
  const paymentByClient = new Map(payments.map((p: any) => [p.client_id, p]));

  const warnings: PayoutWarnings = {
    clientsWithoutHistory: [],
    clientsWithoutPackageDuration: [],
  };

  // Pre-group history events by client_id for performance
  const historyByClient = new Map<string, any[]>();
  for (const h of history) {
    const list = historyByClient.get(h.client_id) || [];
    list.push(h);
    historyByClient.set(h.client_id, list);
  }

  // Accumulate per-coach: gross (deal portion) and client count
  const coachGross = new Map<string, number>();
  const coachClientCount = new Map<string, number>();
  for (const coach of coaches) {
    coachGross.set(coach.id, 0);
    coachClientCount.set(coach.id, 0);
  }

  for (const client of clients) {
    const payment = paymentByClient.get(client.id);
    if (!payment) continue; // No deal set

    const dealAmount = parseFloat(payment.total_amount || 0);
    if (dealAmount <= 0) continue;

    // Get this client's assignment history
    const clientEvents = (historyByClient.get(client.id) || [])
      .sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""));

    // Find the first assignment date — this is when the coaching deal starts
    const firstAssignment = clientEvents.find((e: any) => e.event_type === "assigned");

    let commissionStartMonth: number;
    let commissionStartYear: number;
    let usedFallback = false;

    if (firstAssignment) {
      const claimDate = new Date(firstAssignment.created_at);
      commissionStartMonth = claimDate.getMonth() + 1; // 1-12
      commissionStartYear = claimDate.getFullYear();
    } else if (client.coach_id) {
      // Fallback: client has a coach but no history records
      // Use package_start_date or created_at as approximate claim date
      const fallbackDate = client.package_start_date || client.created_at;
      if (!fallbackDate) continue;
      const d = new Date(fallbackDate);
      commissionStartMonth = d.getMonth() + 1;
      commissionStartYear = d.getFullYear();
      usedFallback = true;
      warnings.clientsWithoutHistory.push(client.full_name || client.email || client.id);
    } else {
      // Client is unclaimed (no coach, no history) — skip silently
      continue;
    }

    const packageDuration = client.package_duration;
    if (!packageDuration) {
      // Only warn if client is claimed (has a coach or history)
      if (client.coach_id || firstAssignment) {
        warnings.clientsWithoutPackageDuration.push(client.full_name || client.email || client.id);
      }
      continue;
    }

    // Check if the target month falls within the commission window
    // Window: [commissionStart, commissionStart + packageDuration months)
    const monthsDiff = (year - commissionStartYear) * 12 + (month - commissionStartMonth);
    if (monthsDiff < 0 || monthsDiff >= packageDuration) continue;

    // Determine which coach is assigned for this target month
    let assignedCoachId: string | null = null;

    if (clientEvents.length > 0) {
      const targetYM = `${year}-${String(month).padStart(2, "0")}`;
      for (const event of clientEvents) {
        const eventYM = (event.created_at || "").substring(0, 7);
        if (eventYM > targetYM) break;
        if (event.event_type === "assigned") {
          assignedCoachId = event.coach_id;
        } else if (event.event_type === "unassigned") {
          assignedCoachId = null;
        }
      }
    } else {
      // Fallback: use current coach_id
      assignedCoachId = client.coach_id || null;
    }

    if (!assignedCoachId) continue;

    // Monthly portion of the deal
    const monthlyPortion = dealAmount / packageDuration;

    coachGross.set(assignedCoachId, (coachGross.get(assignedCoachId) || 0) + monthlyPortion);
    coachClientCount.set(assignedCoachId, (coachClientCount.get(assignedCoachId) || 0) + 1);
  }

  const results = coaches.map((coach: any) => {
    const gross = coachGross.get(coach.id) || 0;
    const commPct = commissionMap.get(coach.id) || 0;
    const commissionEarned = Math.round(((gross * commPct) / 100) * 100) / 100;

    return {
      coachId: coach.id,
      coachName: coach.full_name || coach.email,
      commissionPercentage: commPct,
      totalClients: coachClientCount.get(coach.id) || 0,
      monthlyGross: Math.round(gross * 100) / 100,
      commissionEarned,
    };
  });

  return { results, warnings };
}

export function calculatePayoutSummary(
  monthlyPayouts: MonthlyCoachPayout[],
  existingPayoutRecords: any[],
) {
  const totalPayable = monthlyPayouts.reduce((sum, p) => sum + p.commissionEarned, 0);

  let totalPaidOut = 0;
  for (const record of existingPayoutRecords) {
    if (record.status === "paid") {
      totalPaidOut += parseFloat(record.commission_amount || 0);
    }
  }

  const totalPending = Math.max(0, totalPayable - totalPaidOut);

  return { totalPayable, totalPaidOut, totalPending };
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

export function calculateFinancialSummary(
  clients: any[],
  payments: any[],
  transactions: any[],
  commissions: any[],
) {
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);

  const totalCollected = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalPending = totalRevenue - totalCollected;

  // Calculate coach commissions from collected amounts
  // Group payments by client, then map to coach via clients array
  let totalCommissions = 0;
  const commissionMap = new Map(commissions.map((c: any) => [c.coach_id, parseFloat(c.commission_percentage || 0)]));

  // Group transactions by client_payment_id to get collected per payment
  const collectedByPayment = new Map<string, number>();
  for (const t of transactions) {
    const current = collectedByPayment.get(t.client_payment_id) || 0;
    collectedByPayment.set(t.client_payment_id, current + parseFloat(t.amount || 0));
  }

  // Map payment to client to coach
  const paymentClientMap = new Map(payments.map((p: any) => [p.id, p.client_id]));
  const clientCoachMap = new Map(clients.map((c: any) => [c.id, c.coach_id]));

  collectedByPayment.forEach((collected, paymentId) => {
    const clientId = paymentClientMap.get(paymentId);
    if (!clientId) return;
    const coachId = clientCoachMap.get(clientId);
    if (!coachId) return;
    const commPct = commissionMap.get(coachId) || 0;
    totalCommissions += (collected * commPct) / 100;
  });

  const paidCount = payments.filter((p: any) => p.payment_status === "paid").length;
  const partialCount = payments.filter((p: any) => p.payment_status === "partial").length;
  const pendingCount = payments.filter((p: any) => p.payment_status === "pending").length;

  return {
    totalRevenue,
    totalCollected,
    totalPending,
    totalCommissions,
    netRevenue: totalCollected - totalCommissions,
    paidCount,
    partialCount,
    pendingCount,
  };
}

export function calculateCoachEarnings(
  coaches: any[],
  clients: any[],
  payments: any[],
  transactions: any[],
  commissions: any[],
) {
  const commissionMap = new Map(commissions.map((c: any) => [c.coach_id, parseFloat(c.commission_percentage || 0)]));

  // Build reverse maps
  const paymentByClient = new Map(payments.map((p: any) => [p.client_id, p]));
  const clientCoachMap = new Map(clients.map((c: any) => [c.id, c.coach_id]));

  // Group transactions by client_payment_id
  const transactionsByPayment = new Map<string, any[]>();
  for (const t of transactions) {
    const list = transactionsByPayment.get(t.client_payment_id) || [];
    list.push(t);
    transactionsByPayment.set(t.client_payment_id, list);
  }

  return coaches.map((coach: any) => {
    const coachClients = clients.filter((c: any) => c.coach_id === coach.id);
    const commPct = commissionMap.get(coach.id) || 0;

    let totalRevenue = 0;
    let totalCollected = 0;

    for (const client of coachClients) {
      const payment = paymentByClient.get(client.id);
      if (!payment) continue;
      totalRevenue += parseFloat(payment.total_amount || 0);

      const txns = transactionsByPayment.get(payment.id) || [];
      for (const t of txns) {
        totalCollected += parseFloat(t.amount || 0);
      }
    }

    const commissionEarned = (totalCollected * commPct) / 100;

    return {
      coachId: coach.id,
      coachName: coach.full_name || coach.email,
      commissionPercentage: commPct,
      totalClients: coachClients.length,
      totalRevenue,
      totalCollected,
      totalPending: totalRevenue - totalCollected,
      commissionEarned,
    };
  });
}
