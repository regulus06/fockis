import { FOCKIS_API_URL } from "../../../../config/fockisConfig";

export type AiFeature =
  | "chat"
  | "voice"
  | "phoneCalls"
  | "recommendations"
  | "specialAds";

export type AccessMode =
  | "inherit"
  | "custom"
  | "granted"
  | "blocked";

export type BackendAccessMode =
  | "INHERIT"
  | "CUSTOM"
  | "GRANTED"
  | "BLOCKED";

export interface AiPermissions {
  chat: boolean;
  voice: boolean;
  phoneCalls: boolean;
  recommendations: boolean;
  specialAds: boolean;
}

export interface AiPlanLimits {
  chatMessages: number;
  voiceMinutes: number;
  phoneMinutes: number;
  recommendations: number;
}

export interface AiPlan {
  id: string;
  _id?: string;

  name: string;
  description: string;

  price?: number;

  membershipPlanId?: string;

  permissions?: AiPermissions;

  features?: AiPermissions;

  limits: AiPlanLimits;

  priority?: number;

  enabled?: boolean;

  status?: "active" | "inactive";

  createdAt?: string;
  updatedAt?: string;
}

export interface AiUserAccess {
  userId: string;

  userName: string;

  email: string;

  plan?: string;

  mode: AccessMode;

  permissions: AiPermissions;

  features?: AiPermissions;

  expiresAt: string | null;

  reason?: string;

  updatedBy?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

export interface AiConversation {
  id: string;
  _id?: string;

  userId?: string;

  userName: string;

  title?: string;

  summary?: string;

  type: "chat" | "voice" | "phone";

  channel?: string;

  status:
    | "active"
    | "ended"
    | "blocked"
    | "flagged"
    | "completed"
    | "archived";

  startedAt?: string;

  durationSeconds?: number;

  messageCount?: number;

  tokensUsed?: number;

  creditsUsed?: number;

  lastMessage?: string;

  moderationNote?: string;

  createdAt?: string;

  updatedAt?: string;
}

export interface AiDashboardStats {
  aiOnline: boolean;

  usersWithAi: number;

  activeSessions: number;

  chatSessions: number;

  voiceMinutes: number;

  phoneMinutes: number;

  status?: string;

  emergencyDisabled?: boolean;

  counts?: {
    plans: number;
    users: number;
    conversations: number;
    tools: number;
    recommendations: number;
    specialAds: number;
  };

  usage?: {
    requests: number;
    tokens: number;
    credits: number;
    cost: number;
    estimatedCost?: number;
  };

  vapi?: {
    configured: boolean;
  };
}

export interface AiDashboardResponse {
  status: string;

  aiEnabled: boolean;

  emergencyDisabled: boolean;

  counts: {
    plans: number;
    users: number;
    conversations: number;
    tools: number;
    recommendations: number;
    specialAds: number;
  };

  usage: {
    requests: number;
    tokens: number;
    credits: number;
    cost: number;
  };

  vapi: {
    configured: boolean;
  };
}

export interface AiUserListResponse {
  data: AiUserAccess[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AiConversationListResponse {
  data: AiConversation[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AiTool {
  id: string;

  _id?: string;

  name: string;

  description: string;

  type: string;

  enabled: boolean;

  requiresAccess: boolean;

  schema: Record<string, unknown>;

  vapiToolId?: string;

  createdAt?: string;

  updatedAt?: string;
}

export interface AiRecommendation {
  id: string;

  _id?: string;

  userId?: string;

  category: string;

  targetType: string;

  targetId?: string;

  title: string;

  reason: string;

  relevanceScore: number;

  sponsored: boolean;

  clicked: boolean;

  converted: boolean;

  createdAt?: string;

  updatedAt?: string;
}

export interface AiSpecialAd {
  id: string;

  _id?: string;

  campaignId?: string;

  title: string;

  description: string;

  advertiserName: string;

  destinationUrl: string;

  enabled: boolean;

  clearlyLabeledSponsored: boolean;

  targeting: Record<string, unknown>;

  impressions: number;

  clicks: number;

  createdAt?: string;

  updatedAt?: string;
}

export interface AiUsageSummary {
  requests: number;

  tokens: number;

  credits: number;

  estimatedCost: number;
}

export interface AiUsageFeature {
  _id: string;

  requests: number;

  tokens: number;

  credits: number;

  estimatedCost: number;
}

export interface AiUsageDay {
  _id: string;

  requests: number;

  tokens: number;

  credits: number;
}

export interface AiUsageResponse {
  summary: AiUsageSummary;

  byFeature: AiUsageFeature[];

  byDay: AiUsageDay[];
}

export interface AiSettings {
  enabled: boolean;

  emergencyDisabled: boolean;

  emergencyReason?: string;

  emergencyDisabledAt?: string | null;

  allowChat: boolean;

  allowVoice: boolean;

  allowPhoneCalls: boolean;

  allowRecommendations: boolean;

  allowSpecialAds: boolean;

  defaultDailyCredits: number;

  defaultMonthlyCredits: number;

  vapiAssistantId: string;

  vapiPhoneNumberId: string;

  createdAt?: string;

  updatedAt?: string;
}

export interface VapiStatus {
  configured: boolean;
}

export interface VapiAssistant {
  id?: string;

  name?: string;

  model?: unknown;

  voice?: unknown;

  firstMessage?: string;

  [key: string]: unknown;
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

const API_PREFIX = `${API_BASE}/api/admin/ai`;

function getAuthToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (init.headers) {
    const customHeaders = new Headers(init.headers);

    customHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  const response = await fetch(
    `${API_PREFIX}${path}`,
    {
      ...init,

      credentials: "include",

      headers,
    },
  );

  if (!response.ok) {
    let message =
      `AI Admin request failed: ${response.status}`;

    try {
      const error = await response.json();

      if (Array.isArray(error?.message)) {
        message = error.message.join(", ");
      } else if (error?.message) {
        message = error.message;
      } else if (error?.error) {
        message = error.error;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/* ============================================================
   DASHBOARD
============================================================ */

async function getDashboard(): Promise<AiDashboardStats> {
  const response =
    await request<AiDashboardResponse>(
      "/dashboard",
    );

  return {
    aiOnline:
      response.aiEnabled &&
      !response.emergencyDisabled,

    usersWithAi:
      response.counts?.users ?? 0,

    activeSessions:
      response.counts?.conversations ?? 0,

    chatSessions: 0,

    voiceMinutes: 0,

    phoneMinutes: 0,

    status: response.status,

    emergencyDisabled:
      response.emergencyDisabled,

    counts: response.counts,

    usage: response.usage,

    vapi: response.vapi,
  };
}

/* ============================================================
   PLANS
============================================================ */

async function getPlans(): Promise<AiPlan[]> {
  const response =
    await request<any[]>("/plans");

  return response.map(normalizePlan);
}

async function createPlan(
  data: Partial<AiPlan>,
): Promise<AiPlan> {
  const response =
    await request<any>("/plans", {
      method: "POST",
      body: JSON.stringify(
        normalizePlanPayload(data),
      ),
    });

  return normalizePlan(response);
}

async function updatePlan(
  id: string,
  data: Partial<AiPlan>,
): Promise<AiPlan> {
  const response =
    await request<any>(
      `/plans/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          normalizePlanPayload(data),
        ),
      },
    );

  return normalizePlan(response);
}

function normalizePlan(
  plan: any,
): AiPlan {
  const features =
    plan.features ||
    plan.permissions ||
    {};

  return {
    ...plan,

    id:
      plan.id ||
      plan._id ||
      "",

    name:
      plan.name ||
      "",

    description:
      plan.description ||
      "",

    price:
      plan.price ?? 0,

    permissions: {
      chat:
        Boolean(features.chat),

      voice:
        Boolean(features.voice),

      phoneCalls:
        Boolean(features.phoneCalls),

      recommendations:
        Boolean(features.recommendations),

      specialAds:
        Boolean(features.specialAds),
    },

    features: {
      chat:
        Boolean(features.chat),

      voice:
        Boolean(features.voice),

      phoneCalls:
        Boolean(features.phoneCalls),

      recommendations:
        Boolean(features.recommendations),

      specialAds:
        Boolean(features.specialAds),
    },

    limits: {
      chatMessages:
        plan.limits?.chatMessages ?? 0,

      voiceMinutes:
        plan.limits?.voiceMinutes ?? 0,

      phoneMinutes:
        plan.limits?.phoneMinutes ?? 0,

      recommendations:
        plan.limits?.recommendations ?? 0,
    },

    status:
      plan.status ||
      (plan.enabled
        ? "active"
        : "inactive"),
  };
}

function normalizePlanPayload(
  data: Partial<AiPlan>,
) {
  const permissions =
    data.permissions ||
    data.features;

  return {
    name: data.name,

    description:
      data.description,

    membershipPlanId:
      data.membershipPlanId,

    priority:
      data.priority,

    enabled:
      data.enabled ??
      (data.status
        ? data.status === "active"
        : undefined),

    features: permissions
      ? {
          chat:
            Boolean(permissions.chat),

          voice:
            Boolean(permissions.voice),

          phoneCalls:
            Boolean(
              permissions.phoneCalls,
            ),

          recommendations:
            Boolean(
              permissions.recommendations,
            ),

          specialAds:
            Boolean(
              permissions.specialAds,
            ),
        }
      : undefined,

    limits:
      data.limits,
  };
}

/* ============================================================
   USERS
============================================================ */

async function getUsers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AiUserListResponse> {
  const query =
    new URLSearchParams();

  if (params?.search) {
    query.set(
      "search",
      params.search,
    );
  }

  if (params?.page) {
    query.set(
      "page",
      String(params.page),
    );
  }

  if (params?.limit) {
    query.set(
      "limit",
      String(params.limit),
    );
  }

  const queryString =
    query.toString();

  const response =
    await request<any>(
      `/users${
        queryString
          ? `?${queryString}`
          : ""
      }`,
    );

  return {
    data:
      (response.data || []).map(
        normalizeUser,
      ),

    pagination:
      response.pagination || {
        page: 1,
        limit: 25,
        total: 0,
        pages: 0,
      },
  };
}

async function getUserAccess(
  userId: string,
): Promise<AiUserAccess> {
  const response =
    await request<any>(
      `/users/${encodeURIComponent(
        userId,
      )}/access`,
    );

  return normalizeUser(response);
}

async function updateUserAccess(
  userId: string,
  data: Partial<AiUserAccess>,
): Promise<AiUserAccess> {
  const response =
    await request<any>(
      `/users/${encodeURIComponent(
        userId,
      )}/access`,
      {
        method: "PATCH",

        body: JSON.stringify({
          mode:
            data.mode
              ? data.mode.toUpperCase()
              : undefined,

          features:
            data.permissions ||
            data.features,

          expiresAt:
            data.expiresAt,

          reason:
            data.reason,

          updatedBy:
            data.updatedBy,
        }),
      },
    );

  return normalizeUser(response);
}

function normalizeUser(
  user: any,
): AiUserAccess {
  const access =
    user.aiAccess ||
    user;

  const features =
    access.features ||
    access.permissions ||
    {};

  const rawMode =
    access.mode ||
    "INHERIT";

  const mode =
    String(rawMode).toLowerCase() as AccessMode;

  return {
    userId:
      access.userId ||
      user._id ||
      user.id ||
      "",

    userName:
      access.userName ||
      user.name ||
      user.username ||
      "Unknown User",

    email:
      access.email ||
      user.email ||
      "",

    plan:
      access.plan ||
      user.plan ||
      "Free",

    mode,

    permissions: {
      chat:
        Boolean(features.chat),

      voice:
        Boolean(features.voice),

      phoneCalls:
        Boolean(features.phoneCalls),

      recommendations:
        Boolean(features.recommendations),

      specialAds:
        Boolean(features.specialAds),
    },

    features: {
      chat:
        Boolean(features.chat),

      voice:
        Boolean(features.voice),

      phoneCalls:
        Boolean(features.phoneCalls),

      recommendations:
        Boolean(features.recommendations),

      specialAds:
        Boolean(features.specialAds),
    },

    expiresAt:
      access.expiresAt ||
      null,

    reason:
      access.reason ||
      "",

    updatedBy:
      access.updatedBy ||
      null,

    createdAt:
      access.createdAt,

    updatedAt:
      access.updatedAt,
  };
}

/* ============================================================
   CONVERSATIONS
============================================================ */

async function getConversations(
  params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
): Promise<AiConversationListResponse> {
  const query =
    new URLSearchParams();

  if (params?.search) {
    query.set(
      "search",
      params.search,
    );
  }

  if (params?.status) {
    query.set(
      "status",
      params.status,
    );
  }

  if (params?.page) {
    query.set(
      "page",
      String(params.page),
    );
  }

  if (params?.limit) {
    query.set(
      "limit",
      String(params.limit),
    );
  }

  const queryString =
    query.toString();

  const response =
    await request<any>(
      `/conversations${
        queryString
          ? `?${queryString}`
          : ""
      }`,
    );

  return {
    data:
      (response.data || []).map(
        normalizeConversation,
      ),

    pagination:
      response.pagination || {
        page: 1,
        limit: 25,
        total: 0,
        pages: 0,
      },
  };
}

async function updateConversation(
  id: string,
  data: {
    status: AiConversation["status"];
    moderationNote?: string;
    summary?: string;
  },
): Promise<AiConversation> {
  const response =
    await request<any>(
      `/conversations/${encodeURIComponent(
        id,
      )}`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status:
            data.status === "ended"
              ? "completed"
              : data.status,

          moderationNote:
            data.moderationNote,

          summary:
            data.summary,
        }),
      },
    );

  return normalizeConversation(
    response,
  );
}

function normalizeConversation(
  conversation: any,
): AiConversation {
  return {
    ...conversation,

    id:
      conversation.id ||
      conversation._id ||
      "",

    userId:
      conversation.userId,

    userName:
      conversation.userName ||
      "Unknown User",

    title:
      conversation.title ||
      "",

    summary:
      conversation.summary ||
      "",

    type:
      conversation.type ||
      conversation.channel ||
      "chat",

    channel:
      conversation.channel ||
      conversation.type ||
      "chat",

    status:
      conversation.status ===
      "completed"
        ? "ended"
        : conversation.status,

    startedAt:
      conversation.startedAt ||
      conversation.createdAt,

    durationSeconds:
      conversation.durationSeconds ||
      0,

    messageCount:
      conversation.messageCount ||
      0,

    tokensUsed:
      conversation.tokensUsed ||
      0,

    creditsUsed:
      conversation.creditsUsed ||
      0,

    lastMessage:
      conversation.lastMessage ||
      "",

    moderationNote:
      conversation.moderationNote ||
      "",
  };
}

/* ============================================================
   TOOLS
============================================================ */

async function getTools(): Promise<
  AiTool[]
> {
  const response =
    await request<any[]>("/tools");

  return response.map(
    normalizeTool,
  );
}

async function createTool(
  data: Partial<AiTool>,
): Promise<AiTool> {
  const response =
    await request<any>("/tools", {
      method: "POST",

      body: JSON.stringify(data),
    });

  return normalizeTool(response);
}

async function updateTool(
  id: string,
  data: Partial<AiTool>,
): Promise<AiTool> {
  const response =
    await request<any>(
      `/tools/${encodeURIComponent(id)}`,
      {
        method: "PATCH",

        body: JSON.stringify(data),
      },
    );

  return normalizeTool(response);
}

function normalizeTool(
  tool: any,
): AiTool {
  return {
    ...tool,

    id:
      tool.id ||
      tool._id ||
      "",

    name:
      tool.name ||
      "",

    description:
      tool.description ||
      "",

    type:
      tool.type ||
      "function",

    enabled:
      Boolean(tool.enabled),

    requiresAccess:
      tool.requiresAccess !== false,

    schema:
      tool.schema ||
      {},

    vapiToolId:
      tool.vapiToolId,
  };
}

/**
 * Compatibility helper for older UI components
 * that expect:
 *
 * {
 *   search_jobs: true,
 *   search_products: true
 * }
 */
async function getToolFlags(): Promise<
  Record<string, boolean>
> {
  const tools =
    await getTools();

  return Object.fromEntries(
    tools.map((tool) => [
      tool.name,
      tool.enabled,
    ]),
  );
}

async function updateTools(
  data: Record<string, boolean>,
) {
  const tools =
    await getTools();

  const updates =
    Object.entries(data);

  await Promise.all(
    updates.map(
      async ([name, enabled]) => {
        const tool =
          tools.find(
            (item) =>
              item.name === name,
          );

        if (!tool) {
          return;
        }

        await updateTool(
          tool.id,
          {
            enabled,
          },
        );
      },
    ),
  );

  return getToolFlags();
}

/* ============================================================
   RECOMMENDATIONS
============================================================ */

async function getRecommendations() {
  return request<
    AiRecommendation[]
  >("/recommendations");
}

/* ============================================================
   SPECIAL ADS
============================================================ */

async function getSpecialAds() {
  return request<
    AiSpecialAd[]
  >("/special-ads");
}

/* ============================================================
   USAGE
============================================================ */

async function getUsage(params?: {
  from?: string;
  to?: string;
}): Promise<AiUsageResponse> {
  const query =
    new URLSearchParams();

  if (params?.from) {
    query.set(
      "from",
      params.from,
    );
  }

  if (params?.to) {
    query.set(
      "to",
      params.to,
    );
  }

  const queryString =
    query.toString();

  return request<AiUsageResponse>(
    `/usage${
      queryString
        ? `?${queryString}`
        : ""
    }`,
  );
}

/* ============================================================
   SETTINGS
============================================================ */

async function getSettings(): Promise<AiSettings> {
  return request<AiSettings>(
    "/settings",
  );
}

async function updateSettings(
  data: Partial<AiSettings>,
): Promise<AiSettings> {
  return request<AiSettings>(
    "/settings",
    {
      method: "PATCH",

      body: JSON.stringify(data),
    },
  );
}

/* ============================================================
   EMERGENCY DISABLE
============================================================ */

async function emergencyDisable(
  disabled = true,
  reason = "Emergency AI shutdown",
) {
  return request<{
    success: boolean;
    disabled: boolean;
    settings: AiSettings;
  }>("/emergency-disable", {
    method: "POST",

    body: JSON.stringify({
      disabled,
      reason,
    }),
  });
}

/* ============================================================
   VAPI
============================================================ */

async function getVapiStatus(): Promise<VapiStatus> {
  return request<VapiStatus>(
    "/vapi/status",
  );
}

async function getVapiAssistants(): Promise<
  VapiAssistant[]
> {
  return request<VapiAssistant[]>(
    "/vapi/assistants",
  );
}

async function getVapiAssistant(
  assistantId: string,
): Promise<VapiAssistant> {
  return request<VapiAssistant>(
    `/vapi/assistants/${encodeURIComponent(
      assistantId,
    )}`,
  );
}

/* ============================================================
   API
============================================================ */

export const aiAdminApi = {
  getDashboard,

  getPlans,
  createPlan,
  updatePlan,

  getUsers,
  getUserAccess,
  updateUserAccess,

  getConversations,
  updateConversation,

  getTools,
  createTool,
  updateTool,

  /*
   * Compatibility with the original frontend.
   */
  getToolFlags,
  updateTools,

  getRecommendations,

  getSpecialAds,

  getUsage,

  getSettings,
  updateSettings,

  emergencyDisable,

  getVapiStatus,
  getVapiAssistants,
  getVapiAssistant,
};

export default aiAdminApi;