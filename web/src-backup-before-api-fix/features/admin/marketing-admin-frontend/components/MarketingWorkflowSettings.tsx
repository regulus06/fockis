import React, { useEffect, useState } from "react";
import { marketingAdminControlApi } from "../api/marketingAdminControlApi";
import { DEFAULT_MARKETING_WORKFLOW } from "../config/marketingWorkflow";
import type { MarketingWorkflowSettings } from "../types/marketingAdmin.types";

interface Props {
  canEdit: boolean;
}

export default function MarketingWorkflowSettings({ canEdit }: Props) {
  const [settings, setSettings] =
    useState<MarketingWorkflowSettings>(DEFAULT_MARKETING_WORKFLOW);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    marketingAdminControlApi
      .getWorkflow()
      .then((value) => {
        if (mounted) setSettings(value);
      })
      .catch(() => {
        // Keep safe defaults when the endpoint is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const save = async () => {
    if (!canEdit) return;

    setSaving(true);
    setMessage("");

    try {
      const saved = await marketingAdminControlApi.updateWorkflow(settings);
      setSettings(saved);
      setMessage("Marketing workflow saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save workflow.",
      );
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof MarketingWorkflowSettings>(
    key: K,
    value: MarketingWorkflowSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <section className="marketing-workflow-settings">
      <h2>Marketing Approval Workflow</h2>

      <label>
        Campaign approval
        <select
          value={settings.campaignApprovalMode}
          disabled={!canEdit}
          onChange={(event) =>
            update(
              "campaignApprovalMode",
              event.target.value as MarketingWorkflowSettings["campaignApprovalMode"],
            )
          }
        >
          <option value="AUTO_PUBLISH">Auto Publish</option>
          <option value="REQUIRE_ADMIN_APPROVAL">
            Require Admin Approval
          </option>
          <option value="REQUIRE_TWO_ADMIN_APPROVALS">
            Require Two Admin Approvals
          </option>
        </select>
      </label>

      <label>
        Advertisement approval
        <select
          value={settings.adApprovalMode}
          disabled={!canEdit}
          onChange={(event) =>
            update(
              "adApprovalMode",
              event.target.value as MarketingWorkflowSettings["adApprovalMode"],
            )
          }
        >
          <option value="AUTO_PUBLISH">Auto Publish</option>
          <option value="REQUIRE_ADMIN_APPROVAL">
            Require Admin Approval
          </option>
          <option value="REQUIRE_TWO_ADMIN_APPROVALS">
            Require Two Admin Approvals
          </option>
        </select>
      </label>

      {(
        [
          ["autoPublishTrustedAdvertisers", "Auto-publish trusted advertisers"],
          ["blockedCampaignStopsAds", "Stop campaign ads when blocked"],
          [
            "blockedCampaignStopsScheduledAds",
            "Stop scheduled ads when campaign is blocked",
          ],
          [
            "blockedCampaignStopsNotifications",
            "Stop campaign notifications when blocked",
          ],
          ["notifyAdvertiserOnBlock", "Notify advertiser when blocked"],
          [
            "requireReviewBeforeReactivation",
            "Require review before blocked campaigns can reactivate",
          ],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={settings[key]}
            disabled={!canEdit}
            onChange={(event) => update(key, event.target.checked)}
          />
          {label}
        </label>
      ))}

      {canEdit && (
        <button type="button" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Workflow"}
        </button>
      )}

      {message && <p role="status">{message}</p>}
    </section>
  );
}
