// web/src/features/admin/fockismail/services/creditsApi.ts

// Credit balances and pre-send checks.
//
// Every call is scoped by businessId.
// The frontend check is a UX guard only: the backend must re-check and
// atomically reserve/deduct credits when a campaign actually sends.

import type {
  CreditBalance,
  CreditChannel,
  CreditCheck,
  CreditThresholds,
} from "../types/platform.types";

import { PLATFORM_ENDPOINTS as EP } from "./endpoints";
import { call } from "./httpClient";
import { platformDb } from "./platformDb";
import { pushNotification } from "./notificationsApi";
import { creditThresholds } from "../data/billingMockData";
import { checkCredits, levelOf } from "../utils/credits";
import { uid } from "../utils/format";

/**
 * Local/mock fallback.
 */
function balanceOrThrow(
  businessId: string,
): CreditBalance {
  const balance = platformDb.balances.find(
    (item) => item.businessId === businessId,
  );

  if (!balance) {
    throw new Error(
      "No credit balance exists for this workspace yet.",
    );
  }

  return balance;
}

function requirePermission(
  permission: "billing.manage_client_credits",
): void {
  if (
    !platformDb.viewer.permissions.includes(
      permission,
    )
  ) {
    throw new Error(
      "You don't have permission to manage client credits.",
    );
  }
}

/**
 * Convert the real Fockis Mail billing response into
 * the existing frontend CreditBalance shape.
 *
 * The backend currently returns:
 *
 *   balance
 *   used
 *   purchased
 *   workspaceId
 *
 * The frontend CreditBalance model requires separate
 * email/SMS plan fields, so the shared backend balance
 * is mapped into both remaining-credit fields.
 */
function normalizeBackendCreditBalance(
  response: unknown,
  businessId: string,
): CreditBalance {
  const raw =
    response &&
    typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  const numeric = (
    value: unknown,
    fallback = 0,
  ): number => {
    const numberValue =
      typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(numberValue)
      ? numberValue
      : fallback;
  };

  const stringValue = (
    value: unknown,
    fallback: string,
  ): string => {
    return typeof value === "string" &&
      value.trim()
      ? value.trim()
      : fallback;
  };

  const balance = Math.max(
    0,
    numeric(raw.balance),
  );

  const used = Math.max(
    0,
    numeric(raw.used),
  );

  const purchased = Math.max(
    0,
    numeric(raw.purchased),
  );

  const workspaceId =
    typeof raw.workspaceId === "string" &&
    raw.workspaceId.trim()
      ? raw.workspaceId
      : `ws_${businessId}`;

  /**
   * The existing backend currently exposes one
   * shared credit pool. Until the backend exposes
   * separate plan allocations, use the purchased
   * amount as the included/base amount when available.
   */
  const includedCredits = Math.max(
    balance + used - purchased,
    0,
  );

  const planId = stringValue(
    raw.planId,
    "standard",
  );

  const billingCycle = stringValue(
    raw.billingCycle,
    "monthly",
  ) as CreditBalance["billingCycle"];

  const renewalDate = stringValue(
    raw.renewalDate,
    new Date(
      Date.now() +
        30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  );

  const billingStatus = stringValue(
    raw.billingStatus,
    "active",
  ) as CreditBalance["billingStatus"];

  return {
    businessId,
    workspaceId,

    planId,

    emailCreditsIncluded:
      includedCredits,

    emailCreditsRemaining:
      balance,

    emailCreditsUsed:
      used,

    smsCreditsIncluded:
      includedCredits,

    smsCreditsRemaining:
      balance,

    smsCreditsUsed: 0,

    /**
     * Backend's purchased value represents the
     * shared purchased/promotional pool.
     */
    emailCreditsBonus:
      purchased,

    smsCreditsBonus: 0,

    billingCycle,

    renewalDate,

    status:
      balance <= 0
        ? "exhausted"
        : "active",

    billingStatus,
  };
}

export const creditsApi = {
  /**
   * Credit warning thresholds.
   */
  thresholds: () =>
    call<CreditThresholds>(
      () => creditThresholds,
      `${EP.plans}/thresholds`,
    ),

  /**
   * Get the credit balance for the current
   * authenticated Fockis Mail workspace.
   *
   * Backend:
   * GET /fockis-mail/billing/credits
   */
  getBalance: async (
    businessId: string,
  ): Promise<CreditBalance> => {
    const response = await call<unknown>(
      () => balanceOrThrow(businessId),
      "/fockis-mail/billing/credits",
    );

    return normalizeBackendCreditBalance(
      response,
      businessId,
    );
  },

  /**
   * Agency-wide view of client balances.
   *
   * Requires billing.manage_client_credits.
   */
  listClientBalances: () =>
    call<CreditBalance[]>(
      () => {
        requirePermission(
          "billing.manage_client_credits",
        );

        return platformDb.balances.filter(
          (balance) =>
            platformDb.businesses.some(
              (business) =>
                business.id ===
                  balance.businessId &&
                business.status !==
                  "archived",
            ),
        );
      },
      EP.agencyCredits,
    ),

  /**
   * Check whether a campaign has enough credits.
   *
   * The backend MUST perform the authoritative check
   * again before sending.
   */
  check: (
    businessId: string,
    channel: CreditChannel,
    required: number,
  ) =>
    call<CreditCheck>(
      () =>
        checkCredits(
          balanceOrThrow(businessId),
          channel,
          required,
          creditThresholds,
        ),
      EP.creditCheck(businessId),
      {
        method: "POST",
        body: {
          channel,
          required,
        },
      },
    ),

  /**
   * Agency credit adjustment.
   *
   * Positive values add bonus credits.
   * Negative values remove credits.
   *
   * The backend remains authoritative when mocks
   * are disabled.
   */
  adjust: (
    businessId: string,
    channel: CreditChannel,
    credits: number,
    reason: string,
  ) =>
    call<CreditBalance>(
      () => {
        requirePermission(
          "billing.manage_client_credits",
        );

        const balance =
          balanceOrThrow(businessId);

        applyCredits(
          balance,
          channel,
          credits,
        );

        platformDb.transactions.unshift({
          id: uid("txn"),
          businessId,
          workspaceId:
            balance.workspaceId,
          type: "adjustment",
          channel,
          description:
            reason ||
            "Agency adjustment",
          credits,
          status: "completed",
          createdAt:
            new Date().toISOString(),
        });

        return balance;
      },
      EP.creditAdjust(businessId),
      {
        method: "POST",
        body: {
          channel,
          credits,
          reason,
        },
      },
    ),
};

/**
 * Mock-only credit mutation.
 *
 * Real production credit mutations must happen
 * in the backend.
 */
export function applyCredits(
  balance: CreditBalance,
  channel: CreditChannel,
  credits: number,
): void {
  if (channel === "email") {
    balance.emailCreditsRemaining =
      Math.max(
        0,
        balance.emailCreditsRemaining +
          credits,
      );

    if (credits > 0) {
      balance.emailCreditsBonus +=
        credits;
    }
  } else {
    balance.smsCreditsRemaining =
      Math.max(
        0,
        balance.smsCreditsRemaining +
          credits,
      );

    if (credits > 0) {
      balance.smsCreditsBonus +=
        credits;
    }
  }

  const emailLevel = levelOf(
    balance,
    "email",
    creditThresholds,
  );

  const smsLevel = levelOf(
    balance,
    "sms",
    creditThresholds,
  );

  balance.status =
    emailLevel === "critical" ||
    smsLevel === "critical"
      ? "exhausted"
      : emailLevel === "low" ||
          smsLevel === "low"
        ? "low"
        : "active";

  if (credits < 0) {
    const level =
      channel === "email"
        ? emailLevel
        : smsLevel;

    if (level !== "normal") {
      const channelName =
        channel === "email"
          ? "Email"
          : "SMS";

      pushNotification({
        type:
          level === "critical"
            ? channel === "email"
              ? "EMAIL_CREDITS_EXHAUSTED"
              : "SMS_CREDITS_EXHAUSTED"
            : channel === "email"
              ? "LOW_EMAIL_CREDITS"
              : "LOW_SMS_CREDITS",

        businessId:
          balance.businessId,

        title:
          level === "critical"
            ? `${channelName} credits exhausted`
            : `${channelName} credits are running low`,

        body: `${(
          channel === "email"
            ? balance.emailCreditsRemaining
            : balance.smsCreditsRemaining
        ).toLocaleString()} remaining.`,

        link:
          `/marketing/billing/${channel}`,
      });
    }
  }
}