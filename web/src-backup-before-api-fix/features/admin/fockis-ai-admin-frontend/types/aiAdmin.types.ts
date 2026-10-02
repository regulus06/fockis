export type AiFeature =
  | "chat"
  | "voice"
  | "phoneCalls"
  | "recommendations"
  | "specialAds";

export type AccessMode = "inherit" | "custom" | "granted" | "blocked";

export interface AiPermissions {
  chat: boolean;
  voice: boolean;
  phoneCalls: boolean;
  recommendations: boolean;
  specialAds: boolean;
}

export interface AiPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  permissions: AiPermissions;
  limits: {
    chatMessages: number;
    voiceMinutes: number;
    phoneMinutes: number;
    recommendations: number;
  };
  status: "active" | "inactive";
}

export interface AiUserAccess {
  userId: string;
  userName: string;
  email: string;
  plan: string;
  mode: AccessMode;
  permissions: AiPermissions;
  expiresAt: string | null;
  reason?: string;
}
