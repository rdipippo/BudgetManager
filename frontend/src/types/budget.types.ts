export interface Category {
  id: number;
  user_id: number;
  parent_id: number | null;
  name: string;
  color: string;
  icon: string;
  is_system: boolean;
  is_income: boolean;
  sort_order: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  plaid_account_id: number | null;
  plaid_transaction_id: string | null;
  category_id: number | null;
  amount: number;
  date: string;
  merchant_name: string | null;
  description: string | null;
  plaid_category: string | null;
  pending: boolean;
  is_manual: boolean;
  notes: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  period_type: 'monthly';
  start_day: number;
  is_active: boolean;
  category_name: string;
  category_color: string;
  category_icon: string;
  is_income: boolean;
  spent?: number;
  remaining?: number;
  percentage?: number;
}

export interface PlaidItem {
  id: number;
  institutionName: string | null;
  status: 'active' | 'error' | 'pending_expiration';
  lastSyncAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  accounts: PlaidAccount[];
}

export interface PlaidAccount {
  id: number;
  name: string;
  officialName: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  isHidden: boolean;
}

export interface CategorizationRule {
  id: number;
  user_id: number;
  category_id: number;
  name: string;
  match_type: 'merchant' | 'description' | 'amount_range' | 'combined';
  merchant_pattern: string | null;
  description_pattern: string | null;
  amount_min: number | null;
  amount_max: number | null;
  is_exact_match: boolean;
  priority: number;
  is_active: boolean;
  category_name?: string;
  category_color?: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number | null;
  accountId?: number;
  search?: string;
  uncategorized?: boolean;
  limit?: number;
  offset?: number;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  periodStart: string;
  periodEnd: string;
  budgets: Budget[];
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
