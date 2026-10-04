import { createContext, useCallback, useContext } from "react";
import type { DateRange } from "../types/mailchimp.types";

export type ToastTone = "success" | "error" | "info";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

export interface MarketingContextValue {
  /** Mailchimp audience ID from VITE_MAILCHIMP_AUDIENCE_ID (public, not secret). */
  audienceId: string;
  /** True when services return demo data instead of calling a backend. */
  isMock: boolean;
  basePath: string;
  userName: string;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const MarketingContext = createContext<MarketingContextValue | null>(null);

export function useMailchimp(): MarketingContextValue {
  const ctx = useContext(MarketingContext);
  if (!ctx) {
    throw new Error("useMailchimp must be used inside <MarketingProvider>.");
  }
  return ctx;
}

/** Builds an absolute path inside the marketing module. */
export function useMarketingPath(): (sub?: string) => string {
  const { basePath } = useMailchimp();
  // Stable identity so it is safe to use in effect dependency arrays.
  return useCallback((sub = "") => (sub ? `${basePath}/${sub.replace(/^\//, "")}` : basePath), [basePath]);
}

/**
 * Runs a mutation, shows a toast on success/failure, and returns the result.
 * Keeps error handling consistent across every page.
 */
export function useAction() {
  const { toast } = useMailchimp();
  return async function run<T>(
    work: () => Promise<T>,
    success?: string,
  ): Promise<T | undefined> {
    try {
      const result = await work();
      if (success) toast(success, "success");
      return result;
    } catch (err) {
      toast(err instanceof Error ? err.message : "That action failed. Try again.", "error");
      return undefined;
    }
  };
}
