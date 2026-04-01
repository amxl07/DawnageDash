import { apiFetch } from "./api";

// ============================================================================
// COACH COMMISSIONS
// ============================================================================

export async function fetchCoachCommissions() {
  return apiFetch<any[]>('/api/finance/commissions');
}

export async function upsertCoachCommission(coachId: string, commissionPercentage: number) {
  return apiFetch<any>(`/api/finance/commissions/${coachId}`, {
    method: 'PUT',
    body: JSON.stringify({ commissionPercentage }),
  });
}

// ============================================================================
// CLIENT PAYMENTS
// ============================================================================

export async function fetchClientPayments() {
  return apiFetch<any[]>('/api/finance/payments');
}

export async function upsertClientPayment(clientId: string, totalAmount: number, notes?: string) {
  return apiFetch<any>(`/api/finance/payments/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify({ totalAmount, notes }),
  });
}

export async function updatePaymentStatus(clientPaymentId: string, status: string) {
  return apiFetch<any>(`/api/finance/payments/${clientPaymentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ============================================================================
// PAYMENT TRANSACTIONS (Installments)
// ============================================================================

export async function fetchPaymentTransactions() {
  return apiFetch<any[]>('/api/finance/transactions');
}

export async function fetchTransactionsForPayment(clientPaymentId: string) {
  return apiFetch<any[]>(`/api/finance/transactions/by-payment/${clientPaymentId}`);
}

export async function addPaymentTransaction(
  clientPaymentId: string,
  amount: number,
  paymentDate: string,
  paymentMethod?: string,
  notes?: string,
) {
  return apiFetch<any>('/api/finance/transactions', {
    method: 'POST',
    body: JSON.stringify({ clientPaymentId, amount, paymentDate, paymentMethod, notes }),
  });
}

export async function deletePaymentTransaction(transactionId: string, clientPaymentId: string) {
  return apiFetch<any>(`/api/finance/transactions/${transactionId}?clientPaymentId=${clientPaymentId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// AGGREGATION HELPERS (pure client-side math — no DB calls)
// ============================================================================

export function calculateFinancialSummary(
  clients: any[],
  payments: any[],
  transactions: any[],
  commissions: any[],
) {
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.totalAmount ?? p.total_amount ?? 0), 0);

  const totalCollected = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalPending = totalRevenue - totalCollected;

  let totalCommissions = 0;
  const commissionMap = new Map(
    commissions.map((c: any) => [c.coachId ?? c.coach_id, parseFloat(c.commissionPercentage ?? c.commission_percentage ?? 0)])
  );

  const collectedByPayment = new Map<string, number>();
  for (const t of transactions) {
    const paymentId = t.clientPaymentId ?? t.client_payment_id;
    const current = collectedByPayment.get(paymentId) || 0;
    collectedByPayment.set(paymentId, current + parseFloat(t.amount || 0));
  }

  const paymentClientMap = new Map(
    payments.map((p: any) => [p.id, p.clientId ?? p.client_id])
  );
  const clientCoachMap = new Map(
    clients.map((c: any) => [c.id, c.coachId ?? c.coach_id])
  );

  collectedByPayment.forEach((collected, paymentId) => {
    const clientId = paymentClientMap.get(paymentId);
    if (!clientId) return;
    const coachId = clientCoachMap.get(clientId);
    if (!coachId) return;
    const commPct = commissionMap.get(coachId) || 0;
    totalCommissions += (collected * commPct) / 100;
  });

  const paidCount = payments.filter((p: any) => (p.paymentStatus ?? p.payment_status) === "paid").length;
  const partialCount = payments.filter((p: any) => (p.paymentStatus ?? p.payment_status) === "partial").length;
  const pendingCount = payments.filter((p: any) => (p.paymentStatus ?? p.payment_status) === "pending").length;

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
  const commissionMap = new Map(
    commissions.map((c: any) => [c.coachId ?? c.coach_id, parseFloat(c.commissionPercentage ?? c.commission_percentage ?? 0)])
  );

  const paymentByClient = new Map(
    payments.map((p: any) => [p.clientId ?? p.client_id, p])
  );
  const clientCoachMap = new Map(
    clients.map((c: any) => [c.id, c.coachId ?? c.coach_id])
  );

  const transactionsByPayment = new Map<string, any[]>();
  for (const t of transactions) {
    const paymentId = t.clientPaymentId ?? t.client_payment_id;
    const list = transactionsByPayment.get(paymentId) || [];
    list.push(t);
    transactionsByPayment.set(paymentId, list);
  }

  return coaches.map((coach: any) => {
    const coachClients = clients.filter((c: any) => (c.coachId ?? c.coach_id) === coach.id);
    const commPct = commissionMap.get(coach.id) || 0;

    let totalRevenue = 0;
    let totalCollected = 0;

    for (const client of coachClients) {
      const payment = paymentByClient.get(client.id);
      if (!payment) continue;
      totalRevenue += parseFloat(payment.totalAmount ?? payment.total_amount ?? 0);

      const txns = transactionsByPayment.get(payment.id) || [];
      for (const t of txns) {
        totalCollected += parseFloat(t.amount || 0);
      }
    }

    const commissionEarned = (totalCollected * commPct) / 100;

    return {
      coachId: coach.id,
      coachName: coach.fullName ?? coach.full_name ?? coach.email,
      commissionPercentage: commPct,
      totalClients: coachClients.length,
      totalRevenue,
      totalCollected,
      totalPending: totalRevenue - totalCollected,
      commissionEarned,
    };
  });
}
