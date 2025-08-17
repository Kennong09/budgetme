// Transaction related types and interfaces

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category?: string;
  category_id?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface FamilySummaryData {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}
