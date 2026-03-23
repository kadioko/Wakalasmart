import type {
  Organization,
  Branch,
  User,
  Provider,
  Till,
  Transaction,
  Shift,
  Reconciliation,
  Expense,
  Alert,
  AuditLog,
  UserRole,
  TransactionType,
  TransactionStatus,
  TillType,
  ProviderCode,
  ShiftStatus,
  ReconciliationStatus,
  AlertType,
  AlertSeverity,
  AlertStatus,
  ExpenseCategory,
  OrganizationStatus,
  BranchStatus,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Organization,
  Branch,
  User,
  Provider,
  Till,
  Transaction,
  Shift,
  Reconciliation,
  Expense,
  Alert,
  AuditLog,
  UserRole,
  TransactionType,
  TransactionStatus,
  TillType,
  ProviderCode,
  ShiftStatus,
  ReconciliationStatus,
  AlertType,
  AlertSeverity,
  AlertStatus,
  ExpenseCategory,
  OrganizationStatus,
  BranchStatus,
};

// Extended types with relations
export type TransactionWithRelations = Transaction & {
  branch: Branch;
  provider: Provider | null;
  createdBy: User;
  approvedBy: User | null;
};

export type ShiftWithRelations = Shift & {
  branch: Branch;
  openedBy: User;
  closedBy: User | null;
};

export type ReconciliationWithRelations = Reconciliation & {
  branch: Branch;
  submittedBy: User | null;
  approvedBy: User | null;
};

// Dashboard types
export interface DashboardStats {
  totalTransactionsToday: number;
  totalCashInToday: number;
  totalCashOutToday: number;
  totalCommissionsToday: number;
  currentCashBalance: number;
  floatBalances: FloatBalance[];
  activeAlerts: number;
  openShifts: number;
  unreconciledBranches: number;
  branches: BranchSummary[];
}

export interface FloatBalance {
  providerId: string;
  providerName: string;
  providerCode: ProviderCode;
  balance: number;
  lowThreshold: number;
  isLow: boolean;
}

export interface BranchSummary {
  id: string;
  name: string;
  cashBalance: number;
  txCountToday: number;
  commissionToday: number;
  hasOpenShift: boolean;
  isReconciled: boolean;
  alertCount: number;
}

// Form types
export interface CreateTransactionInput {
  branchId: string;
  tillId: string;
  providerId?: string;
  type: TransactionType;
  amount: number;
  fee?: number;
  commission?: number;
  reference?: string;
  externalRef?: string;
  customerPhone?: string;
  notes?: string;
  transactedAt?: Date;
}

export interface CreateExpenseInput {
  branchId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  isCash?: boolean;
  notes?: string;
  paidAt?: Date;
}

export interface OpenShiftInput {
  branchId: string;
  openingBalances: {
    tillId: string;
    openingBalance: number;
  }[];
}

export interface CloseShiftInput {
  shiftId: string;
  closingBalances: {
    tillId: string;
    countedBalance: number;
    varianceNotes?: string;
  }[];
  notes?: string;
}

export interface ReconciliationInput {
  branchId: string;
  shiftId?: string;
  date: Date;
  actualCash: number;
  floatItems: {
    providerId: string;
    actualFloat: number;
    varianceNotes?: string;
  }[];
  notes?: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface TransactionFilters {
  branchId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  providerId?: string;
  startDate?: Date;
  endDate?: Date;
  createdById?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportFilters {
  branchId?: string;
  providerId?: string;
  startDate: Date;
  endDate: Date;
  userId?: string;
}

// Auth context
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  organization: Organization | null;
  branchIds: string[];
}

// Session context used throughout the app
export interface AppSession {
  user: AuthUser;
  organizationId: string;
}
