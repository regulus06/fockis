import { Injectable } from "@nestjs/common";

import { AccountDeletionService } from "./account-deletion.service";
import { EvidenceService } from "./evidence.service";
import { LegalAuditService } from "./legal-audit.service";
import { LegalHoldsService } from "./legal-holds.service";
import { LegalRequestsService } from "./legal-requests.service";
import { RetentionService } from "./retention.service";

/** Real counts for the Legal & Evidence overview. No figures are invented. */
@Injectable()
export class LegalDashboardService {
  constructor(
    private readonly evidence: EvidenceService,
    private readonly holds: LegalHoldsService,
    private readonly requests: LegalRequestsService,
    private readonly deletions: AccountDeletionService,
    private readonly audit: LegalAuditService,
    private readonly retention: RetentionService,
  ) {}

  async overview(includeAudit: boolean) {
    const [evidence, holds, requests, deletions, retention, integrity] = await Promise.all([
      this.evidence.counts(),
      this.holds.counts(),
      this.requests.counts(),
      this.deletions.counts(),
      this.retention.summary(),
      this.audit.verify(),
    ]);
    return {
      preservedRecords: evidence.preserved,
      activeHolds: holds.active,
      holdsDueForReview: holds.reviewDue,
      openRequests: requests.open,
      overdueRequests: requests.overdue,
      deletionRecords: deletions.total,
      deletionsWithHold: deletions.withHold,
      audit: { intact: integrity.intact, checked: integrity.checked },
      retention,
      recent: includeAudit ? await this.audit.recent(6) : [],
    };
  }
}
