import { supabase } from "@/lib/supabase";
import { PaymentRecord, CustomerUser } from "@/lib/types";
export type { PaymentRecord };
import { getOrders, Order } from "@/lib/orders";
import { getPurchases, PurchaseEntry } from "@/lib/inventory";

export const STORAGE_KEY_PAYMENTS = "zubair_mobile_payments";

export const DEFAULT_PAYMENTS: PaymentRecord[] = [
  {
    id: "pay-101",
    entity_type: "customer",
    entity_id: "c1000002-0000-4000-8000-000000000002",
    entity_name: "Wholesale Dealer Test",
    amount: 15000,
    payment_method: "Bank Transfer",
    reference_no: "HBL-TXN-99120",
    payment_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    notes: "Payment received for partial order settlement",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "pay-102",
    entity_type: "supplier",
    entity_id: "sup-1",
    entity_name: "Hall Road Mobile Parts Importers",
    amount: 100000,
    payment_method: "Bank Transfer",
    reference_no: "MCB-998124",
    payment_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: "Advance payment against PO-2401 container shipment",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export function getPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return DEFAULT_PAYMENTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PAYMENTS;
}

/**
 * Record a payment (Received from customer OR Sent to supplier)
 */
export async function recordPayment(
  paymentData: Omit<PaymentRecord, "id" | "created_at"> & { id?: string }
): Promise<PaymentRecord> {
  const newPayment: PaymentRecord = {
    id: paymentData.id || `pay-${Date.now()}`,
    entity_type: paymentData.entity_type,
    entity_id: paymentData.entity_id,
    entity_name: paymentData.entity_name,
    amount: Math.max(0, Number(paymentData.amount) || 0),
    payment_method: paymentData.payment_method || "Cash",
    reference_no: paymentData.reference_no?.trim() || undefined,
    payment_date: paymentData.payment_date || new Date().toISOString(),
    notes: paymentData.notes?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getPayments();
      const updated = [newPayment, ...current];
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_payments_updated"));
    } catch {}
  }

  // Sync to Supabase
  try {
    await supabase.from("payments").upsert([newPayment]);
  } catch (err) {
    console.warn("Notice syncing payment to Supabase:", err);
  }

  return newPayment;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: "order" | "payment";
  reference: string;
  description: string;
  debit: number; // Order amount (owed)
  credit: number; // Paid amount
  balance: number; // Running balance
}

/**
 * Calculate full ledger statement for a customer
 */
export function getCustomerLedger(
  customerIdOrPhone: string,
  customerName?: string
): {
  entries: CustomerLedgerEntry[];
  totalBilled: number;
  totalPaid: number;
  remainingBalance: number;
} {
  const allOrders = getOrders();
  const allPayments = getPayments();
  const cidLow = (customerIdOrPhone || "").toLowerCase().trim();
  const cnameLow = (customerName || "").toLowerCase().trim();

  // Filter orders for this customer
  const customerOrders = allOrders.filter((o) => {
    const oId = (o.customer_id || "").toLowerCase().trim();
    const oPhone = (o.customer_phone || "").toLowerCase().trim();
    const oName = (o.customer_name || "").toLowerCase().trim();
    return (
      (cidLow && (oId === cidLow || oPhone === cidLow)) ||
      (cnameLow && oName.includes(cnameLow))
    );
  });

  // Filter payments for this customer
  const customerPayments = allPayments.filter((p) => {
    if (p.entity_type !== "customer") return false;
    const pId = (p.entity_id || "").toLowerCase().trim();
    const pName = (p.entity_name || "").toLowerCase().trim();
    return (cidLow && pId === cidLow) || (cnameLow && pName.includes(cnameLow));
  });

  // Combine into single chronological stream
  const rawEvents: Array<{
    id: string;
    date: string;
    type: "order" | "payment";
    reference: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  for (const ord of customerOrders) {
    rawEvents.push({
      id: ord.id,
      date: ord.created_at,
      type: "order",
      reference: ord.order_number,
      description: `Order Placed (${ord.total_items} items)${ord.order_notes ? ` - ${ord.order_notes}` : ""}`,
      debit: Number(ord.total_amount) || 0,
      credit: 0,
    });

    // If order already has direct recorded paid amount, add that as immediate credit
    if (ord.paid_amount && Number(ord.paid_amount) > 0) {
      rawEvents.push({
        id: `ord-pay-${ord.id}`,
        date: ord.created_at,
        type: "payment",
        reference: `${ord.order_number}-PAY`,
        description: `Order Deposit / Payment (${ord.payment_notes || "Cash on Order"})`,
        debit: 0,
        credit: Number(ord.paid_amount),
      });
    }
  }

  for (const pay of customerPayments) {
    rawEvents.push({
      id: pay.id,
      date: pay.payment_date,
      type: "payment",
      reference: pay.reference_no || `REC-${pay.id.slice(0, 6)}`,
      description: `Payment Received via ${pay.payment_method}${pay.notes ? ` (${pay.notes})` : ""}`,
      debit: 0,
      credit: Number(pay.amount) || 0,
    });
  }

  // Sort ascending by date to compute accurate running balance
  rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  let totalBilled = 0;
  let totalPaid = 0;

  const entries: CustomerLedgerEntry[] = rawEvents.map((ev) => {
    totalBilled += ev.debit;
    totalPaid += ev.credit;
    runningBalance += ev.debit - ev.credit;
    return {
      ...ev,
      balance: runningBalance,
    };
  });

  // Return descending for display
  return {
    entries: entries.reverse(),
    totalBilled,
    totalPaid,
    remainingBalance: Math.max(0, runningBalance),
  };
}

/**
 * Check if a customer has exceeded their credit limit
 */
export function checkCustomerCreditStatus(customer: CustomerUser, proposedAmount = 0): {
  isExceeded: boolean;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  projectedBalance: number;
} {
  const creditLimit = Math.max(0, Number(customer.credit_limit) || 0);
  const currentBalance = Math.max(0, Number(customer.balance) || 0);
  const projectedBalance = currentBalance + Number(proposedAmount);

  // If creditLimit is 0, credit is not granted (Cash-only)
  const isExceeded = creditLimit > 0 ? projectedBalance > creditLimit : proposedAmount > 0;
  const availableCredit = Math.max(0, creditLimit - currentBalance);

  return {
    isExceeded,
    creditLimit,
    currentBalance,
    availableCredit,
    projectedBalance,
  };
}
