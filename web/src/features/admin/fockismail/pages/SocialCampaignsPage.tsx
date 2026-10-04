import { useState } from "react";
import type { FockisAudienceType, SocialCampaign, SocialNetwork } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMarketingPath } from "../hooks/useMailchimp";
import { channelsApi } from "../services/channelsApi";
import { contentApi } from "../services/contentApi";
import { accountApi } from "../services/mailchimpApi";
import { Badge } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { SelectField, TextArea, TextField } from "../components/ui/Field";
import { EmptyState, ErrorState, Notice, SkeletonRows } from "../components/ui/Feedback";
import { Icon } from "../components/ui/Icon";
import { FOCKIS_AUDIENCE_LABELS } from "../utils/labels";
import type { Tone } from "../utils/labels";
import { cx, formatDate, formatNumber, formatPercent } from "../utils/format";

const NETWORKS: Array<{ id: SocialNetwork; label: string; limit: number; integration: string; color: string }> = [
  { id: "fockis", label: "Fockis", limit: 5000, integration: "int_users", color: "#1f5eff" },
  { id: "instagram", label: "Instagram", limit: 2200, integration: "int_instagram", color: "#e0598b" },
  { id: "facebook", label: "Facebook", limit: 63206, integration: "int_meta", color: "#0866ff" },
  { id: "tiktok", label: "TikTok", limit: 2200, integration: "int_tiktok", color: "#14213d" },
];
const STATUS_TONE: Record<SocialCampaign["status"], Tone> = { draft: "neutral", scheduled: "violet", published: "green" };

export default function SocialCampaignsPage() {
  const list = useAsync(() => channelsApi.socialCampaigns(), []);
  const media = useAsync(() => contentApi.media(), []);
  const integrations = useAsync(() => accountApi.integrations(), []);
  const run = useAction();
  const to = useMarketingPath();
  const [name, setName] = useState("");
  const [networks, setNetworks] = useState<SocialNetwork[]>(["fockis"]);
  const [content, setContent] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [audience, setAudience] = useState<FockisAudienceType>("fockis_users");
  const [when, setWhen] = useState("");
  const [touched, setTouched] = useState(false);

  const connected = (id: SocialNetwork) => id === "fockis" || Boolean(integrations.data?.find((i) => i.id === NETWORKS.find((n) => n.id === id)?.integration)?.connected);
  const overLimit = NETWORKS.filter((n) => networks.includes(n.id) && content.length > n.limit);
  const needsMedia = (networks.includes("instagram") || networks.includes("tiktok")) && mediaIds.length === 0;
  const valid = name.trim() && content.trim() && networks.length > 0 && overLimit.length === 0 && !needsMedia;

  const submit = async (schedule: boolean) => {
    setTouched(true);
    if (!valid) return;
    const c = await run(
      () => channelsApi.saveSocial({ name: name.trim(), networks, content, mediaIds, audience, status: schedule ? "scheduled" : "draft", scheduledAt: schedule && when ? new Date(when).toISOString() : undefined }),
      schedule ? "Social post scheduled." : "Saved as a draft.",
    );
    if (c) {
      setName(""); setContent(""); setMediaIds([]); setWhen(""); setTouched(false);
      list.reload();
    }
  };

  const selectedMedia = (media.data ?? []).filter((m) => mediaIds.includes(m.id));

  return (
    <div className="fm-page">
      <PageHeader title="Social campaigns" description="Post to your Fockis feed and connected social accounts from one place." />
      <div className="fm-grid fm-grid--builder">
        <Panel title="Create post">
          <TextField label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} error={touched && !name.trim() ? "Name this campaign." : undefined} />
          <div className="fm-field">
            <span className="fm-field__label">Post to</span>
            <div className="fm-networks">
              {NETWORKS.map((n) => {
                const on = networks.includes(n.id);
                const ok = connected(n.id);
                return (
                  <button key={n.id} type="button" aria-pressed={on} disabled={!ok} className={cx("fm-network", on && "is-on")} style={{ ["--net" as string]: n.color }} onClick={() => setNetworks(on ? networks.filter((x) => x !== n.id) : [...networks, n.id])} title={ok ? undefined : `Connect ${n.label} in Integrations`}>
                    <span className="fm-network__mono">{n.label.slice(0, 2)}</span>
                    {n.label}
                    {!ok && <small>Not connected</small>}
                  </button>
                );
              })}
            </div>
          </div>
          <TextArea label="Post" rows={5} value={content} onChange={(e) => setContent(e.target.value)} hint={`${content.length} characters${networks.length ? ` · limit ${Math.min(...NETWORKS.filter((n) => networks.includes(n.id)).map((n) => n.limit)).toLocaleString()}` : ""}`} error={overLimit.length ? `Too long for ${overLimit.map((n) => n.label).join(", ")}.` : touched && !content.trim() ? "Write the post." : undefined} />
          <div className="fm-field">
            <span className="fm-field__label">Media {needsMedia && <span className="fm-field__error">Instagram and TikTok need an image or video.</span>}</span>
            <div className="fm-mediapick">
              {(media.data ?? []).filter((m) => m.kind === "image" || m.kind === "video").slice(0, 8).map((m) => {
                const on = mediaIds.includes(m.id);
                return (
                  <button key={m.id} type="button" aria-pressed={on} className={cx(on && "is-on")} style={{ background: m.swatch }} onClick={() => setMediaIds(on ? mediaIds.filter((x) => x !== m.id) : [...mediaIds, m.id])} title={m.name}>
                    <Icon name={m.kind === "video" ? "video" : "image"} />
                    {on && <span className="fm-mediapick__check"><Icon name="check" size={12} /></span>}
                    <span className="fm-sr">{m.name}</span>
                  </button>
                );
              })}
              <LinkButton to={to("content")} size="sm" variant="ghost" icon="upload">Upload</LinkButton>
            </div>
          </div>
          <div className="fm-formgrid">
            <SelectField label="Fockis audience" value={audience} onChange={(e) => setAudience(e.target.value as FockisAudienceType)} options={Object.entries(FOCKIS_AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))} hint="Targets the Fockis feed. Other networks use their own audiences." />
            <TextField label="Schedule" optional type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="fm-row fm-row--end">
            <Button onClick={() => submit(false)}>Save draft</Button>
            <Button variant="primary" icon="calendar" disabled={!when} onClick={() => submit(true)}>Schedule post</Button>
          </div>
          <Notice>Publishing to Fockis uses the native feed. Other networks publish through the backend after you connect them in <LinkButton to={to("integrations")} size="sm" variant="ghost">Integrations</LinkButton>.</Notice>
        </Panel>

        <Panel title="Preview">
          {networks.length === 0 ? <EmptyState compact icon="share" title="Pick a network" body="Previews appear here." /> : (
            <div className="fm-stack">
              {NETWORKS.filter((n) => networks.includes(n.id)).map((n) => (
                <article key={n.id} className="fm-socialpreview" style={{ ["--net" as string]: n.color }}>
                  <header><span className="fm-network__mono">{n.label.slice(0, 2)}</span><div><strong>Fockis</strong><small>{n.label} · {when ? formatDate(when) : "Draft"}</small></div></header>
                  <p>{content || "Your post text appears here."}</p>
                  {selectedMedia[0] && <div className="fm-socialpreview__media" style={{ background: selectedMedia[0].swatch }}><Icon name={selectedMedia[0].kind === "video" ? "video" : "image"} size={28} /></div>}
                  <footer>Like · Comment · Share</footer>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Social campaigns" flush>
        {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <SkeletonRows rows={3} cols={5} /> : !list.data?.length ? (
          <EmptyState icon="share" title="No social campaigns yet" body="Your drafts and scheduled posts will appear here." />
        ) : (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Campaign</th><th scope="col">Networks</th><th scope="col">Audience</th><th scope="col">Status</th><th scope="col" className="is-num">Reach</th><th scope="col" className="is-num">Engagement</th></tr></thead>
            <tbody>{list.data.map((c) => (
              <tr key={c.id}>
                <td className="fm-table__primary"><strong>{c.name}</strong><span className="fm-table__sub">{c.content}</span></td>
                <td>{c.networks.map((n) => NETWORKS.find((x) => x.id === n)?.label).join(", ")}</td>
                <td>{FOCKIS_AUDIENCE_LABELS[c.audience]}</td>
                <td><Badge tone={STATUS_TONE[c.status]} dot>{c.status[0].toUpperCase() + c.status.slice(1)}</Badge>{c.scheduledAt && <span className="fm-table__sub">{formatDate(c.scheduledAt)}</span>}</td>
                <td className="is-num">{c.reach ? formatNumber(c.reach) : "—"}</td>
                <td className="is-num">{c.engagement ? formatPercent(c.engagement) : "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>
    </div>
  );
}
