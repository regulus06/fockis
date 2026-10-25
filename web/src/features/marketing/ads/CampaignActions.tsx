/* ============================================================================
   FOCKIS ADS — CAMPAIGN ACTIONS

   Shows only the actions the campaign's current status allows
   (see campaignActions in adsModel.ts). Each action calls the existing
   endpoint; the server re-validates the transition and its error message
   is shown if it refuses.
============================================================================ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Copy,
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Send,
  Trash2,
} from "lucide-react";

import {
  createCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  submitCampaign,
} from "../services/campaignApi";
import type { CreateCampaignPayload } from "../types/marketingTypes";

import {
  adsPaths,
  campaignActions,
  duplicatePayload,
  type AdsCampaign,
  type CampaignActionId,
} from "./adsModel";
import { adsErrorMessage } from "./useAdsData";

interface Props {
  campaign: AdsCampaign;
  raw?: Record<string, unknown>;
  onChanged: () => void | Promise<void>;
  onError: (message: string) => void;
  onNotice?: (message: string) => void;
  /* "inline" shows the primary action as a button next to the menu. */
  variant?: "inline" | "menu";
}

const LABELS: Record<CampaignActionId, string> = {
  view: "View details",
  edit: "Edit",
  submit: "Submit for review",
  pause: "Pause",
  resume: "Resume",
  analytics: "View analytics",
  duplicate: "Duplicate",
  delete: "Delete",
};

const ICONS: Record<CampaignActionId, ReactNode> = {
  view: <Eye size={16} aria-hidden="true" />,
  edit: <Pencil size={16} aria-hidden="true" />,
  submit: <Send size={16} aria-hidden="true" />,
  pause: <Pause size={16} aria-hidden="true" />,
  resume: <Play size={16} aria-hidden="true" />,
  analytics: <BarChart3 size={16} aria-hidden="true" />,
  duplicate: <Copy size={16} aria-hidden="true" />,
  delete: <Trash2 size={16} aria-hidden="true" />,
};

/* The most useful single action for each status. */
function primaryAction(actions: CampaignActionId[]): CampaignActionId {
  for (const id of ["resume", "pause", "submit"] as CampaignActionId[]) {
    if (actions.includes(id)) {
      return id;
    }
  }

  return "view";
}

export default function CampaignActions({
  campaign,
  raw,
  onChanged,
  onError,
  onNotice,
  variant = "inline",
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<CampaignActionId | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const actions = campaignActions(campaign.status);
  const primary = primaryAction(actions);
  const secondary = actions.filter(
    (id) => variant === "menu" || id !== primary,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(id: CampaignActionId) {
    setOpen(false);

    if (busy) {
      return;
    }

    switch (id) {
      case "view":
        navigate(adsPaths.campaign(campaign.id));
        return;
      case "edit":
        navigate(adsPaths.campaignEdit(campaign.id));
        return;
      case "analytics":
        navigate(adsPaths.campaignAnalytics(campaign.id));
        return;
      default:
        break;
    }

    if (
      id === "delete" &&
      !window.confirm(
        `Delete "${campaign.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(id);

    try {
      if (id === "submit") {
        await submitCampaign(campaign.id);
        onNotice?.(`"${campaign.name}" was submitted for review.`);
      } else if (id === "pause") {
        await pauseCampaign(campaign.id);
        onNotice?.(`"${campaign.name}" is paused.`);
      } else if (id === "resume") {
        await resumeCampaign(campaign.id);
        onNotice?.(`"${campaign.name}" is running again.`);
      } else if (id === "delete") {
        await deleteCampaign(campaign.id);
        onNotice?.(`"${campaign.name}" was deleted.`);
      } else if (id === "duplicate") {
        if (!raw) {
          throw new Error("Campaign details are not loaded yet.");
        }

        const created = (await createCampaign(
          duplicatePayload(raw) as unknown as CreateCampaignPayload,
        )) as unknown as Record<string, unknown> | undefined;

        const newId = created?._id ?? created?.id;

        onNotice?.(`Draft copy of "${campaign.name}" created.`);

        if (newId != null) {
          navigate(adsPaths.campaign(String(newId)));
          return;
        }
      }

      await onChanged();
    } catch (error) {
      onError(adsErrorMessage(error, "That action could not be completed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fk-ads-actions" ref={menuRef}>
      {variant === "inline" && (
        <button
          type="button"
          className={`fk-ads-btn fk-ads-btn--sm ${
            primary === "view" ? "fk-ads-btn--ghost" : "fk-ads-btn--soft"
          }`}
          onClick={() => void run(primary)}
          disabled={busy !== null}
          aria-busy={busy === primary}
        >
          {ICONS[primary]}
          {busy === primary ? "Working…" : primary === "view" ? "Open" : LABELS[primary]}
        </button>
      )}

      {secondary.length > 0 && (
        <>
          <button
            type="button"
            className="fk-ads-icon-btn fk-ads-icon-btn--sm"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`More actions for ${campaign.name}`}
            onClick={() => setOpen((value) => !value)}
            disabled={busy !== null}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>

          {open && (
            <div className="fk-ads-menu" role="menu">
              {secondary.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`fk-ads-menu__item${id === "delete" ? " is-danger" : ""}`}
                  onClick={() => void run(id)}
                >
                  {ICONS[id]}
                  {LABELS[id]}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
