import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Campaign } from "../types/mailchimp.types";
import { campaignsApi } from "../services/campaignsApi";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import type { MenuItem } from "./ui/Menu";
import { Modal } from "./ui/Overlay";
import { Button } from "./ui/Button";
import { TextField } from "./ui/Field";
import { Notice } from "./ui/Feedback";

function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 86400000);
  d.setMinutes(0, 0, 0);
  d.setHours(9);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/**
 * Centralizes every campaign action (open, edit, duplicate, schedule, pause,
 * archive, delete, report) so lists, cards and detail pages behave the same.
 */
export function useCampaignActions(onChanged: () => void) {
  const navigate = useNavigate();
  const to = useMarketingPath();
  const run = useAction();
  const { confirm } = useMailchimp();
  const [scheduling, setScheduling] = useState<Campaign | null>(null);
  const [when, setWhen] = useState(defaultScheduleValue());
  const [busy, setBusy] = useState(false);

  const past = when ? new Date(when).getTime() < Date.now() : true;

  const itemsFor = (c: Campaign): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Open", icon: "eye", onSelect: () => navigate(to(`campaigns/${c.id}`)) },
    ];
    if (c.status === "draft" || c.status === "scheduled" || c.status === "paused") {
      items.push({ label: "Edit", icon: "edit", onSelect: () => navigate(to(`compose?campaign=${c.id}`)) });
    }
    items.push({
      label: "Duplicate",
      icon: "copy",
      onSelect: async () => {
        const copy = await run(() => campaignsApi.duplicate(c.id), `Duplicated “${c.name}”.`);
        if (copy) onChanged();
      },
    });
    if (c.status === "draft" || c.status === "paused") {
      items.push({ label: "Schedule", icon: "calendar", onSelect: () => { setWhen(defaultScheduleValue()); setScheduling(c); } });
    }
    if (c.status === "scheduled" || c.status === "sending") {
      items.push({
        label: "Pause",
        icon: "pause",
        onSelect: async () => {
          if (await run(() => campaignsApi.pause(c.id), `Paused “${c.name}”.`)) onChanged();
        },
      });
    }
    if (c.status === "paused") {
      items.push({
        label: "Resume",
        icon: "play",
        onSelect: async () => {
          if (await run(() => campaignsApi.resume(c.id), `Resumed “${c.name}”.`)) onChanged();
        },
      });
    }
    if (c.stats.delivered > 0) {
      items.push({ label: "View report", icon: "report", onSelect: () => navigate(to(`reports?campaign=${c.id}`)) });
    }
    if (c.status !== "archived") {
      items.push({
        label: "Archive",
        icon: "archive",
        separated: true,
        onSelect: async () => {
          if (await run(() => campaignsApi.archive(c.id), `Archived “${c.name}”.`)) onChanged();
        },
      });
    }
    items.push({
      label: "Delete",
      icon: "trash",
      danger: true,
      separated: c.status === "archived",
      onSelect: async () => {
        const ok = await confirm({
          title: `Delete “${c.name}”?`,
          body: c.stats.delivered ? "Its report will also be deleted. This can't be undone." : "This can't be undone.",
          confirmLabel: "Delete campaign",
          danger: true,
        });
        if (ok && (await run(() => campaignsApi.remove(c.id), `Deleted “${c.name}”.`)) !== undefined) onChanged();
      },
    });
    return items;
  };

  const scheduleModal = (
    <Modal
      open={Boolean(scheduling)}
      title="Schedule campaign"
      description={scheduling ? `Choose when “${scheduling.name}” should send.` : undefined}
      onClose={() => setScheduling(null)}
      size="sm"
      footer={
        <>
          <Button onClick={() => setScheduling(null)}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={past}
            onClick={async () => {
              if (!scheduling) return;
              setBusy(true);
              const res = await run(() => campaignsApi.schedule(scheduling.id, new Date(when).toISOString()), `Scheduled “${scheduling.name}”.`);
              setBusy(false);
              if (res) {
                setScheduling(null);
                onChanged();
              }
            }}
          >
            Schedule
          </Button>
        </>
      }
    >
      <TextField
        label="Send date and time"
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        error={past ? "Pick a time in the future." : undefined}
        hint="Uses your browser's time zone."
      />
      <Notice>Sending stays within the send window set in Settings → Sending.</Notice>
    </Modal>
  );

  return { itemsFor, scheduleModal };
}
