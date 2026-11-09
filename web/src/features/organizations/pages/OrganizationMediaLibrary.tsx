/**
 * OrganizationMediaLibrary.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/media and /admin/media — Media & Documents.
 *
 *   Everyone     browse what they may see (the server decides: public items for
 *                visitors, plus members-only items for members), filter by
 *                type, category and search, open a viewer (video/audio player,
 *                photo, PDF preview, download).
 *   Managers     (owner, administrators, ManageMedia) add, edit, publish or
 *                unpublish, feature and delete media. Every item comes from
 *                either an uploaded file (drag & drop, with progress) or a
 *                web link (YouTube, Vimeo, Google Drive, any https address).
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Music,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";

import { getOrganization } from "../api/organizationsApi";
import { membersApi, type MyMembershipResponse } from "../api/membersApi";
import { getAuthToken } from "../api/organizationApi";
import { mediaUrl } from "../api/dashboardApi";
import {
  MEDIA_ACCEPT,
  MEDIA_MAX_BYTES,
  createMedia,
  deleteMedia,
  embedUrl,
  formatBytes,
  formatDuration,
  kindFromUrl,
  listMedia,
  updateMedia,
  uploadMediaFile,
  youtubeThumbnail,
  type MediaCategory,
  type MediaInput,
  type MediaItem,
  type MediaKind,
  type MediaVisibility,
} from "../api/mediaApi";
import type { Organization } from "../types/organization.types";
import OrgAppShell from "../ui/OrgAppShell";
import { categoryInfo, termsFor } from "../ui/orgTerminology";
import { Alert, EmptyState, Pagination, Skeleton, errorMessage, formatDate } from "../ui/orgUi";
import "../styles/OrganizationMediaLibrary.scss";

const PAGE_SIZE = 24;

const KINDS: { id: MediaKind; label: string; icon: typeof Film }[] = [
  { id: "video", label: "Videos", icon: Film },
  { id: "photo", label: "Photos", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music },
  { id: "document", label: "Documents", icon: FileText },
];
const KIND_SINGULAR: Record<MediaKind, string> = { video: "Video", photo: "Photo", audio: "Audio", document: "Document" };
const KIND_ICON: Record<MediaKind, typeof Film> = { video: Film, photo: ImageIcon, audio: Music, document: FileText };

function categoryOptions(type?: string | null): { id: MediaCategory; label: string }[] {
  const faith = categoryInfo(type).id === "faith";
  return [
    ...(faith ? [{ id: "sermon" as const, label: "Sermons" }, { id: "worship" as const, label: "Worship & music" }] : []),
    { id: "message", label: faith ? "Messages & teachings" : "Talks & messages" },
    { id: "presentation", label: "Presentations" },
    { id: "training", label: "Training" },
    { id: "event", label: "Events" },
    { id: "resource", label: "Resources" },
    { id: "announcement", label: "Announcements" },
    { id: "other", label: "Other" },
  ];
}

const VISIBILITY: { id: MediaVisibility; label: string; text: string; icon: typeof Globe }[] = [
  { id: "public", label: "Public", text: "Anyone, including visitors of your public page.", icon: Globe },
  { id: "members", label: "Members only", text: "Only active members who are signed in.", icon: UsersRound },
  { id: "private", label: "Admins only", text: "Only administrators. Good for drafts and internal files.", icon: Lock },
];

/** "1:05:30", "65:30", "90" (minutes) → seconds. */
function parseDuration(value: string): number | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (/^\d+$/.test(v)) return Number(v) * 60;
  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return undefined;
  const secs = parts.reduce((acc, n) => acc * 60 + n, 0);
  return secs > 0 ? Math.round(secs) : undefined;
}

function readMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolveDuration) => {
    if (!/^(video|audio)\//.test(file.type)) return resolveDuration(null);
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolveDuration(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolveDuration(null);
    };
    el.src = url;
  });
}

function kindFromFile(file: File): MediaKind {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function thumbFor(item: MediaItem): string | null {
  if (item.thumbnailUrl) return mediaUrl(item.thumbnailUrl);
  if (item.mediaType === "photo") return mediaUrl(item.fileUrl);
  return youtubeThumbnail(item.fileUrl);
}

/* ============================================================================
   EDITOR
   ========================================================================== */

type Source = "upload" | "link";

interface Draft {
  source: Source;
  file: File | null;
  link: string;
  title: string;
  mediaType: MediaKind;
  category: MediaCategory | "";
  description: string;
  speaker: string;
  duration: string;
  tags: string;
  thumbSource: Source;
  thumbFile: File | null;
  thumbLink: string;
  visibility: MediaVisibility;
  published: boolean;
  featured: boolean;
}

function draftFrom(item?: MediaItem | null): Draft {
  const isUpload = Boolean(item?.fileUrl.startsWith("/uploads/"));
  return {
    source: item ? (isUpload ? "upload" : "link") : "upload",
    file: null,
    link: item && !isUpload ? item.fileUrl : "",
    title: item?.title ?? "",
    mediaType: item?.mediaType ?? "video",
    category: item?.category ?? "",
    description: item?.description ?? "",
    speaker: item?.speaker ?? "",
    duration: item?.durationSeconds ? formatDuration(item.durationSeconds) : "",
    tags: item?.tags.join(", ") ?? "",
    thumbSource: item?.thumbnailUrl && !item.thumbnailUrl.startsWith("/uploads/") ? "link" : "upload",
    thumbFile: null,
    thumbLink: item?.thumbnailUrl && !item.thumbnailUrl.startsWith("/uploads/") ? item.thumbnailUrl : "",
    visibility: item?.visibility ?? "members",
    published: item ? item.published : true,
    featured: item?.featured ?? false,
  };
}

function MediaEditor({
  organizationId,
  orgType,
  item,
  onClose,
  onSaved,
}: {
  organizationId: string;
  orgType?: string | null;
  item: MediaItem | null;
  onClose: () => void;
  onSaved: (saved: MediaItem, created: boolean) => void;
}) {
  const [d, setD] = useState<Draft>(() => draftFrom(item));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const thumbInput = useRef<HTMLInputElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const cats = categoryOptions(orgType);

  const keepsExistingFile = Boolean(item && d.source === "upload" && !d.file && item.fileUrl.startsWith("/uploads/"));
  const keepsExistingThumb = Boolean(item?.thumbnailUrl?.startsWith("/uploads/") && d.thumbSource === "upload" && !d.thumbFile);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  useEffect(() => () => abort.current?.abort(), []);

  const filePreview = useMemo(() => (d.file && d.file.type.startsWith("image/") ? URL.createObjectURL(d.file) : null), [d.file]);
  const thumbPreview = useMemo(() => (d.thumbFile ? URL.createObjectURL(d.thumbFile) : null), [d.thumbFile]);
  useEffect(() => () => void (filePreview && URL.revokeObjectURL(filePreview)), [filePreview]);
  useEffect(() => () => void (thumbPreview && URL.revokeObjectURL(thumbPreview)), [thumbPreview]);

  async function chooseFile(file?: File | null) {
    if (!file) return;
    if (!MEDIA_ACCEPT.includes(file.type)) {
      setError("This file type isn't supported. Use a photo, video, audio file, PDF, Word, PowerPoint, Excel, TXT or CSV file — or paste a link.");
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. The limit is 500 MB — for longer videos, upload to YouTube or Vimeo and paste the link.`);
      return;
    }
    setError(null);
    const kind = kindFromFile(file);
    const duration = await readMediaDuration(file);
    setD((x) => ({
      ...x,
      file,
      mediaType: kind,
      title: x.title || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
      duration: duration ? formatDuration(duration) : x.duration,
    }));
  }

  function chooseThumb(file?: File | null) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return setError("The thumbnail must be a JPG, PNG, WebP or GIF image.");
    if (file.size > 10 * 1024 * 1024) return setError("The thumbnail must be 10 MB or smaller.");
    setError(null);
    set({ thumbFile: file });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void chooseFile(e.dataTransfer.files?.[0]);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!d.title.trim()) return setError("Give the media a title.");
    if (d.source === "upload" && !d.file && !keepsExistingFile) return setError("Choose a file to upload, or switch to “Use a link”.");
    if (d.source === "link") {
      try {
        const u = new URL(d.link.trim());
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      } catch {
        return setError("Paste a full web address that starts with https://");
      }
    }
    if (d.thumbSource === "link" && d.thumbLink.trim()) {
      try {
        new URL(d.thumbLink.trim());
      } catch {
        return setError("The thumbnail link must start with https://");
      }
    }
    if (d.duration.trim() && parseDuration(d.duration) === undefined) return setError("Write the duration like 45:00 or 1:05:00.");

    setSaving(true);
    abort.current = new AbortController();
    try {
      const input: Partial<MediaInput> = {
        title: d.title.trim(),
        mediaType: d.mediaType,
        description: d.description.trim(),
        speaker: d.speaker.trim(),
        durationSeconds: parseDuration(d.duration),
        tags: d.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        category: d.category || undefined,
        visibility: d.visibility,
        published: d.published,
        featured: d.featured,
      };

      if (d.source === "upload" && d.file) {
        setProgress({ label: `Uploading ${d.file.name}`, percent: 0 });
        const up = await uploadMediaFile(organizationId, d.file, (percent) => setProgress({ label: `Uploading ${d.file?.name}`, percent }), abort.current.signal);
        Object.assign(input, { fileUrl: up.fileUrl, fileName: up.fileName, mimeType: up.mimeType ?? undefined, fileSize: up.fileSize ?? undefined });
      } else if (d.source === "link") {
        Object.assign(input, { fileUrl: d.link.trim(), fileName: undefined, mimeType: undefined, fileSize: undefined });
      }

      if (d.thumbSource === "upload" && d.thumbFile) {
        setProgress({ label: "Uploading thumbnail", percent: 0 });
        const up = await uploadMediaFile(organizationId, d.thumbFile, (percent) => setProgress({ label: "Uploading thumbnail", percent }), abort.current.signal);
        input.thumbnailUrl = up.fileUrl;
      } else if (d.thumbSource === "link") {
        input.thumbnailUrl = d.thumbLink.trim();
      } else if (!keepsExistingThumb) {
        input.thumbnailUrl = "";
      }

      setProgress({ label: "Saving", percent: 100 });
      const saved = item ? await updateMedia(organizationId, item.id, input) : await createMedia(organizationId, input as MediaInput);
      onSaved(saved, !item);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") setError("Upload cancelled.");
      else setError(errorMessage(err, "The media could not be saved."));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const linkKind = d.source === "link" ? kindFromUrl(d.link) : null;
  const linkThumb = d.source === "link" ? youtubeThumbnail(d.link) : null;

  return (
    <div className="fom-modal" role="dialog" aria-modal="true" aria-labelledby="fom-editor-title" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="fom-modal__panel fom-editor" onSubmit={save} noValidate>
        <header className="fom-modal__head">
          <div>
            <h2 id="fom-editor-title">{item ? "Edit media" : "Add media"}</h2>
            <p>Upload a file from your device or link to one that's already online.</p>
          </div>
          <button type="button" className="fo-iconbtn" onClick={onClose} disabled={saving} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="fom-modal__body">
          {error && <Alert>{error}</Alert>}

          {/* ---------------------------------------------------- source */}
          <section className="fom-block">
            <h3>File</h3>
            <div className="fom-seg" role="radiogroup" aria-label="Where is the file?">
              <button type="button" role="radio" aria-checked={d.source === "upload"} className={d.source === "upload" ? "is-on" : ""} onClick={() => set({ source: "upload" })}>
                <UploadCloud aria-hidden="true" /> Upload a file
              </button>
              <button type="button" role="radio" aria-checked={d.source === "link"} className={d.source === "link" ? "is-on" : ""} onClick={() => set({ source: "link" })}>
                <Link2 aria-hidden="true" /> Use a link
              </button>
            </div>

            {d.source === "upload" ? (
              <div
                className={"fom-drop" + (dragging ? " is-drag" : "") + (d.file || keepsExistingFile ? " has-file" : "")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInput.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              >
                <input ref={fileInput} type="file" hidden accept={MEDIA_ACCEPT.join(",")} onChange={(e) => void chooseFile(e.target.files?.[0])} />
                {d.file ? (
                  <div className="fom-drop__file">
                    {filePreview ? <img src={filePreview} alt="" /> : (() => {
                      const Icon = KIND_ICON[kindFromFile(d.file)];
                      return <Icon aria-hidden="true" />;
                    })()}
                    <span>
                      <strong>{d.file.name}</strong>
                      <small>
                        {formatBytes(d.file.size)} · {KIND_SINGULAR[kindFromFile(d.file)]} · click to choose another file
                      </small>
                    </span>
                  </div>
                ) : keepsExistingFile && item ? (
                  <div className="fom-drop__file">
                    <FileText aria-hidden="true" />
                    <span>
                      <strong>{item.fileName ?? "Current file"}</strong>
                      <small>{formatBytes(item.fileSize)} · click to replace it</small>
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="fom-drop__icon" aria-hidden="true" />
                    <strong>Drag a file here, or click to choose</strong>
                    <small>Photos, videos, audio, PDF, Word, PowerPoint, Excel · up to 500 MB</small>
                  </>
                )}
              </div>
            ) : (
              <label className="fo-field">
                <span className="fo-sr">Link</span>
                <input
                  className="fo-input"
                  type="url"
                  inputMode="url"
                  value={d.link}
                  onChange={(e) => {
                    const link = e.target.value;
                    const k = kindFromUrl(link);
                    set({ link, ...(k ? { mediaType: k } : {}) });
                  }}
                  placeholder="https://youtube.com/watch?v=…  ·  https://drive.google.com/…"
                />
                <small>
                  YouTube, Vimeo, SoundCloud, Google Drive, Dropbox or any web address.
                  {linkKind ? ` Detected: ${KIND_SINGULAR[linkKind]}.` : ""}
                </small>
                {linkThumb && <img className="fom-linkthumb" src={linkThumb} alt="" />}
              </label>
            )}
          </section>

          {/* --------------------------------------------------- details */}
          <section className="fom-block">
            <h3>Details</h3>
            <div className="fo-grid-2">
              <label className="fo-field">
                <span>
                  Title <span className="fo-field__req">*</span>
                </span>
                <input className="fo-input" value={d.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} placeholder="Sunday message — Hope that lasts" />
              </label>
              <label className="fo-field">
                <span>Type</span>
                <select className="fo-select" value={d.mediaType} onChange={(e) => set({ mediaType: e.target.value as MediaKind })}>
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {KIND_SINGULAR[k.id]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="fo-grid-2">
              <label className="fo-field">
                <span>Category</span>
                <select className="fo-select" value={d.category} onChange={(e) => set({ category: e.target.value as MediaCategory })}>
                  <option value="">No category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fo-field">
                <span>Presenter / speaker</span>
                <input className="fo-input" value={d.speaker} onChange={(e) => set({ speaker: e.target.value })} maxLength={150} />
              </label>
            </div>
            <label className="fo-field">
              <span>Description</span>
              <textarea className="fo-textarea" value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={5000} rows={3} />
            </label>
            <div className="fo-grid-2">
              {(d.mediaType === "video" || d.mediaType === "audio") && (
                <label className="fo-field">
                  <span>Duration</span>
                  <input className="fo-input" value={d.duration} onChange={(e) => set({ duration: e.target.value })} placeholder="45:00" />
                  <small>Filled in automatically for uploaded files.</small>
                </label>
              )}
              <label className="fo-field">
                <span>Tags</span>
                <input className="fo-input" value={d.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="youth, worship, conference" />
                <small>Separate tags with commas.</small>
              </label>
            </div>
          </section>

          {/* ------------------------------------------------- thumbnail */}
          {d.mediaType !== "photo" && (
            <section className="fom-block">
              <h3>Thumbnail (optional)</h3>
              <div className="fom-thumbrow">
                <span className="fom-thumbrow__preview">
                  {thumbPreview ? (
                    <img src={thumbPreview} alt="" />
                  ) : d.thumbSource === "link" && d.thumbLink ? (
                    <img src={d.thumbLink} alt="" />
                  ) : keepsExistingThumb && item?.thumbnailUrl ? (
                    <img src={mediaUrl(item.thumbnailUrl) ?? ""} alt="" />
                  ) : linkThumb ? (
                    <img src={linkThumb} alt="" />
                  ) : (
                    <ImageIcon aria-hidden="true" />
                  )}
                </span>
                <div className="fom-thumbrow__controls">
                  <div className="fom-seg fom-seg--sm" role="radiogroup" aria-label="Thumbnail source">
                    <button type="button" role="radio" aria-checked={d.thumbSource === "upload"} className={d.thumbSource === "upload" ? "is-on" : ""} onClick={() => set({ thumbSource: "upload" })}>
                      Upload
                    </button>
                    <button type="button" role="radio" aria-checked={d.thumbSource === "link"} className={d.thumbSource === "link" ? "is-on" : ""} onClick={() => set({ thumbSource: "link" })}>
                      Link
                    </button>
                  </div>
                  {d.thumbSource === "upload" ? (
                    <div className="fom-row">
                      <input ref={thumbInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => chooseThumb(e.target.files?.[0])} />
                      <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={() => thumbInput.current?.click()}>
                        <UploadCloud aria-hidden="true" /> {d.thumbFile || keepsExistingThumb ? "Change image" : "Choose image"}
                      </button>
                      {d.thumbFile && (
                        <button type="button" className="fo-btn fo-btn--ghost fo-btn--sm" onClick={() => set({ thumbFile: null })}>
                          Remove
                        </button>
                      )}
                    </div>
                  ) : (
                    <input className="fo-input" type="url" value={d.thumbLink} onChange={(e) => set({ thumbLink: e.target.value })} placeholder="https://…/thumbnail.jpg" />
                  )}
                  <small className="fo-muted">{linkThumb ? "YouTube links get their thumbnail automatically." : "Shown on the media card."}</small>
                </div>
              </div>
            </section>
          )}

          {/* ------------------------------------------------ visibility */}
          <section className="fom-block">
            <h3>Who can see it</h3>
            <div className="fom-vis" role="radiogroup" aria-label="Visibility">
              {VISIBILITY.map((v) => (
                <label key={v.id} className={"fom-vis__opt" + (d.visibility === v.id ? " is-on" : "")}>
                  <input type="radio" name="visibility" checked={d.visibility === v.id} onChange={() => set({ visibility: v.id })} />
                  <v.icon aria-hidden="true" />
                  <span>
                    <strong>{v.label}</strong>
                    <small>{v.text}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="fom-switches">
              <label className="fom-switch">
                <input type="checkbox" checked={d.published} onChange={(e) => set({ published: e.target.checked })} />
                <span>
                  <strong>Publish now</strong>
                  <small>Turn off to save as a draft that only administrators see.</small>
                </span>
              </label>
              <label className="fom-switch">
                <input type="checkbox" checked={d.featured} onChange={(e) => set({ featured: e.target.checked })} />
                <span>
                  <strong>Feature it</strong>
                  <small>Show it first in the library.</small>
                </span>
              </label>
            </div>
          </section>
        </div>

        <footer className="fom-modal__foot">
          {progress ? (
            <div className="fom-progress" role="status" aria-live="polite">
              <span>
                {progress.label} — {progress.percent}%
              </span>
              <span className="fom-progress__bar">
                <span style={{ width: `${progress.percent}%` }} />
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="fom-row">
            <button type="button" className="fo-btn fo-btn--secondary" onClick={() => (saving ? abort.current?.abort() : onClose())}>
              {saving ? "Cancel upload" : "Cancel"}
            </button>
            <button type="submit" className="fo-btn fo-btn--primary" disabled={saving}>
              {saving ? <Loader2 className="fo-spin" aria-hidden="true" /> : null}
              {item ? "Save changes" : "Add media"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

/* ============================================================================
   VIEWER
   ========================================================================== */

function MediaViewer({
  item,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  item: MediaItem;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = mediaUrl(item.fileUrl) ?? item.fileUrl;
  const embed = embedUrl(item.fileUrl);
  const uploaded = item.fileUrl.startsWith("/uploads/");
  const isPdf = item.mimeType === "application/pdf" || /\.pdf(\?|$)/i.test(item.fileUrl);

  let player: React.ReactNode;
  if (embed) {
    player = <iframe src={embed} title={item.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
  } else if (item.mediaType === "video") {
    player = <video src={src} controls playsInline poster={thumbFor(item) ?? undefined} />;
  } else if (item.mediaType === "audio") {
    player = (
      <div className="fom-viewer__audio">
        <Music aria-hidden="true" />
        <audio src={src} controls />
      </div>
    );
  } else if (item.mediaType === "photo") {
    player = <img src={src} alt={item.title} />;
  } else if (isPdf && uploaded) {
    player = <iframe src={src} title={item.title} />;
  } else {
    player = (
      <div className="fom-viewer__doc">
        <FileText aria-hidden="true" />
        <strong>{item.fileName ?? item.title}</strong>
        <span>{formatBytes(item.fileSize)}</span>
      </div>
    );
  }

  return (
    <div className="fom-modal" role="dialog" aria-modal="true" aria-labelledby="fom-viewer-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fom-modal__panel fom-viewer">
        <div className="fom-viewer__stage">{player}</div>
        <div className="fom-viewer__info">
          <div className="fom-viewer__top">
            <div>
              <h2 id="fom-viewer-title">{item.title}</h2>
              <p className="fo-muted">
                {[KIND_SINGULAR[item.mediaType], item.speaker, formatDate(item.publishedAt ?? item.createdAt), formatDuration(item.durationSeconds)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button type="button" className="fo-iconbtn" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </div>
          {item.description && <p className="fom-viewer__desc">{item.description}</p>}
          {item.tags.length > 0 && (
            <div className="fom-tags">
              {item.tags.map((t) => (
                <span key={t} className="fo-badge fo-badge--muted">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="fom-row">
            <a className="fo-btn fo-btn--secondary fo-btn--sm" href={src} target="_blank" rel="noreferrer" download={uploaded ? (item.fileName ?? true) : undefined}>
              {uploaded ? <Download aria-hidden="true" /> : <ExternalLink aria-hidden="true" />} {uploaded ? "Download" : "Open link"}
            </a>
            {canManage && (
              <>
                <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={onEdit}>
                  <Pencil aria-hidden="true" /> Edit
                </button>
                <button type="button" className="fo-btn fo-btn--danger fo-btn--sm" onClick={onDelete}>
                  <Trash2 aria-hidden="true" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PAGE
   ========================================================================== */

export default function OrganizationMediaLibrary(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const signedIn = Boolean(getAuthToken());

  const [org, setOrg] = useState<Organization | null>(null);
  const [me, setMe] = useState<MyMembershipResponse | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [kind, setKind] = useState<MediaKind | "">("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  const [editing, setEditing] = useState<MediaItem | null | "new">(null);
  const [viewing, setViewing] = useState<MediaItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getOrganization(organizationId, controller.signal)
      .then((o) => !controller.signal.aborted && setOrg(o))
      .catch(() => undefined);
    if (signedIn) {
      membersApi
        .getMyMembership(organizationId, controller.signal)
        .then((m) => !controller.signal.aborted && setMe(m ?? null))
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [organizationId, signedIn]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listMedia(organizationId, { page, pageSize: PAGE_SIZE, search, mediaType: kind, category, status }, controller.signal)
      .then((r) => {
        if (controller.signal.aborted) return;
        setItems(Array.isArray(r?.items) ? r.items : []);
        setTotal(Number(r?.total) || 0);
        setCanManage(Boolean(r?.canManage));
      })
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Media could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [organizationId, page, search, kind, category, status, tick]);

  const onSaved = useCallback((saved: MediaItem, created: boolean) => {
    setEditing(null);
    setViewing(null);
    setNotice(created ? `“${saved.title}” was added.` : `“${saved.title}” was saved.`);
    setTick((x) => x + 1);
  }, []);

  async function remove(item: MediaItem) {
    if (!window.confirm(`Delete “${item.title}”? Uploaded files are deleted too.`)) return;
    try {
      await deleteMedia(organizationId, item.id);
      setViewing(null);
      setNotice(`“${item.title}” was deleted.`);
      setTick((x) => x + 1);
    } catch (err) {
      setError(errorMessage(err, "The media could not be deleted."));
    }
  }

  const t = termsFor(org?.organizationType);
  const cats = categoryOptions(org?.organizationType);
  const catLabel = new Map(cats.map((c) => [c.id, c.label]));
  const shellOrg = org ? { id: org.id, name: org.name, organizationType: org.organizationType, logoUrl: org.logoUrl } : { id: organizationId, name: "" };
  const isAdmin = Boolean(me?.isOwner || me?.isAdmin);
  const viewer = me ? { name: me.profile?.displayName, avatarUrl: me.profile?.avatarUrl, memberId: me.id, isAdmin } : undefined;
  const filtered = Boolean(kind || category || status || search);

  return (
    <OrgAppShell variant={canManage ? "admin" : "member"} organization={shellOrg} viewer={viewer}>
      <div className="fo-pagehead">
        <div>
          <h1>Media &amp; Documents</h1>
          <p>Videos, photos, audio and documents{org ? ` from ${org.name}` : ""}.</p>
        </div>
        {canManage && (
          <div className="fo-pagehead__actions">
            <button type="button" className="fo-btn fo-btn--primary" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" /> Add Media
            </button>
          </div>
        )}
      </div>

      {notice && <Alert tone="ok">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div className="fom-filters">
        <div className="fom-kinds" role="tablist" aria-label="Type">
          <button type="button" role="tab" aria-selected={!kind} className={!kind ? "is-on" : ""} onClick={() => (setKind(""), setPage(1))}>
            All
          </button>
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={kind === k.id ? "is-on" : ""} onClick={() => (setKind(k.id), setPage(1))}>
              <k.icon aria-hidden="true" /> {k.label}
            </button>
          ))}
        </div>
        <div className="fo-toolbar">
          <label className="fo-search">
            <span className="fo-sr">Search media</span>
            <Search aria-hidden="true" />
            <input className="fo-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, speakers, tags…" />
          </label>
          <select className="fo-select" value={category} onChange={(e) => (setCategory(e.target.value), setPage(1))} aria-label="Category">
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {canManage && (
            <select className="fo-select" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))} aria-label="Status">
              <option value="">Published &amp; drafts</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          )}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="fom-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={250} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="fo-card">
          <EmptyState
            icon={UploadCloud}
            title={filtered ? "Nothing matches these filters" : canManage ? "Add your first media" : "No media yet"}
            text={
              filtered
                ? "Try another type, category or search."
                : canManage
                  ? `Upload videos, photos, audio and documents, or link to YouTube and other sites. Choose whether ${t.people.toLowerCase()}, visitors or only admins can see each one.`
                  : signedIn
                    ? "Media shared with you will appear here."
                    : "Sign in to see media shared with members."
            }
          >
            {canManage && !filtered && (
              <button type="button" className="fo-btn fo-btn--primary" onClick={() => setEditing("new")}>
                <Plus aria-hidden="true" /> Add Media
              </button>
            )}
            {!signedIn && (
              <Link to={"/login?returnTo=" + encodeURIComponent(`/organizations/${organizationId}/media`)} className="fo-btn fo-btn--secondary">
                Sign in
              </Link>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="fom-grid" aria-busy={loading}>
            {items.map((m) => {
              const thumb = thumbFor(m);
              const Icon = KIND_ICON[m.mediaType] ?? FileText;
              return (
                <article key={m.id} className="fom-card">
                  <button type="button" className="fom-card__thumb" onClick={() => setViewing(m)} aria-label={`Open ${m.title}`}>
                    {thumb ? <img src={thumb} alt="" loading="lazy" /> : <Icon aria-hidden="true" className="fom-card__icon" />}
                    <span className="fom-card__type">
                      <Icon aria-hidden="true" /> {KIND_SINGULAR[m.mediaType]}
                    </span>
                    {m.durationSeconds ? <span className="fom-card__dur">{formatDuration(m.durationSeconds)}</span> : null}
                    {m.featured && (
                      <span className="fom-card__star" title="Featured">
                        <Star aria-hidden="true" />
                      </span>
                    )}
                    <span className="fom-card__play" aria-hidden="true">
                      <Eye />
                    </span>
                  </button>
                  <div className="fom-card__body">
                    <strong>{m.title}</strong>
                    <small>
                      {[m.category ? catLabel.get(m.category) : null, m.speaker, formatDate(m.publishedAt ?? m.createdAt)].filter(Boolean).join(" · ")}
                    </small>
                    {canManage && (
                      <div className="fom-card__meta">
                        {!m.published && <span className="fo-badge fo-badge--warn">Draft</span>}
                        <span className={"fo-badge" + (m.visibility === "public" ? " fo-badge--ok" : m.visibility === "private" ? " fo-badge--muted" : "")}>
                          {m.visibility === "public" ? "Public" : m.visibility === "members" ? "Members" : "Admins only"}
                        </span>
                        <span className="fom-card__actions">
                          <button type="button" className="fo-iconbtn" aria-label={`Edit ${m.title}`} onClick={() => setEditing(m)}>
                            <Pencil aria-hidden="true" />
                          </button>
                          <button type="button" className="fo-iconbtn" aria-label={`Delete ${m.title}`} onClick={() => void remove(m)}>
                            <Trash2 aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="fo-card fo-card--flush fom-pager">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} noun="items" />
          </div>
        </>
      )}

      {editing && (
        <MediaEditor organizationId={organizationId} orgType={org?.organizationType} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
      {viewing && !editing && (
        <MediaViewer item={viewing} canManage={canManage} onClose={() => setViewing(null)} onEdit={() => setEditing(viewing)} onDelete={() => void remove(viewing)} />
      )}
    </OrgAppShell>
  );
}
