/**
 * RichTextEditor.tsx — event description editor (organization events).
 * -----------------------------------------------------------------------------
 * Paragraphs, bold, italic, underline, bulleted / numbered lists, alignment,
 * links, images (by URL) and videos (inserted as a link, never embedded).
 * The value is HTML reduced to the shared allow-list (utils/richText) on
 * every change; the API sanitizes again before saving.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, Bold, Image as ImageIcon, Italic, Link2, List, ListOrdered, Underline, Video, X } from "lucide-react";

import { isRichText, isSafeUrl, richTextLength, sanitizeRichText } from "../../events/utils/richText";

type Insert = "link" | "image" | "video";

/** Selection as character offsets inside the editor (survives DOM changes). */
function textOffsets(root: HTMLElement): [number, number] | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !root.contains(sel.anchorNode)) return null;
  const r = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(r.startContainer, r.startOffset);
  const start = pre.toString().length;
  return [start, start + r.toString().length];
}

function restoreOffsets(root: HTMLElement, [start, end]: [number, number]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let pos = 0;
  let setStart = false;
  let node: Node | null;
  let last: Node | null = null;
  while ((node = walker.nextNode())) {
    const len = node.textContent?.length ?? 0;
    if (!setStart && start <= pos + len) {
      range.setStart(node, start - pos);
      setStart = true;
    }
    if (setStart && end <= pos + len) {
      range.setEnd(node, end - pos);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    pos += len;
    last = node;
  }
  if (last) {
    range.setStart(last, last.textContent?.length ?? 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

const BLOCK_COMMANDS = new Set(["insertUnorderedList", "insertOrderedList", "justifyLeft", "justifyCenter", "formatBlock"]);

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain-text descriptions (older events) become paragraphs. */
function toEditorHtml(value: string): string {
  if (!value) return "";
  if (isRichText(value)) return sanitizeRichText(value);
  return value
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export default function RichTextEditor({
  value,
  onChange,
  max = 2000,
  placeholder,
  id,
  invalid,
}: {
  value: string;
  onChange: (html: string) => void;
  max?: number;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const last = useRef<string>("");
  const [insert, setInsert] = useState<Insert | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Load outside values (edit, template, reset) without disturbing typing.
  useEffect(() => {
    const el = ref.current;
    if (!el || value === last.current) return;
    const html = toEditorHtml(value);
    el.innerHTML = html;
    last.current = value;
  }, [value]);

  const length = richTextLength(value);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const text = (el.textContent ?? "").trim();
    const hasImg = !!el.querySelector("img");
    const html = text || hasImg ? sanitizeRichText(el.innerHTML) : "";
    last.current = html;
    onChange(html);
    refreshActive();
  }

  function refreshActive() {
    try {
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
        center: document.queryCommandState("justifyCenter"),
      });
    } catch {
      /* not supported */
    }
  }

  function keepSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (saved.current && sel) {
      sel.removeAllRanges();
      sel.addRange(saved.current);
    }
  }

  function cmd(name: string, arg?: string) {
    restoreSelection();
    const el = ref.current;
    // Block commands (lists, alignment) can move the caret to the start of the line.
    const offsets = el && BLOCK_COMMANDS.has(name) ? textOffsets(el) : null;
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand(name, false, arg);
    } catch {
      /* unsupported command */
    }
    if (el && offsets) restoreOffsets(el, offsets);
    keepSelection();
    emit();
  }

  function openInsert(kind: Insert) {
    keepSelection();
    setInsert(kind);
    setUrl("");
    setUrlError(null);
    const sel = window.getSelection();
    setLabel(kind === "link" && sel && !sel.isCollapsed ? sel.toString().slice(0, 120) : "");
  }

  function applyInsert() {
    const u = url.trim();
    if (!isSafeUrl(u) || !/^https?:\/\//i.test(u)) {
      setUrlError("Enter a full link starting with https://");
      return;
    }
    const safe = escapeHtml(u);
    if (insert === "image") {
      cmd("insertHTML", `<img src="${safe}" alt="${escapeHtml(label.trim())}">`);
    } else if (insert === "video") {
      const text = escapeHtml(label.trim() || "Watch the video");
      cmd("insertHTML", `<a href="${safe}">▶ ${text}</a>&nbsp;`);
    } else {
      const sel = saved.current;
      if (sel && !sel.collapsed && !label.trim()) cmd("createLink", u);
      else cmd("insertHTML", `<a href="${safe}">${escapeHtml(label.trim() || u)}</a>&nbsp;`);
    }
    setInsert(null);
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // Pasted content keeps only the allow-list (no styles, scripts or embeds).
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const clean = html ? sanitizeRichText(html) : toEditorHtml(text);
    try {
      document.execCommand("insertHTML", false, clean || escapeHtml(text));
    } catch {
      /* ignore */
    }
    emit();
  }

  const tb = (on: boolean | undefined) => `oe-rte__btn${on ? " is-on" : ""}`;
  const keep = (e: React.MouseEvent) => e.preventDefault(); // keep the text selection

  return (
    <div className={`oe-rte${invalid ? " is-invalid" : ""}`}>
      <div className="oe-rte__bar" role="toolbar" aria-label="Formatting">
        <select
          className="oe-rte__block"
          aria-label="Text style"
          value="p"
          onMouseDown={keepSelection}
          onChange={(e) => {
            if (e.target.value === "clear") cmd("removeFormat");
            else cmd("formatBlock", "p");
          }}
        >
          <option value="p">Paragraph</option>
          <option value="clear">Clear formatting</option>
        </select>
        <span className="oe-rte__sep" />
        <button type="button" className={tb(active.bold)} onMouseDown={keep} onClick={() => cmd("bold")} aria-label="Bold" aria-pressed={!!active.bold}>
          <Bold />
        </button>
        <button type="button" className={tb(active.italic)} onMouseDown={keep} onClick={() => cmd("italic")} aria-label="Italic" aria-pressed={!!active.italic}>
          <Italic />
        </button>
        <button type="button" className={tb(active.underline)} onMouseDown={keep} onClick={() => cmd("underline")} aria-label="Underline" aria-pressed={!!active.underline}>
          <Underline />
        </button>
        <span className="oe-rte__sep" />
        <button type="button" className={tb(active.ul)} onMouseDown={keep} onClick={() => cmd("insertUnorderedList")} aria-label="Bulleted list">
          <List />
        </button>
        <button type="button" className={tb(active.ol)} onMouseDown={keep} onClick={() => cmd("insertOrderedList")} aria-label="Numbered list">
          <ListOrdered />
        </button>
        <span className="oe-rte__sep" />
        <button type="button" className={tb(!active.center)} onMouseDown={keep} onClick={() => cmd("justifyLeft")} aria-label="Align left">
          <AlignLeft />
        </button>
        <button type="button" className={tb(active.center)} onMouseDown={keep} onClick={() => cmd("justifyCenter")} aria-label="Align center">
          <AlignCenter />
        </button>
        <span className="oe-rte__sep" />
        <button type="button" className={tb(insert === "link")} onMouseDown={keep} onClick={() => openInsert("link")} aria-label="Insert link">
          <Link2 />
        </button>
        <button type="button" className={tb(insert === "image")} onMouseDown={keep} onClick={() => openInsert("image")} aria-label="Insert image">
          <ImageIcon />
        </button>
        <button type="button" className={tb(insert === "video")} onMouseDown={keep} onClick={() => openInsert("video")} aria-label="Insert video link">
          <Video />
        </button>
      </div>

      {insert && (
        <div className="oe-rte__insert">
          <input
            autoFocus
            type="url"
            inputMode="url"
            placeholder={insert === "image" ? "Image link (https://…)" : insert === "video" ? "Video link (YouTube, Vimeo, Fockis…)" : "https://…"}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyInsert();
              }
              if (e.key === "Escape") setInsert(null);
            }}
          />
          <input
            type="text"
            placeholder={insert === "image" ? "Description (alt text)" : insert === "video" ? "Link text (optional)" : "Text (optional)"}
            value={label}
            maxLength={120}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button type="button" className="oe-btn oe-btn--primary oe-btn--sm" onClick={applyInsert}>
            Insert
          </button>
          <button type="button" className="oe-icon-btn" aria-label="Close" onClick={() => setInsert(null)}>
            <X />
          </button>
          {urlError && <small className="oe-error">{urlError}</small>}
          {insert === "video" && !urlError && <small className="oe-muted">Videos are added as a link people can open.</small>}
        </div>
      )}

      <div
        ref={ref}
        id={id}
        className={`oe-rte__area${value ? "" : " is-empty"}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Description"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={() => {
          keepSelection();
          emit();
        }}
        onKeyUp={() => {
          keepSelection();
          refreshActive();
        }}
        onMouseUp={() => {
          keepSelection();
          refreshActive();
        }}
        onPaste={onPaste}
      />
      <div className={`oe-rte__count${length > max ? " is-over" : ""}`}>
        {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
      </div>
    </div>
  );
}
