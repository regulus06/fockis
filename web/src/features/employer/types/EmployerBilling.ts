export interface EmployerPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  /** Set by Fockis in the Admin Center. 0 = free. */
  price: number;
  /** Months one payment covers. 0 = one-time. */
  periodMonths: number;
  periodLabel: string;
  /** Open jobs allowed at the same time. 0 = unlimited. */
  maxActiveJobs: number;
}

export type EmployerPlanStateName = 'free' | 'exempt' | 'paid' | 'active' | 'grace' | 'expired';

export interface EmployerPlanState {
  planId: string;
  effectivePlanId: string;
  state: EmployerPlanStateName;
  paidUntil: string | null;
  graceEndsAt: string | null;
  renewSoon: boolean;
  maxActiveJobs: number;
}

export type EmployerApprovalStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'blocked';

export interface EmployerPlanCheckout {
  purpose: string;
  referenceId: string;
  amount: number;
  currency: string;
  plan: { id: string; name: string; periodMonths: number; periodLabel: string; maxActiveJobs: number; features: string[] };
  companyName: string;
  renewal: boolean;
  note: string;
  metadata: Record<string, string>;
}

export interface EmployerChoosePlanResult {
  switched: boolean;
  checkout: EmployerPlanCheckout | null;
  billing: EmployerBilling | null;
}

export interface EmployerUpgradeRequest {
  plan: string;
  status: 'requested' | 'cancelled';
  requestedAt: string;
  cancelledAt?: string;
}

export interface EmployerBilling {
  /** Fockis charges for paid plans (set in the Admin Center). */
  paymentsConnected: boolean;
  currency: string;
  note: string;
  planState: EmployerPlanState | null;
  liveJobs: number;
  employerStatus: EmployerApprovalStatus;
  payments: { method: 'stripe' | 'manual'; plan?: string; amount?: number; currency?: string; from?: string; to?: string; at: string }[];
  currentPlan: EmployerPlan;
  plans: EmployerPlan[];
  pendingUpgrade: EmployerUpgradeRequest | null;
  upgradeRequests: EmployerUpgradeRequest[];
  invoices: { id: string; number: string; amount: string; status: string; issuedAt: string; url?: string }[];
  paymentMethods: { id: string; brand: string; last4: string; expires: string }[];
  canManage: boolean;
}

export interface EmployerSettings {
  companyName: string;
  website: string;
  contactEmail: string;
  timezone: string;
  notifications: {
    newApplications: boolean;
    applicationStatusChanges: boolean;
    interviewReminders: boolean;
    weeklySummary: boolean;
    productUpdates: boolean;
  };
  canManage: boolean;
}

/** @deprecated use EmployerBilling */
export interface EmployerSubscription {
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';
  planName?: string;
  currentPeriodEnd?: string;
}
