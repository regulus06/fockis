import { useMemo, useRef, useState } from "react";
import type { MediaAsset, MediaKind } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp } from "../hooks/useMailchimp";
import { contentApi } from "../services/contentApi";
import { Button, IconButton } from "./ui/Button";
import { FilterSelect, SearchInput, TextField } from "./ui/Field";
import { EmptyState, ErrorState, SkeletonCards } from "./ui/Feedback";
import { ActionMenu } from "./ui/Menu";
import { Modal } from "./ui/Overlay";
import { Tabs } from "./ui/Tabs";
import { Toolbar } from "./ui/Layout";
import { Icon, type IconName } from "./ui/Icon";
import { cx, formatDate } from "../utils/format";

const KIND_ICONS: Record<MediaKind, IconName> = { image: "image", video: "video", logo: "star", document: "doc" };
const MAX_MB = 25;

function size(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function Thumb({ a }: { a: MediaAsset }) {
  if (a.url.startsWith("blob:") && (a.kind === "image" || a.kind === "logo")) {
    return <img src={a.url} alt="" className="fm-media__img" />;
  }
  return (
    <span className="fm-media__ph" style={{ background: a.swatch }}>
      <Icon name={KIND_ICONS[a.kind]} size={26} />
    </span>
  );
}

export function MediaLibrary() {
  const media = useAsync(() => contentApi.media(), []);
  const run = useAction();
  const { confirm, toast } = useMailchimp();
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [renaming, setRenaming] = useState<MediaAsset | null>(null);
  const [newName, setNewName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const data = media.data ?? [];
  const folders = useMemo(() => Array.from(new Set(data.map((m) => m.folder))).sort(), [data]);
  const list = data.filter((m) => (kind === "all" || m.kind === kind) && (folder === "all" || m.folder === folder) && m.name.toLowerCase().includes(search.toLowerCase()));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const valid = Array.from(files).filter((f) => f.size <= MAX_MB * 1024 * 1024);
    if (valid.length < files.length) toast(`Skipped ${files.length - valid.length} file(s) over ${MAX_MB} MB.`, "error");
    setUploading(valid.length);
    for (const f of valid) {
      await run(() => contentApi.upload(f, folder === "all" ? "Uploads" : folder));
      setUploading((n) => n - 1);
    }
    if (valid.length) toast(`Uploaded ${valid.length} file${valid.length === 1 ? "" : "s"}.`, "success");
    media.reload();
  };

  const copyUrl = async (a: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(a.url);
      toast("URL copied.", "success");
    } catch {
      toast("Couldn't copy. Open the preview to select the URL.", "error");
    }
  };

  const remove = async (a: MediaAsset) => {
    if (!(await confirm({ title: `Delete “${a.name}”?`, body: "Emails and pages that already use it may show a broken image.", confirmLabel: "Delete file", danger: true }))) return;
    if ((await run(() => contentApi.deleteMedia(a.id), "File deleted.")) !== undefined) {
      setPreview(null);
      media.reload();
    }
  };

  const itemActions = (a: MediaAsset) => [
    { label: "Preview", icon: "eye" as IconName, onSelect: () => setPreview(a) },
    { label: "Copy URL", icon: "link" as IconName, onSelect: () => copyUrl(a) },
    { label: "Rename", icon: "edit" as IconName, onSelect: () => { setNewName(a.name); setRenaming(a); } },
    { label: "Delete", icon: "trash" as IconName, danger: true, separated: true, onSelect: () => remove(a) },
  ];

  return (
    <div
      className={cx("fm-medialib", dragging && "is-dragging")}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
    >
      <aside className="fm-medialib__folders" aria-label="Folders">
        <button type="button" className={cx(folder === "all" && "is-active")} onClick={() => setFolder("all")}><Icon name="folder" size={15} /> All files <span>{data.length}</span></button>
        {folders.map((f) => (
          <button key={f} type="button" className={cx(folder === f && "is-active")} onClick={() => setFolder(f)}>
            <Icon name="folder" size={15} /> {f} <span>{data.filter((m) => m.folder === f).length}</span>
          </button>
        ))}
      </aside>

      <div className="fm-stack">
        <div className="fm-row fm-row--between fm-row--wrap">
          <Tabs<"all" | MediaKind> label="File type" value={kind} onChange={setKind} variant="pill" items={[{ id: "all", label: "All" }, { id: "image", label: "Images" }, { id: "video", label: "Videos" }, { id: "logo", label: "Logos" }, { id: "document", label: "Documents" }]} />
          <div className="fm-row fm-row--tight">
            <input ref={input} type="file" multiple hidden accept="image/*,video/*,application/pdf" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <Button variant="primary" icon="upload" loading={uploading > 0} onClick={() => input.current?.click()}>{uploading > 0 ? `Uploading ${uploading}…` : "Upload"}</Button>
          </div>
        </div>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search files" />
          <FilterSelect label="Folder" value={folder} onChange={setFolder} options={[{ value: "all", label: "All folders" }, ...folders.map((f) => ({ value: f, label: f }))]} />
          <span className="fm-toolbar__spacer" />
          <div className="fm-viewtoggle" role="group" aria-label="View">
            <IconButton icon="grid" label="Grid view" active={view === "grid"} onClick={() => setView("grid")} />
            <IconButton icon="layout" label="List view" active={view === "list"} onClick={() => setView("list")} />
          </div>
        </Toolbar>

        {media.error ? <ErrorState message={media.error} onRetry={media.reload} /> : media.loading ? <SkeletonCards count={8} height={170} /> : list.length === 0 ? (
          <EmptyState icon="image" title={search || kind !== "all" ? "No files match" : "Your library is empty"} body="Drop files anywhere on this page, or use Upload. Images, video, and PDFs up to 25 MB." action={<Button icon="upload" onClick={() => input.current?.click()}>Upload files</Button>} />
        ) : view === "grid" ? (
          <ul className="fm-mediagrid">
            {list.map((a) => (
              <li key={a.id} className="fm-media">
                <button type="button" className="fm-media__thumb" onClick={() => setPreview(a)} aria-label={`Preview ${a.name}`}><Thumb a={a} /></button>
                <div className="fm-media__meta">
                  <div>
                    <strong title={a.name}>{a.name}</strong>
                    <small>{a.width ? `${a.width}×${a.height} · ` : ""}{size(a.sizeKb)}</small>
                  </div>
                  <ActionMenu items={itemActions(a)} label={`Actions for ${a.name}`} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="fm-tablewrap fm-panel is-flush">
            <table className="fm-table">
              <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Folder</th><th scope="col">Size</th><th scope="col">Uploaded</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
              <tbody>{list.map((a) => (
                <tr key={a.id}>
                  <td className="fm-table__primary"><button type="button" className="fm-linkbtn" onClick={() => setPreview(a)}>{a.name}</button></td>
                  <td>{a.kind[0].toUpperCase() + a.kind.slice(1)}</td><td>{a.folder}</td><td>{size(a.sizeKb)}</td><td>{formatDate(a.uploadedAt)}</td>
                  <td className="is-actions"><ActionMenu items={itemActions(a)} label={`Actions for ${a.name}`} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {dragging && <div className="fm-medialib__drop" aria-hidden><Icon name="upload" size={28} /><p>Drop to upload</p></div>}

      <Modal open={Boolean(preview)} title={preview?.name ?? ""} onClose={() => setPreview(null)} size="lg"
        footer={preview && <><Button variant="danger" icon="trash" onClick={() => remove(preview)}>Delete</Button><Button icon="link" onClick={() => copyUrl(preview)}>Copy URL</Button></>}
      >
        {preview && (
          <div className="fm-mediapreview">
            <div className="fm-mediapreview__art"><Thumb a={preview} /></div>
            <dl className="fm-deflist">
              <div><dt>Type</dt><dd>{preview.kind}</dd></div>
              <div><dt>Folder</dt><dd>{preview.folder}</dd></div>
              <div><dt>Size</dt><dd>{size(preview.sizeKb)}</dd></div>
              {preview.width && <div><dt>Dimensions</dt><dd>{preview.width}×{preview.height}</dd></div>}
              <div><dt>Uploaded</dt><dd>{formatDate(preview.uploadedAt)}</dd></div>
              <div><dt>URL</dt><dd><code className="fm-break">{preview.url}</code></dd></div>
            </dl>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(renaming)} title="Rename file" size="sm" onClose={() => setRenaming(null)}
        footer={<><Button onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" disabled={!newName.trim()} onClick={async () => {
          if (renaming && (await run(() => contentApi.renameMedia(renaming.id, newName.trim()), "File renamed."))) { setRenaming(null); media.reload(); }
        }}>Rename</Button></>}
      >
        <TextField label="File name" value={newName} onChange={(e) => setNewName(e.target.value)} data-autofocus />
      </Modal>
    </div>
  );
}
