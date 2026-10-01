import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import BudgetEditor from "../components/BudgetEditor";

import type {
  UpdateBudgetPayload,
} from "../types/marketingTypes";

import "../styles/MarketingBillingPage.scss";

/* ============================================================================
   CONFIG
============================================================================ */

const API_URL =
  FOCKIS_API_URL;

/* ============================================================================
   BILLING REQUEST
============================================================================ */

async function billingRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    localStorage.getItem("token");

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),

          ...(options.headers || {}),
        },
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `Billing request failed: ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/* ============================================================================
   TYPES
============================================================================ */

interface CampaignBudget {
  budget?: number;
  dailyBudget?: number;
}

/* ============================================================================
   GET BUDGET
============================================================================ */

export async function getBudget(
  campaignId: string,
): Promise<CampaignBudget> {
  return billingRequest<CampaignBudget>(
    `/marketing/billing/campaign/${campaignId}`,
  );
}

/* ============================================================================
   UPDATE BUDGET
============================================================================ */

export async function updateBudget(
  campaignId: string,
  payload: UpdateBudgetPayload,
): Promise<CampaignBudget> {
  return billingRequest<CampaignBudget>(
    `/marketing/billing/campaign/${campaignId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

/* ============================================================================
   MARKETING BILLING PAGE
============================================================================ */

export default function MarketingBillingPage() {
  const {
    campaignId: routeCampaignId,
  } = useParams<{
    campaignId: string;
  }>();

  const [
    budget,
    setBudget,
  ] = useState<CampaignBudget>({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /* ==========================================================================
     MISSING CAMPAIGN ID
  ========================================================================== */

  if (!routeCampaignId) {
    return (
      <main className="fk-marketing-page">
        Missing campaign ID.
      </main>
    );
  }

  /*
   * From this point forward TypeScript knows this
   * is a real string.
   */
  const campaignId =
    routeCampaignId;

  /* ==========================================================================
     LOAD BUDGET
  ========================================================================== */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        /*
         * campaignId is captured as a validated string.
         */
        const result =
          await getBudget(
            campaignId,
          );

        if (!cancelled) {
          setBudget(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Failed to load campaign budget:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load budget.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <main className="fk-marketing-page">

      <header className="fk-marketing-header">

        <div>

          <span className="fk-marketing-eyebrow">
            BILLING
          </span>

          <h1>
            Campaign Budget
          </h1>

          <p>
            Manage campaign spending
            limits.
          </p>

        </div>

      </header>

      {loading ? (

        <div className="fk-marketing-loading">
          Loading budget...
        </div>

      ) : error ? (

        <div className="fk-marketing-error">
          {error}
        </div>

      ) : (

        <section className="fk-marketing-panel">

          <BudgetEditor
            budget={
              budget.budget
            }

            dailyBudget={
              budget.dailyBudget
            }

            onSave={async (
              payload: UpdateBudgetPayload,
            ) => {

              try {

                setError(null);

                const result =
                  await updateBudget(
                    campaignId,
                    payload,
                  );

                setBudget(
                  result,
                );

              } catch (err) {

                console.error(
                  "Failed to update campaign budget:",
                  err,
                );

                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to update budget.",
                );

                throw err;
              }
            }}
          />

        </section>

      )}

    </main>
  );
}