import React, { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { Icon } from "../../renderer/icons";
import { websiteStudioApi, apiError } from "../../services/websiteStudioApi";
import type { WebsiteAsset } from "../../types/studio";

const MAX_BYTES = 25 * 1024 * 1024;

async function cropToFile(src: string, area: { x: number; y: number; width: number; height: number }, maxWidth: number, name: string): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not load the image for cropping."));
    i.src = src;
  });
  const scale = Math.min(1, maxWidth / area.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    } catch {
      resolve(null);
    }
  });
  if (!blob) throw new Error("This image is hosted on a server that does not allow editing. Upload it to your library first, then crop.");
  return new File([blob], name.replace(/\.\w+$/, "") + "-cropped.jpg", { type: "image/jpeg" });
}

function CropDialog({ asset, websiteId, onDone, onClose }: { asset: WebsiteAsset; websiteId: string; onDone: (a: WebsiteAsset) => void; onClose: () => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);
  const [area, setArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [width, setWidth] = useState(1600);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!area) return;
    setBusy(true);
    setError(null);
    try {
      const file = await cropToFile(asset.url, area, width, asset.filename || "image");
      onDone(await websiteStudioApi.uploadAsset(websiteId, file, asset.folder));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wse-modal" onClick={onClose}>
      <div className="wse-modal__panel wse-crop" onClick={(e) => e.stopPropagation()}>
        <h3>Crop & resize</h3>
        <div className="wse-crop__stage">
          <Cropper image={asset.url} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
        </div>
        <div className="wse-crop__controls">
          <label>Zoom <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
          <div className="wse-seg">
            {[["Free", undefined], ["16:9", 16 / 9], ["4:3", 4 / 3], ["1:1", 1], ["3:4", 3 / 4]].map(([l, v]) => (
              <button type="button" key={String(l)} className={aspect === v ? "is-active" : ""} onClick={() => setAspect(v as number | undefined)}>{String(l)}</button>
            ))}
          </div>
          <label>Max width
            <select className="wse-input" value={width} onChange={(e) => setWidth(Number(e.target.value))}>
              {[800, 1200, 1600, 2400].map((w) => <option key={w} value={w}>{w}px</option>)}
            </select>
          </label>
        </div>
        {error ? <p className="wse-error">{error}</p> : null}
        <div className="wse-modal__actions">
          <button type="button" className="wse-btn wse-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="wse-btn wse-btn--primary" disabled={!area || busy} onClick={save}>{busy ? "Saving…" : "Save as new image"}</button>
        </div>
      </div>
    </div>
  );
}

/** Website media library: upload, folders, search, alt text, crop/resize, delete and select. */
export function MediaLibrary({ websiteId, onPick, compact }: { websiteId: string | null; onPick?: (url: string, asset?: WebsiteAsset) => void; compact?: boolean }) {
  const [assets, setAssets] = useState<WebsiteAsset[]>([]);
  const [folder, setFolder] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState<WebsiteAsset | null>(null);
  const [selected, setSelected] = useState<WebsiteAsset | null>(null);

  const load = useCallback(async () => {
    if (!websiteId) return;
    try {
      setAssets(await websiteStudioApi.assets(websiteId));
    } catch (e) {
      setError(apiError(e));
    }
  }, [websiteId]);
  useEffect(() => void load(), [load]);

  const folders = useMemo(() => [...new Set(assets.map((a) => a.folder).filter(Boolean))].sort(), [assets]);
  const visible = assets.filter((a) => (!folder || a.folder === folder) && (!q || `${a.filename} ${a.alt}`.toLowerCase().includes(q.toLowerCase())));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        if (!/^(image|video)\//.test(f.type)) throw new Error(`${f.name}: only images and videos are supported.`);
        if (f.size > MAX_BYTES) throw new Error(`${f.name} is larger than 25 MB.`);
        if (websiteId) {
          const a = await websiteStudioApi.uploadAsset(websiteId, f, newFolder || folder);
          setAssets((prev) => [a, ...prev]);
        } else {
          const url = await websiteStudioApi.uploadFile(f);
          onPick?.(url);
        }
      }
    } catch (e) {
      setError(apiError(e, "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const update = async (a: WebsiteAsset, patch: Partial<WebsiteAsset>) => {
    if (!websiteId) return;
    const next = await websiteStudioApi.updateAsset(websiteId, a.id, patch);
    setAssets((prev) => prev.map((x) => (x.id === a.id ? next : x)));
    setSelected(next);
  };

  const remove = async (a: WebsiteAsset) => {
    if (!websiteId || !window.confirm(`Delete ${a.filename}? Pages already using it keep their copy of the link.`)) return;
    await websiteStudioApi.deleteAsset(websiteId, a.id);
    setAssets((prev) => prev.filter((x) => x.id !== a.id));
    setSelected(null);
  };

  return (
    <div className={`wse-media${compact ? " is-compact" : ""}`}>
      <div className="wse-media__bar">
        <label className="wse-btn wse-btn--primary wse-btn--sm">
          <Icon name="Plus" size={14} /> {busy ? "Uploading…" : "Upload"}
          <input type="file" accept="image/*,video/mp4,video/webm" multiple hidden onChange={(e) => upload(e.target.files)} disabled={busy} />
        </label>
        {websiteId ? (
          <>
            <input className="wse-input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="wse-input" value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">All folders</option>
              {folders.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <input className="wse-input" placeholder="New folder for uploads" value={newFolder} onChange={(e) => setNewFolder(e.target.value.replace(/[^\w\- ]/g, ""))} />
          </>
        ) : <span className="wse-muted">Template mode: uploads go straight into the field.</span>}
      </div>
      {error ? <p className="wse-error">{error}</p> : null}
      <div className="wse-media__grid">
        {visible.map((a) => (
          <div key={a.id} className={`wse-media__item${selected?.id === a.id ? " is-selected" : ""}`} onClick={() => setSelected(a)}>
            {a.fileType.startsWith("video") ? <video src={a.url} muted /> : <img src={a.url} alt={a.alt} loading="lazy" />}
            <span>{a.filename}</span>
          </div>
        ))}
        {websiteId && !visible.length ? <p className="wse-muted">No files yet. Upload images, logos or videos.</p> : null}
      </div>
      {selected ? (
        <div className="wse-media__detail">
          <input className="wse-input" value={selected.filename} onChange={(e) => setSelected({ ...selected, filename: e.target.value })} onBlur={() => update(selected, { filename: selected.filename })} aria-label="File name" />
          <input className="wse-input" placeholder="Alt text (describe the image)" value={selected.alt} onChange={(e) => setSelected({ ...selected, alt: e.target.value })} onBlur={() => update(selected, { alt: selected.alt })} />
          <input className="wse-input" placeholder="Folder" value={selected.folder} onChange={(e) => setSelected({ ...selected, folder: e.target.value })} onBlur={() => update(selected, { folder: selected.folder })} />
          <div className="wse-media__detail-actions">
            {onPick ? <button type="button" className="wse-btn wse-btn--primary wse-btn--sm" onClick={() => onPick(selected.url, selected)}>Use this</button> : null}
            {!selected.fileType.startsWith("video") ? <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => setCropping(selected)}><Icon name="Frame" size={14} /> Crop / resize</button> : null}
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => navigator.clipboard?.writeText(selected.url)}>Copy link</button>
            <button type="button" className="wse-btn wse-btn--danger wse-btn--sm" onClick={() => remove(selected)}><Icon name="Trash2" size={14} /> Delete</button>
          </div>
        </div>
      ) : null}
      {cropping && websiteId ? (
        <CropDialog asset={cropping} websiteId={websiteId} onClose={() => setCropping(null)} onDone={(a) => (setAssets((p) => [a, ...p]), setSelected(a), setCropping(null))} />
      ) : null}
    </div>
  );
}

export function MediaPickerButton({ websiteId, onPick, label }: { websiteId: string | null; onPick: (url: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => setOpen(true)}>
        <Icon name="Camera" size={14} /> {label}
      </button>
      {open ? (
        <div className="wse-modal" onClick={() => setOpen(false)}>
          <div className="wse-modal__panel wse-modal__panel--wide" onClick={(e) => e.stopPropagation()}>
            <div className="wse-modal__head">
              <h3>Media Library</h3>
              <button type="button" className="wse-icon-btn" onClick={() => setOpen(false)}><Icon name="X" size={18} /></button>
            </div>
            <MediaLibrary websiteId={websiteId} onPick={(url) => (onPick(url), setOpen(false))} />
          </div>
        </div>
      ) : null}
    </>
  );
}
