import { RISK_RANK, RiskLevel } from "./security-incident.schema";

// ============================================================================
// LOGIN RISK EVALUATION (pure functions, unit-tested)
//
// Signals are counts the API observed itself. A browser/device description
// is only a hint (it can be spoofed) and is never treated as proof of a
// physical device.
// ============================================================================

export interface MonitoringThresholds {
  windowMinutes: number;
  warning: number;
  high: number;
  critical: number;
  sourceAbuse: number;
  privilegedEscalation: boolean;
}

export function thresholdsFromPolicy(values: Record<string, boolean | number>): MonitoringThresholds {
  const warning = Math.max(2, Number(values.loginWarningThreshold ?? 3));
  const high = Math.max(warning + 1, Number(values.loginHighRiskThreshold ?? 5));
  const critical = Math.max(high + 1, Number(values.loginCriticalThreshold ?? 10));

  return {
    windowMinutes: Math.max(1, Number(values.loginMonitoringWindowMinutes ?? 10)),
    warning,
    high,
    critical,
    sourceAbuse: Math.max(5, Number(values.sourceAbuseThreshold ?? 25)),
    privilegedEscalation: values.privilegedAccountMonitoring !== false,
  };
}

export interface AccountSignals {
  /** Failed attempts (incl. refused during lockout) in the window. */
  windowFailures: number;
  /** Attempts refused during a lockout in the window. */
  windowBlocked: number;
  /** Distinct source networks in the window. */
  distinctSources: number;
  privileged: boolean;
  /** No account behind the address (unknown-account guessing). */
  unknownAccount?: boolean;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  reasonCodes: string[];
}

export const REASON = {
  WARNING: "FAILED_LOGINS_WARNING_THRESHOLD",
  HIGH: "FAILED_LOGINS_HIGH_THRESHOLD",
  CRITICAL: "FAILED_LOGINS_CRITICAL_THRESHOLD",
  BLOCKED: "ATTEMPTS_DURING_LOCKOUT",
  MULTI_SOURCE: "MULTIPLE_SOURCE_NETWORKS",
  PRIVILEGED: "PRIVILEGED_ACCOUNT",
  UNKNOWN_ACCOUNT: "UNKNOWN_ACCOUNT_ADDRESS",
  SOURCE_MANY_ACCOUNTS: "ONE_SOURCE_MANY_ACCOUNTS",
  SOURCE_VOLUME: "HIGH_VOLUME_FROM_ONE_SOURCE",
  SUCCESS_AFTER_FAILURES: "SUCCESSFUL_SIGN_IN_AFTER_FAILURES",
  NEW_DEVICE_AND_NETWORK: "NEW_DEVICE_AND_NETWORK",
} as const;

function raise(level: RiskLevel): RiskLevel {
  if (level === "warning") return "high";
  if (level === "high") return "critical";
  return level;
}

/** Risk for one account (or one unknown address). */
export function evaluateAccountRisk(
  signals: AccountSignals,
  thresholds: MonitoringThresholds,
): RiskResult {
  const failures = Math.max(0, Math.floor(signals.windowFailures));
  const reasonCodes: string[] = [];

  let level: RiskLevel = "none";

  if (failures >= thresholds.critical) {
    level = "critical";
    reasonCodes.push(REASON.CRITICAL);
  } else if (failures >= thresholds.high) {
    level = "high";
    reasonCodes.push(REASON.HIGH);
  } else if (failures >= thresholds.warning) {
    level = "warning";
    reasonCodes.push(REASON.WARNING);
  }

  if (level === "none") return { level, score: Math.min(failures * 5, 20), reasonCodes };

  if (signals.windowBlocked > 0) reasonCodes.push(REASON.BLOCKED);
  if (signals.distinctSources >= 3) reasonCodes.push(REASON.MULTI_SOURCE);
  if (signals.unknownAccount) reasonCodes.push(REASON.UNKNOWN_ACCOUNT);

  if (signals.privileged) {
    reasonCodes.push(REASON.PRIVILEGED);
    if (thresholds.privilegedEscalation) level = raise(level);
  }

  const base = { none: 0, warning: 40, high: 65, critical: 85 }[level];
  const score = Math.min(
    100,
    base +
      (signals.windowBlocked > 0 ? 5 : 0) +
      (signals.distinctSources >= 3 ? 5 : 0) +
      (signals.privileged ? 5 : 0),
  );

  return { level, score, reasonCodes };
}

/** Risk for one source address across accounts (alerting only). */
export function evaluateSourceRisk(
  signals: { windowFailures: number; distinctTargets: number },
  thresholds: MonitoringThresholds,
): RiskResult {
  const reasonCodes: string[] = [];

  if (signals.windowFailures < thresholds.sourceAbuse) {
    return { level: "none", score: 0, reasonCodes };
  }

  reasonCodes.push(REASON.SOURCE_VOLUME);

  let level: RiskLevel = "warning";

  if (signals.distinctTargets >= 5) {
    reasonCodes.push(REASON.SOURCE_MANY_ACCOUNTS);
    level = "high";
  }

  if (signals.windowFailures >= thresholds.sourceAbuse * 4) level = "critical";

  return { level, score: { none: 0, warning: 45, high: 70, critical: 90 }[level], reasonCodes };
}

export function rankOf(level: RiskLevel): number {
  return RISK_RANK[level];
}

export function levelToPriority(level: RiskLevel): "medium" | "high" | "critical" {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  return "medium";
}

/** Short human labels for reason codes (shown to administrators). */
export const REASON_LABELS: Record<string, string> = {
  [REASON.WARNING]: "Failed attempts reached the warning threshold",
  [REASON.HIGH]: "Failed attempts reached the high-risk threshold",
  [REASON.CRITICAL]: "Failed attempts reached the critical threshold",
  [REASON.BLOCKED]: "Attempts continued during a lockout",
  [REASON.MULTI_SOURCE]: "Attempts came from 3 or more networks",
  [REASON.PRIVILEGED]: "Administrator account",
  [REASON.UNKNOWN_ACCOUNT]: "Address has no Fockis account",
  [REASON.SOURCE_MANY_ACCOUNTS]: "One source tried 5 or more accounts",
  [REASON.SOURCE_VOLUME]: "High volume of failures from one source",
  [REASON.SUCCESS_AFTER_FAILURES]: "Correct password after failed attempts",
  [REASON.NEW_DEVICE_AND_NETWORK]: "New browser and network",
};
