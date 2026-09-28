import React, { useEffect, useState } from "react";
import type { MarketingAdAdmin, MarketingCampaignAdmin, MarketingCampaignStatus } from "../types/marketingAdmin.types";
import { marketingAdminControlApi } from "../api/marketingAdminControlApi";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="marketing-admin-page-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function LoadingState() { return <section className="marketing-admin__card"><div className="marketing-admin-loading">Loading marketing data…</div></section>; }
export function EmptyState({ message }: { message: string }) { return <div className="marketing-admin-empty">{message}</div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div className="marketing-admin__error"><strong>Request failed</strong><span>{message}</span>{onRetry && <button onClick={onRetry}>Try Again</button>}</div>; }
export function formatCurrency(value?: number) { return (value ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" }); }
export function formatNumber(value?: number) { return (value ?? 0).toLocaleString(); }
export function formatDate(value?: string) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); }
export function statusClass(status?: string) { return `marketing-admin-status marketing-admin-status--${String(status ?? "unknown").toLowerCase().replace(/_/g, "-")}`; }

export function CampaignActionButtons({ campaign, onRefresh }: { campaign: MarketingCampaignAdmin; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (action: string) => {
    setBusy(true);
    try {
      const body = { reason: "Marketing Admin action", notifyAdvertiser: true };
      if (action === "approve") await marketingAdminControlApi.approveCampaign(campaign.id, body);
      if (action === "publish") await marketingAdminControlApi.publishCampaign(campaign.id, body);
      if (action === "reject") await marketingAdminControlApi.rejectCampaign(campaign.id, body);
      if (action === "pause") await marketingAdminControlApi.pauseCampaign(campaign.id, body);
      if (action === "resume") await marketingAdminControlApi.resumeCampaign(campaign.id, body);
      if (action === "block") await marketingAdminControlApi.blockCampaign(campaign.id, { ...body, stopAllCampaignDelivery: true });
      if (action === "unblock") await marketingAdminControlApi.unblockCampaign(campaign.id, body);
      if (action === "archive") await marketingAdminControlApi.archiveCampaign(campaign.id, body);
      onRefresh();
    } catch (e) { window.alert(e instanceof Error ? e.message : "Marketing action failed"); }
    finally { setBusy(false); }
  };
  return <div className="marketing-admin__actions">
    {campaign.status === "PENDING_REVIEW" && <button disabled={busy} onClick={() => void run("approve")}>Approve</button>}
    {campaign.status === "APPROVED" && <button disabled={busy} onClick={() => void run("publish")}>Publish</button>}
    {campaign.status === "ACTIVE" && <button disabled={busy} onClick={() => void run("pause")}>Pause</button>}
    {campaign.status === "PAUSED" && <button disabled={busy} onClick={() => void run("resume")}>Resume</button>}
    {campaign.status !== "BLOCKED" && campaign.status !== "ARCHIVED" && <button disabled={busy} onClick={() => void run("block")}>Block</button>}
    {campaign.status === "BLOCKED" && <button disabled={busy} onClick={() => void run("unblock")}>Unblock</button>}
    {campaign.status !== "ARCHIVED" && <button disabled={busy} onClick={() => void run("archive")}>Archive</button>}
  </div>;
}

export function AdActionButtons({ ad, onRefresh }: { ad: MarketingAdAdmin; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (action: string) => {
    setBusy(true);
    try {
      const body = { reason: "Marketing Admin action", notifyAdvertiser: true };
      if (action === "approve") await marketingAdminControlApi.approveAd(ad.id, body);
      if (action === "publish") await marketingAdminControlApi.publishAd(ad.id, body);
      if (action === "reject") await marketingAdminControlApi.rejectAd(ad.id, body);
      if (action === "pause") await marketingAdminControlApi.pauseAd(ad.id, body);
      if (action === "resume") await marketingAdminControlApi.resumeAd(ad.id, body);
      if (action === "block") await marketingAdminControlApi.blockAd(ad.id, body);
      if (action === "unblock") await marketingAdminControlApi.unblockAd(ad.id, body);
      if (action === "archive") await marketingAdminControlApi.archiveAd(ad.id, body);
      onRefresh();
    } catch (e) { window.alert(e instanceof Error ? e.message : "Ad action failed"); }
    finally { setBusy(false); }
  };
  return <div className="marketing-admin__actions">
    {ad.status === "PENDING_REVIEW" && <button disabled={busy} onClick={() => void run("approve")}>Approve</button>}
    {ad.status === "APPROVED" && <button disabled={busy} onClick={() => void run("publish")}>Publish</button>}
    {ad.status === "ACTIVE" && <button disabled={busy} onClick={() => void run("pause")}>Pause</button>}
    {ad.status === "PAUSED" && <button disabled={busy} onClick={() => void run("resume")}>Resume</button>}
    {ad.status !== "BLOCKED" && ad.status !== "ARCHIVED" && <button disabled={busy} onClick={() => void run("block")}>Block</button>}
    {ad.status === "BLOCKED" && <button disabled={busy} onClick={() => void run("unblock")}>Unblock</button>}
    {ad.status !== "ARCHIVED" && <button disabled={busy} onClick={() => void run("archive")}>Archive</button>}
  </div>;
}

export function useCampaigns(status?: MarketingCampaignStatus) {
  const [data, setData] = useState<MarketingCampaignAdmin[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setData(await marketingAdminControlApi.listCampaigns(status ? { status } : undefined)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load campaigns"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [status]); return { data, loading, error, refresh: load };
}

export function useAds(status?: string) {
  const [data, setData] = useState<MarketingAdAdmin[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setData(await marketingAdminControlApi.listAds(status ? { status } : undefined)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load advertisements"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [status]); return { data, loading, error, refresh: load };
}
