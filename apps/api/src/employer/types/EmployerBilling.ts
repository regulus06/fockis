export interface EmployerSubscription {
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none';
  planName?: string;
  currentPeriodEnd?: string;
}
