/**
 * AdminBroadcast.tsx — Videos, Podcasts, Live TV and Live Radio (live status,
 * stream URLs and broadcast schedule) and the Media Library.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Copy, Headphones, ImagePlus, Loader2, Pencil, Plus, Radio as RadioIcon, Trash2, Tv, Upload, Video } from "lucide-react";

import { Empty, Modal, Skeleton, Thumb } from "../NewsParts";
import { CATEGORY_LABELS, compact, fmtDate, newsApi, newsError, type MediaItemAdmin } from "../newsApi";
import { PageTitle, useAdmin } from "./AdminShell";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Kind = MediaItemAdmin["kind"];

function ItemDialog({ kind, item, onClose, onDone }: { kind: Kind; item: MediaItemAdmin | null; onClose: () => void; onDone: () => void }) {
  const { outlet } = useAdmin();
  const program = kind === "tv_program" || kind === "radio_program";
  const [f, setF] = useState({
    title: item?.title ?? "",
    description: item?.description ?? "",
    mediaUrl: item?.mediaUrl ?? "",
    thumbnailUrl: item?.thumbnailUrl ?? "",
    category: item?.category ?? "",
    tags: (item?.tags ?? []).join(", "),
    showName: item?.showName ?? "",
    episodeNumber: item?.episodeNumber ? String(item.episodeNumber) : "",
    presenters: (item?.presenters ?? []).join(", "),
    days: item?.schedule?.days ?? [],
    startTime: item?.schedule?.startTime ?? "",
    endTime: item?.schedule?.endTime ?? "",
    status: item?.status ?? (program ? "published" : "draft"),
    publishedAt: "",
  });
  const [busy, setBusy] = useState<"" | "save" | "media" | "thumb">("");
  const [error, setError] = useState("");
  const mediaInput = useRef<HTMLInputElement | null>(null);
  const thumbInput = useRef<HTMLInputElement | null>(null);

  async function upload(which: "media" | "thumb", file?: File) {
    if (!file) return;
    setBusy(which);
    setError("");
    try {
      const url = await newsApi.uploadFile(file);
      setF((x) => ({ ...x, [which === "media" ? "mediaUrl" : "thumbnailUrl"]: url }));
    } catch (err) {
      setError(newsError(err, "The file could not be uploaded."));
    } finally {
      setBusy("");
    }
  }

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy("save");
    setError("");
    try {
      await newsApi.saveItem(outlet.id, item?.id ?? null, {
        ...f,
        kind,
        schedule: program ? { days: f.days, startTime: f.startTime, endTime: f.endTime } : undefined,
        publishedAt: f.status === "scheduled" && f.publishedAt ? new Date(f.publishedAt).toISOString() : undefined,
      });
      onDone();
    } catch (err) {
      setError(newsError(err));
    } finally {
      setBusy("");
    }
  }

  const label = { video: "video", podcast: "podcast episode", tv_program: "TV program", radio_program: "radio program" }[kind];
  return (
    <Modal
      title={item ? `Edit ${label}` : `New ${label}`}
      onClose={onClose}
      busy={busy === "save"}
      wide
      footer={
        <>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="nma-item" className="nm-btn nm-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="nm-spin" />} Save
          </button>
        </>
      }
    >
      <form id="nma-item" className="nm-form" onSubmit={save}>
        <label className="nm-field">
          <span className="nm-field__label">Title *</span>
          <input className="nm-input" maxLength={200} value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Description</span>
          <textarea className="nm-input" rows={3} maxLength={4000} value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} />
        </label>
        {!program && (
          <div className="nm-field">
            <span className="nm-field__label">{kind === "video" ? "Video file" : "Audio file"} *</span>
            <span className="nma-inline">
              <input className="nm-input" placeholder="https://… or upload" value={f.mediaUrl} onChange={(ev) => setF({ ...f, mediaUrl: ev.target.value })} />
              <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => mediaInput.current?.click()} disabled={Boolean(busy)}>
                {busy === "media" ? <Loader2 className="nm-spin" /> : <Upload />} Upload
              </button>
            </span>
            <input ref={mediaInput} type="file" hidden accept={kind === "video" ? "video/*" : "audio/*"} onChange={(ev) => upload("media", ev.target.files?.[0])} />
          </div>
        )}
        <div className="nm-field">
          <span className="nm-field__label">{program ? "Program image" : "Thumbnail / cover"}</span>
          <span className="nma-inline">
            {f.thumbnailUrl && <img src={f.thumbnailUrl} alt="" className="nma-thumbprev" />}
            <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => thumbInput.current?.click()} disabled={Boolean(busy)}>
              {busy === "thumb" ? <Loader2 className="nm-spin" /> : <ImagePlus />} Choose image
            </button>
          </span>
          <input ref={thumbInput} type="file" hidden accept="image/*" onChange={(ev) => upload("thumb", ev.target.files?.[0])} />
        </div>
        <div className="nm-form-row">
          {(kind === "podcast" || program) && (
            <label className="nm-field">
              <span className="nm-field__label">{kind === "podcast" ? "Show" : "Program name"}</span>
              <input className="nm-input" value={f.showName} onChange={(ev) => setF({ ...f, showName: ev.target.value })} />
            </label>
          )}
          {kind === "podcast" && (
            <label className="nm-field">
              <span className="nm-field__label">Episode #</span>
              <input className="nm-input" type="number" min={1} value={f.episodeNumber} onChange={(ev) => setF({ ...f, episodeNumber: ev.target.value })} />
            </label>
          )}
          <label className="nm-field">
            <span className="nm-field__label">{program ? "Presenters" : kind === "podcast" ? "Hosts" : "Presenters"} (comma separated)</span>
            <input className="nm-input" value={f.presenters} onChange={(ev) => setF({ ...f, presenters: ev.target.value })} />
          </label>
        </div>
        {program ? (
          <>
            <div className="nm-field">
              <span className="nm-field__label">Days *</span>
              <div className="nm-checks">
                {DAYS.map((d, i) => (
                  <label key={d} className="nm-check">
                    <input type="checkbox" checked={f.days.includes(i)} onChange={(ev) => setF({ ...f, days: ev.target.checked ? [...f.days, i] : f.days.filter((x) => x !== i) })} /> {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="nm-form-row">
              <label className="nm-field">
                <span className="nm-field__label">Starts *</span>
                <input className="nm-input" type="time" value={f.startTime} onChange={(ev) => setF({ ...f, startTime: ev.target.value })} />
              </label>
              <label className="nm-field">
                <span className="nm-field__label">Ends</span>
                <input className="nm-input" type="time" value={f.endTime} onChange={(ev) => setF({ ...f, endTime: ev.target.value })} />
              </label>
            </div>
          </>
        ) : (
          <div className="nm-form-row">
            <label className="nm-field">
              <span className="nm-field__label">Category</span>
              <select className="nm-input" value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })}>
                <option value="">—</option>
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="nm-field">
              <span className="nm-field__label">Tags</span>
              <input className="nm-input" value={f.tags} onChange={(ev) => setF({ ...f, tags: ev.target.value })} />
            </label>
          </div>
        )}
        <div className="nm-form-row">
          <label className="nm-field">
            <span className="nm-field__label">Status</span>
            <select className="nm-input" value={f.status} onChange={(ev) => setF({ ...f, status: ev.target.value as typeof f.status })}>
              <option value="draft">Draft</option>
              <option value="published">{program ? "Show on schedule" : "Publish now"}</option>
              {!program && <option value="scheduled">Schedule</option>}
            </select>
          </label>
          {f.status === "scheduled" && (
            <label className="nm-field">
              <span className="nm-field__label">Publish at</span>
              <input className="nm-input" type="datetime-local" value={f.publishedAt} onChange={(ev) => setF({ ...f, publishedAt: ev.target.value })} />
            </label>
          )}
        </div>
        {!program && f.status !== "draft" && <p className="nm-muted nm-small">Followers who turned on {kind === "video" ? "Video" : "Podcast"} notifications are notified when it publishes.</p>}
        {error && <p className="nm-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

function ItemList({ kind, title, sub, icon: Icon }: { kind: Kind; title: string; sub: string; icon: typeof Video }) {
  const { outlet, notify } = useAdmin();
  const [data, setData] = useState<{ canManage: boolean; items: MediaItemAdmin[] } | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MediaItemAdmin | "new" | null>(null);
  const load = () =>
    newsApi
      .items(outlet.id, kind)
      .then(setData)
      .catch((err) => setError(newsError(err)));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet.id, kind]);
  const program = kind === "tv_program" || kind === "radio_program";
  return (
    <section className="nm-section">
      <header className="nm-sechead">
        <h2>
          <Icon /> {title}
        </h2>
        {data?.canManage && (
          <button type="button" className="nm-btn nm-btn--primary nm-btn--sm" onClick={() => setEditing("new")}>
            <Plus /> Add
          </button>
        )}
      </header>
      <p className="nm-muted nm-small">{sub}</p>
      {error && <p className="nm-form-error">{error}</p>}
      {!data && !error && <Skeleton h={120} />}
      {data && data.items.length === 0 && <Empty icon={Icon} title="Nothing yet" />}
      {data && data.items.length > 0 && (
        <div className="nma-items">
          {data.items.map((it) => (
            <article key={it.id} className="nm-card nma-item">
              {!program && <Thumb src={it.thumbnailUrl} className="nma-item__img" />}
              <div>
                <b>{it.title}</b>
                <small>
                  {program
                    ? `${it.schedule?.days.map((d) => DAYS[d]).join(", ")} · ${it.schedule?.startTime}${it.schedule?.endTime ? `–${it.schedule.endTime}` : ""}`
                    : `${it.status === "published" ? `Published ${fmtDate(it.publishedAt)}` : it.status === "scheduled" ? `Scheduled ${fmtDate(it.publishedAt, true)}` : "Draft"} · ${compact(it.plays)} plays`}
                  {it.presenters.length ? ` · ${it.presenters.join(", ")}` : ""}
                </small>
              </div>
              {data.canManage && (
                <div className="nm-row-actions">
                  <button type="button" className="nm-iconbtn" aria-label="Edit" onClick={() => setEditing(it)}>
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    className="nm-iconbtn"
                    aria-label="Delete"
                    onClick={async () => {
                      if (!window.confirm(`Delete "${it.title}"?`)) return;
                      try {
                        await newsApi.deleteItem(outlet.id, it.id);
                        notify("ok", "Deleted.");
                        void load();
                      } catch (err) {
                        notify("error", newsError(err));
                      }
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {editing && (
        <ItemDialog
          kind={kind}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Saved.");
            void load();
          }}
        />
      )}
    </section>
  );
}

export function VideosPage() {
  return (
    <>
      <PageTitle title="Videos" sub="Upload video reports, add thumbnails and publish or schedule them." />
      <ItemList kind="video" title="Video library" sub="Published videos appear on your profile and in Fockis News › Videos." icon={Video} />
    </>
  );
}

export function PodcastsPage() {
  return (
    <>
      <PageTitle title="Podcasts" sub="Shows and episodes with hosts, covers and a publication schedule." />
      <ItemList kind="podcast" title="Episodes" sub="Group episodes by show name. Published episodes appear on your profile and in Fockis News › Podcasts." icon={Headphones} />
    </>
  );
}

function LiveControls({ kind }: { kind: "tv" | "radio" }) {
  const { outlet, can, notify, reload } = useAdmin();
  const tv = kind === "tv";
  const [url, setUrl] = useState(tv ? outlet.live.tvStreamUrl : outlet.live.radioStreamUrl);
  const [title, setTitle] = useState(tv ? outlet.live.tvTitle : outlet.live.radioTitle);
  const [busy, setBusy] = useState(false);
  const live = tv ? outlet.live.tvLive : outlet.live.radioLive;
  const manage = can("manage_broadcast");
  async function save(goLive?: boolean) {
    setBusy(true);
    try {
      await newsApi.setLive(outlet.id, tv ? { tvStreamUrl: url, tvTitle: title, ...(goLive === undefined ? {} : { tvLive: goLive }) } : { radioStreamUrl: url, radioTitle: title, ...(goLive === undefined ? {} : { radioLive: goLive }) });
      notify("ok", goLive === true ? "You're live. Followers with live alerts were notified." : goLive === false ? "Broadcast ended." : "Saved.");
      reload();
    } catch (err) {
      notify("error", newsError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="nm-card">
      <h2 className="nm-card__title">
        {tv ? <Tv /> : <RadioIcon />} {tv ? "Live TV stream" : "Live radio stream"}{" "}
        {live ? (
          <span className="nm-livetag">
            <span className="nm-live-dot" /> LIVE
          </span>
        ) : (
          <span className="nm-greypill">Off air</span>
        )}
      </h2>
      <p className="nm-muted nm-small">
        Paste the playback URL from your streaming provider ({tv ? "an MP4/WebM or HLS stream your browser can play" : "an MP3/AAC/Icecast stream"}). Fockis plays the stream; it doesn't encode or record it.
      </p>
      <div className="nm-form-row">
        <label className="nm-field">
          <span className="nm-field__label">Stream URL</span>
          <input className="nm-input" value={url} onChange={(ev) => setUrl(ev.target.value)} disabled={!manage} placeholder="https://" />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Now playing / program</span>
          <input className="nm-input" value={title} onChange={(ev) => setTitle(ev.target.value)} disabled={!manage} />
        </label>
      </div>
      {manage && (
        <div className="nm-row-actions">
          <button type="button" className="nm-btn nm-btn--ghost" onClick={() => save()} disabled={busy}>
            Save
          </button>
          {live ? (
            <button type="button" className="nm-btn nm-btn--navy" onClick={() => save(false)} disabled={busy}>
              End broadcast
            </button>
          ) : (
            <button type="button" className="nm-btn nm-btn--red" onClick={() => save(true)} disabled={busy || !url}>
              {busy && <Loader2 className="nm-spin" />} Go live
            </button>
          )}
        </div>
      )}
      {live && url && (tv ? <video className="nm-video" src={url} controls muted playsInline /> : <audio className="nm-audio" src={url} controls />)}
    </section>
  );
}

export function LiveTvPage() {
  return (
    <>
      <PageTitle title="Live TV" sub="Go live, manage the broadcast schedule, programs and presenters." />
      <LiveControls kind="tv" />
      <ItemList kind="tv_program" title="Broadcast schedule" sub="Programs shown on your Live TV tab." icon={Tv} />
      <ItemList kind="video" title="Replay library" sub="Upload recordings of past broadcasts as videos." icon={Video} />
    </>
  );
}

export function RadioPage() {
  return (
    <>
      <PageTitle title="Live Radio" sub="Station stream, current program, schedule and presenters." />
      <LiveControls kind="radio" />
      <ItemList kind="radio_program" title="Program schedule" sub="Programs shown on your Radio tab." icon={RadioIcon} />
      <ItemList kind="podcast" title="Audio archives" sub="Publish past shows as podcast episodes." icon={Headphones} />
    </>
  );
}

export function MediaLibraryPage() {
  const { outlet, notify } = useAdmin();
  const [uploads, setUploads] = useState<{ url: string; name: string; type: string }[]>([]);
  const [used, setUsed] = useState<{ url: string; label: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    Promise.all([newsApi.listArticles(outlet.id, { page: 1 }), newsApi.items(outlet.id, "video"), newsApi.items(outlet.id, "podcast")])
      .then(([a, v, p]) =>
        setUsed([
          ...a.items.filter((x) => x.imageUrl).map((x) => ({ url: x.imageUrl, label: x.headline })),
          ...[...v.items, ...p.items].filter((x) => x.thumbnailUrl).map((x) => ({ url: x.thumbnailUrl, label: x.title })),
        ]),
      )
      .catch(() => setUsed([]));
  }, [outlet.id]);
  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const url = await newsApi.uploadFile(file);
        setUploads((u) => [{ url, name: file.name, type: file.type }, ...u]);
      }
      notify("ok", "Uploaded. Copy the link to use it in an article.");
    } catch (err) {
      notify("error", newsError(err, "Upload failed."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <PageTitle
        title="Media Library"
        sub="Upload photos, video and audio to the Fockis storage and reuse them in articles."
        actions={
          <button type="button" className="nm-btn nm-btn--primary" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="nm-spin" /> : <Upload />} Upload files
          </button>
        }
      />
      <input ref={input} type="file" hidden multiple accept="image/*,video/*,audio/*" onChange={(ev) => add(ev.target.files)} />
      {uploads.length > 0 && (
        <section className="nm-section">
          <h2 className="nm-h2">Uploaded now</h2>
          <div className="nma-lib">
            {uploads.map((u) => (
              <figure key={u.url}>
                {u.type.startsWith("image/") ? <img src={u.url} alt="" /> : <span className="nma-lib__file">{u.name}</span>}
                <button type="button" className="nm-link" onClick={() => (navigator.clipboard?.writeText(u.url), notify("ok", "Link copied."))}>
                  <Copy /> Copy link
                </button>
              </figure>
            ))}
          </div>
        </section>
      )}
      <section className="nm-section">
        <h2 className="nm-h2">Used in your content</h2>
        {!used && <Skeleton h={120} />}
        {used && used.length === 0 && <Empty title="No media yet" />}
        <div className="nma-lib">
          {used?.map((u, i) => (
            <figure key={u.url + i}>
              <img src={u.url} alt="" loading="lazy" />
              <figcaption>{u.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
