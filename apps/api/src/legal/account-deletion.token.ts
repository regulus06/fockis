/**
 * Injection token for the account deletion workflow (provided globally by
 * LegalModule). Other modules inject it with @Optional() so they keep
 * working if the legal module is not loaded.
 */
export const ACCOUNT_DELETION_HANDLER = "ACCOUNT_DELETION_HANDLER";

export interface AccountDeletionHandler {
  /** Runs the full deletion workflow (holds, retention, anonymization, audit). */
  process(userId: string, source: "user" | "admin", requestedBy: string): Promise<{ number: string; status: string }>;
  /** Checks the password (staff accounts refused), then runs process(). */
  requestOwnDeletion(userId: string, password: string): Promise<{ number: string; status: string }>;
  /** Active legal holds naming this account (number + case reference). */
  activeHolds(userId: string): Promise<{ number: string; caseReference: string }[]>;
}
