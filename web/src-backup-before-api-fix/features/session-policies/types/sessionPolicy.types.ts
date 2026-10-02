export interface SessionPolicy {
  _id: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  inactivityMinutes: number;
  maximumSessionHours: number;
  requireMfa: boolean;
  routePatterns: string[];
  priority: number;
  isDefault: boolean;
  isProtected: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSessionPolicyInput {
  key: string;
  displayName: string;
  description?: string;
  enabled?: boolean;
  inactivityMinutes: number;
  maximumSessionHours: number;
  requireMfa?: boolean;
  routePatterns?: string[];
  priority?: number;
  isDefault?: boolean;
}

export type UpdateSessionPolicyInput = Partial<CreateSessionPolicyInput>;
