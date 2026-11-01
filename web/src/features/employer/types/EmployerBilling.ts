export interface EmployerPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
}

export interface EmployerUpgradeRequest {
  plan: string;
  status: 'requested' | 'cancelled';
  requestedAt: string;
  cancelledAt?: string;
}

export interface EmployerBilling {
  paymentsConnected: boolean;
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
