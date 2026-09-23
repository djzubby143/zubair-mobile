import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";
export type { Expense };

export const STORAGE_KEY_EXPENSES = "zubair_mobile_expenses";

export const DEFAULT_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    title: "Daewoo Cargo Freight Charges - Lahore Container",
    category: "Cargo & Freight",
    amount: 3500,
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    payment_method: "Cash",
    notes: "Bilty # DW-88219 freight for LCD unit shipment",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "exp-2",
    title: "Bubble Wrap & Courier Fly Packaging Cartons",
    category: "Packaging & Supplies",
    amount: 2200,
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    payment_method: "JazzCash / EasyPaisa",
    notes: "100 pcs padded flyer bags and 2 rolls bubble wrap",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "exp-3",
    title: "Chand Plaza Shop Electricity Bill",
    category: "Shop Rent & Bills",
    amount: 6800,
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
    payment_method: "Bank Transfer",
    notes: "GEPCO bill for shop # 12",
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
];

export function getExpenses(): Expense[] {
  if (typeof window === "undefined") return DEFAULT_EXPENSES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_EXPENSES;
}

export async function saveExpense(
  expenseData: Omit<Expense, "id" | "created_at"> & { id?: string }
): Promise<Expense> {
  const newExpense: Expense = {
    id: expenseData.id || `exp-${Date.now()}`,
    title: expenseData.title.trim(),
    category: expenseData.category,
    amount: Number(expenseData.amount) || 0,
    date: expenseData.date || new Date().toISOString(),
    payment_method: expenseData.payment_method || "Cash",
    notes: expenseData.notes?.trim() || undefined,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getExpenses();
      const idx = current.findIndex((e) => e.id === newExpense.id);
      let updated: Expense[];
      if (idx !== -1) {
        updated = [...current];
        updated[idx] = newExpense;
      } else {
        updated = [newExpense, ...current];
      }
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_expenses_updated"));
    } catch {}
  }

  // Sync to Supabase
  try {
    await supabase.from("expenses").upsert([newExpense]);
  } catch (err) {
    console.warn("Notice syncing expense to Supabase:", err);
  }

  return newExpense;
}

export async function deleteExpense(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const current = getExpenses();
      const updated = current.filter((e) => e.id !== id);
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_expenses_updated"));
    } catch {}
  }

  try {
    await supabase.from("expenses").delete().eq("id", id);
  } catch {}
}

export function getTotalExpenses(expenses?: Expense[]): number {
  const list = expenses || getExpenses();
  return list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}
