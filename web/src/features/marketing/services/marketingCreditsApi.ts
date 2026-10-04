import { FOCKIS_API_URL } from "../../../config/fockisConfig";

export type CreditChannel = "email" | "sms";

export interface Money {
  amount: number;
  currency: string;
}

export interface CreditPackage {
  packageId: string;
  channel: CreditChannel;
  credits: number;
  price: Money | null;
  label?: string;
  bestValue?: boolean;
  status: "active" | "hidden";
}

export interface CreditBalance {
  businessId: string;
  workspaceId: string;
  planId: string;

  emailCreditsIncluded: number;
  emailCreditsRemaining: number;
  emailCreditsUsed: number;

  smsCreditsIncluded: number;
  smsCreditsRemaining: number;
  smsCreditsUsed: number;

  emailCreditsBonus: number;
  smsCreditsBonus: number;

  billingCycle: string;
  renewalDate: string;
  status: string;
  billingStatus: string;
}

export interface CreditPurchaseResponse {
  success?: boolean;
  mode?: "redirect" | "mock";
  url?: string;
  sessionId?: string;
  message?: string;
  [key: string]: unknown;
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(
    `${FOCKIS_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      text ||
        `Marketing billing request failed: ${response.status}`,
    );
  }

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function toNumber(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result) ? result : 0;
}

function normalizeBalance(
  raw: unknown,
): CreditBalance {
  const source =
    raw &&
    typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const balance = toNumber(source.balance);
  const used = toNumber(source.used);
  const purchased = toNumber(source.purchased);

  const emailRemaining =
    toNumber(source.emailCreditsRemaining) ||
    balance;

  const emailUsed =
    toNumber(source.emailCreditsUsed) ||
    used;

  const smsRemaining = toNumber(
    source.smsCreditsRemaining,
  );

  const smsUsed = toNumber(
    source.smsCreditsUsed,
  );

  return {
    businessId: String(
      source.businessId ?? "",
    ),

    workspaceId: String(
      source.workspaceId ?? "",
    ),

    planId: String(
      source.planId ?? "standard",
    ),

    emailCreditsIncluded: Math.max(
      0,
      emailRemaining +
        emailUsed -
        purchased,
    ),

    emailCreditsRemaining: Math.max(
      0,
      emailRemaining,
    ),

    emailCreditsUsed: Math.max(
      0,
      emailUsed,
    ),

    smsCreditsIncluded: Math.max(
      0,
      smsRemaining + smsUsed,
    ),

    smsCreditsRemaining: Math.max(
      0,
      smsRemaining,
    ),

    smsCreditsUsed: Math.max(
      0,
      smsUsed,
    ),

    emailCreditsBonus: Math.max(
      0,
      purchased,
    ),

    smsCreditsBonus: 0,

    billingCycle: String(
      source.billingCycle ?? "monthly",
    ),

    renewalDate: String(
      source.renewalDate ??
        new Date(
          Date.now() +
            30 *
              24 *
              60 *
              60 *
              1000,
        ).toISOString(),
    ),

    status: String(
      source.status ?? "active",
    ),

    billingStatus: String(
      source.billingStatus ?? "active",
    ),
  };
}

export async function getMarketingCredits(): Promise<CreditBalance> {
  const response = await request<unknown>(
    "/fockis-mail/billing/credits",
  );

  return normalizeBalance(response);
}

export async function purchaseMarketingCredits(
  channel: CreditChannel,
  packageId: string,
  credits?: number,
): Promise<CreditPurchaseResponse> {
  const body: Record<string, unknown> = {
    channel,
    packageId,
  };

  if (credits !== undefined) {
    body.credits = credits;
  }

  const response =
    await request<CreditPurchaseResponse>(
      "/fockis-mail/billing/credits/purchase",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

  if (
    response.url &&
    response.mode === "redirect"
  ) {
    window.location.assign(response.url);
  }

  return response;
}