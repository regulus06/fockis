import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { academyToken } from "../../../lib/academySession";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Logo } from "../../../components/academy/market/Shared";
import CertificateCanvas, { printCertificate } from "../../../components/academy/certificates/CertificateCanvas";
import {
  CANVAS,
  FONT_LABEL,
  PALETTES,
  SAMPLE_DATA,
  TEMPLATES,
  VARIABLES,
  templateByKey,
  uid,
  type CertDesign,
  type CertElement,
  type FontKey,
} from "../../../components/academy/certificates/certificateDesign";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { getMe } from "../../../lib/academyApi";
import { creatorApi } from "../../../lib/studioApi";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate } from "../../../lib/certificatesApi";
import "../../../styles/academy-market.scss";

/**
 * /academy/instructor/certificates/designer[/:id]
 * Visual certificate editor: templates, elements, drag to move, properties,
 * colours, undo/redo, zoom, preview with sample data, save / save as, print.
 */

type Tab = "templates" | "elements" | "colors";
const clone = (d: CertDesign): CertDesign => JSON.parse(JSON.stringify(d));

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 600 * 1024) return reject(new Error("Image must be under 600 KB."));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the image."));
    r.readAsDataURL(file);
  });
}

export default function CertificateDesigner() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useAcademyToast((s) => s.showToast);
  const hasToken = !!academyToken();
  const me = useAcademyLoad(() => (hasToken ? getMe() : Promise.reject(new Error("not-signed-in"))), [hasToken]);
  // Only people allowed to teach (Academy instructors/staff, creators approved
  // by Fockis, or staff of an approved school) can design certificates.
  const access = useAcademyLoad(() => (me.state.status === "ready" ? creatorApi.access() : Promise.resolve(null)), [me.state.status]);
  const isTeacher =
    me.state.status === "ready" &&
    access.state.status === "ready" &&
    !!access.state.data &&
    (access.state.data.canTeach || access.state.data.schoolIds.length > 0);
  const saved = useAcademyLoad(() => (isTeacher ? listTemplates() : Promise.resolve([])), [isTeacher]);

  const [design, setDesign] = useState<CertDesign>(() => templateByKey(params.get("base") ?? "signature").make());
  const [name, setName] = useState("Untitled certificate");
  const [templateId, setTemplateId] = useState<string | null>(id ?? null);
  const [past, setPast] = useState<CertDesign[]>([]);
  const [future, setFuture] = useState<CertDesign[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("templates");
  const [zoom, setZoom] = useState(0); // 0 = fit
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [box, setBox] = useState<DOMRect | null>(null);
  const [guide, setGuide] = useState<{ v?: number; h?: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; ex: number; ey: number; before: CertDesign } | null>(null);

  const { w: W, h: H } = CANVAS[design.orientation];
  const selected = design.elements.find((e) => e.id === sel) ?? null;

  // Load a saved template
  useEffect(() => {
    if (!id || !isTeacher) return;
    getTemplate(id)
      .then((t) => {
        setDesign(t.design);
        setName(t.name);
        setTemplateId(t._id);
        setPast([]);
        setFuture([]);
        setDirty(false);
      })
      .catch((e) => toast(e instanceof Error ? e.message : "Could not load the template"));
  }, [id, isTeacher, toast]);

  // ---------- history
  const commit = useCallback((next: CertDesign, before?: CertDesign) => {
    setPast((p) => [...p.slice(-60), before ?? design]);
    setFuture([]);
    setDesign(next);
    setDirty(true);
  }, [design]);

  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [design, ...f]);
    setDesign(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setDirty(true);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, design]);
    setDesign(future[0]);
    setFuture((f) => f.slice(1));
    setDirty(true);
  };

  const patchEl = (elId: string, patch: Partial<CertElement>) => {
    const next = clone(design);
    next.elements = next.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e));
    commit(next);
  };
  const addEl = (el: Omit<CertElement, "id">) => {
    const next = clone(design);
    const e = { ...el, id: uid(el.kind) } as CertElement;
    next.elements.push(e);
    commit(next);
    setSel(e.id);
    setTab("elements");
  };
  const removeSel = () => {
    if (!sel) return;
    const next = clone(design);
    next.elements = next.elements.filter((e) => e.id !== sel);
    commit(next);
    setSel(null);
  };
  const reorder = (dir: 1 | -1) => {
    if (!sel) return;
    const next = clone(design);
    const i = next.elements.findIndex((e) => e.id === sel);
    const j = i + dir;
    if (j < 0 || j >= next.elements.length) return;
    [next.elements[i], next.elements[j]] = [next.elements[j], next.elements[i]];
    commit(next);
  };

  // ---------- selection box
  useLayoutEffect(() => {
    if (!sel || !svgRef.current || preview) return setBox(null);
    const node = svgRef.current.querySelector(`[data-id="${sel}"]`) as SVGGraphicsElement | null;
    if (!node) return setBox(null);
    try {
      const b = node.getBBox();
      setBox(new DOMRect(b.x, b.y, b.width, b.height));
    } catch {
      setBox(null);
    }
  }, [sel, design, preview]);

  // ---------- drag
  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = cx;
    p.y = cy;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  };
  const onElDown = (elId: string, e: React.PointerEvent<SVGGElement>) => {
    if (preview) return;
    e.stopPropagation();
    setSel(elId);
    const el = design.elements.find((x) => x.id === elId)!;
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id: elId, sx: p.x, sy: p.y, ex: el.x, ey: el.y, before: design };
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const p = toSvg(e.clientX, e.clientY);
      let nx = Math.round(d.ex + p.x - d.sx);
      let ny = Math.round(d.ey + p.y - d.sy);
      const el = design.elements.find((x) => x.id === d.id);
      if (!el) return;
      // snap the element's centre to the canvas centre lines
      const halfW = el.kind === "text" ? 0 : (el.w ?? 0) / 2;
      const halfH = el.kind === "text" ? 0 : (el.h ?? el.w ?? 0) / 2;
      const cxEl = el.kind === "text" && el.align === "center" ? nx : nx + halfW;
      const g: { v?: number; h?: number } = {};
      if (Math.abs(cxEl - W / 2) < 8 && (el.kind !== "text" || el.align === "center")) {
        nx = el.kind === "text" ? W / 2 : W / 2 - halfW;
        g.v = W / 2;
      }
      if (el.kind !== "text" && Math.abs(ny + halfH - H / 2) < 8) {
        ny = H / 2 - halfH;
        g.h = H / 2;
      }
      setGuide(g.v || g.h ? g : null);
      setDesign((cur) => ({ ...cur, elements: cur.elements.map((x) => (x.id === d.id ? { ...x, x: nx, y: ny } : x)) }));
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      setGuide(null);
      setDesign((cur) => {
        const moved = cur.elements.find((x) => x.id === d.id);
        if (moved && (moved.x !== d.ex || moved.y !== d.ey)) {
          setPast((p) => [...p.slice(-60), d.before]);
          setFuture([]);
          setDirty(true);
        }
        return cur;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.elements, W, H]);

  // ---------- keyboard
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!sel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSel();
      }
      const step = e.shiftKey ? 10 : 1;
      const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (mv[e.key]) {
        e.preventDefault();
        const el = design.elements.find((x) => x.id === sel)!;
        patchEl(sel, { x: el.x + mv[e.key][0], y: el.y + mv[e.key][1] });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  // ---------- save
  async function save(asNew = false) {
    if (!isTeacher) return;
    setBusy(true);
    try {
      if (templateId && !asNew) {
        await updateTemplate(templateId, { name, design, baseTemplate: design.base });
        toast("Template saved");
      } else {
        const label = asNew ? window.prompt("Name for the new template", `${name} (copy)`) : name;
        if (asNew && !label) return;
        const t = await createTemplate({ name: label || name, design, baseTemplate: design.base, status: "published" });
        setTemplateId(t._id);
        setName(t.name);
        navigate(`/academy/instructor/certificates/designer/${t._id}`, { replace: true });
        toast("Template saved");
      }
      setDirty(false);
      saved.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!templateId || !window.confirm("Delete this template? Certificates already issued are not affected.")) return;
    try {
      await deleteTemplate(templateId);
      toast("Template deleted");
      navigate("/academy/instructor/certificates");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete");
    }
  }

  /** Change the template colours; elements that used an old palette colour follow it. */
  const applyColors = (colors: CertDesign["colors"]) => {
    const old = design.colors;
    const map = new Map<string, string>();
    (["primary", "accent", "text", "muted"] as const).forEach((k) => map.set(old[k].toLowerCase(), colors[k]));
    const next = clone(design);
    next.colors = colors;
    next.elements = next.elements.map((e) => (e.color && map.has(e.color.toLowerCase()) ? { ...e, color: map.get(e.color.toLowerCase()) } : e));
    commit(next);
  };

  const pickTemplate = (key: string) => {
    if (dirty && !window.confirm("Replace the current design with this template? You can undo.")) return;
    commit(templateByKey(key).make());
    setSel(null);
  };

  const scaleStyle = useMemo(() => (zoom ? { width: `${W * zoom}px` } : undefined), [zoom, W]);

  // ---------- gates
  if (!hasToken || me.state.status === "error")
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Certificate Designer</h2>
            <p className="fa-muted">Sign in with an instructor account to design certificates.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/login">Sign in to Academy</Link>
          </div>
        </div>
      </div>
    );
  if (me.state.status === "loading" || (me.state.status === "ready" && access.state.status === "loading"))
    return <div className="fa-root fa-page fa-page--soft" />;
  if (me.state.status === "ready" && !isTeacher)
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Certificate Designer</h2>
            <p className="fa-muted">Only approved teachers can design certificates. Students can see their own certificates in their portal.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/teach/apply">Apply to teach</Link>
          </div>
        </div>
      </div>
    );

  const data = SAMPLE_DATA;

  return (
    <div className="fa-root fa-designer">
      {/* Toolbar */}
      <header className="fa-designer__bar">
        <Logo />
        <Link to="/academy/instructor/certificates" className="fa-link">
          <Icon name="left" size={14} /> Certificates
        </Link>
        <input className="fa-designer__name" value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} aria-label="Template name" maxLength={120} />
        {dirty && <span className="fa-badge tone-amber">Unsaved</span>}
        <span className="fa-designer__spacer" />
        <div className="fa-tool-group">
          <button className="fa-tool" onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">↶</button>
          <button className="fa-tool" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)">↷</button>
        </div>
        <div className="fa-tool-group">
          <button className="fa-tool" onClick={() => setZoom((z) => Math.max(0.4, Math.round(((z || 0.8) - 0.1) * 10) / 10))} title="Zoom out">−</button>
          <button className="fa-tool fa-tool--text" onClick={() => setZoom(0)} title="Fit to screen">{zoom ? `${Math.round(zoom * 100)}%` : "Fit"}</button>
          <button className="fa-tool" onClick={() => setZoom((z) => Math.min(1.6, Math.round(((z || 0.8) + 0.1) * 10) / 10))} title="Zoom in">+</button>
        </div>
        <button className={`fa-btn fa-btn--sm ${preview ? "fa-btn--primary" : "fa-btn--outline"}`} onClick={() => (setPreview(!preview), setSel(null))}>
          <Icon name="play" size={13} /> {preview ? "Exit preview" : "Preview"}
        </button>
        <button className="fa-btn fa-btn--sm fa-btn--outline" onClick={() => printCertificate(svgRef.current, design.orientation, name)}>
          <Icon name="download" size={14} /> PDF
        </button>
        <button className="fa-btn fa-btn--sm fa-btn--outline" disabled={busy} onClick={() => save(true)}>Save as</button>
        <button className="fa-btn fa-btn--sm fa-btn--primary" disabled={busy} onClick={() => save(false)}>
          {busy ? "Saving…" : "Save Template"}
        </button>
      </header>

      <div className="fa-designer__body">
        {/* Left panel */}
        <aside className="fa-designer__left">
          <nav className="fa-designer__tabs">
            {(["templates", "elements", "colors"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "is-on" : ""} onClick={() => setTab(t)}>
                <Icon name={t === "templates" ? "grid" : t === "elements" ? "layers" : "palette"} size={16} />
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>

          {tab === "templates" && (
            <div className="fa-designer__pane">
              <h5>Fockis templates</h5>
              <div className="fa-tgrid">
                {TEMPLATES.map((tp) => (
                  <button key={tp.key} className={`fa-tthumb ${design.base === tp.key ? "is-on" : ""}`} onClick={() => pickTemplate(tp.key)} title={tp.name}>
                    <CertificateCanvas design={tp.make()} data={SAMPLE_DATA} />
                    <b>{tp.name}</b>
                    <small>{tp.tag}</small>
                  </button>
                ))}
              </div>
              {saved.state.status === "ready" && saved.state.data.length > 0 && (
                <>
                  <h5>My saved templates</h5>
                  <div className="fa-tgrid">
                    {saved.state.data.map((tp) => (
                      <Link key={tp._id} to={`/academy/instructor/certificates/designer/${tp._id}`} className={`fa-tthumb ${templateId === tp._id ? "is-on" : ""}`}>
                        <CertificateCanvas design={tp.design} data={SAMPLE_DATA} />
                        <b>{tp.name}</b>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "elements" && (
            <div className="fa-designer__pane">
              <h5>Add</h5>
              <div className="fa-addgrid">
                <button onClick={() => addEl({ kind: "text", x: W / 2, y: H / 2, text: "New text", font: "sans", size: 22, color: design.colors.text, weight: 600, align: "center", label: "Text" })}>
                  <Icon name="pen" size={16} /> Text
                </button>
                <button onClick={() => addEl({ kind: "text", x: W / 2, y: H / 2, text: "Heading", font: "serif", size: 44, color: design.colors.primary, weight: 700, align: "center", label: "Heading" })}>
                  <Icon name="file" size={16} /> Heading
                </button>
                <button onClick={() => addEl({ kind: "logo", x: 60, y: 60, w: 180, h: 46, color: design.colors.primary })}>
                  <Icon name="image" size={16} /> Logo
                </button>
                <button onClick={() => addEl({ kind: "signature", x: W / 2 - 90, y: H - 190, w: 180, h: 52, text: "{{instructor_name}}", font: "script", size: 30, color: design.colors.text })}>
                  <Icon name="pen" size={16} /> Signature
                </button>
                <button onClick={() => addEl({ kind: "seal", x: W / 2 - 70, y: H / 2 - 70, w: 140, color: design.colors.accent })}>
                  <Icon name="award" size={16} /> Seal
                </button>
                <button onClick={() => addEl({ kind: "qr", x: W - 160, y: H - 170, w: 110, color: design.colors.text })}>
                  <Icon name="grid" size={16} /> QR code
                </button>
                <button onClick={() => addEl({ kind: "line", x: W / 2 - 150, y: H / 2, w: 300, h: 2, color: design.colors.accent })}>
                  <Icon name="list" size={16} /> Line
                </button>
              </div>
              <h5>Dynamic fields</h5>
              <p className="fa-hint">Click to add a field. It is filled in automatically for each student.</p>
              <div className="fa-varlist">
                {VARIABLES.map((v) => (
                  <button key={v.key} onClick={() => (selected?.kind === "text" ? patchEl(selected.id, { text: `${selected.text ?? ""} {{${v.key}}}`.trim() }) : addEl({ kind: "text", x: W / 2, y: H / 2, text: `{{${v.key}}}`, font: "sans", size: 20, color: design.colors.text, weight: 600, align: "center", label: v.label }))}>
                    <code>{`{{${v.key}}}`}</code>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
              <h5>Layers</h5>
              <ul className="fa-layers">
                {[...design.elements].reverse().map((e) => (
                  <li key={e.id}>
                    <button className={sel === e.id ? "is-on" : ""} onClick={() => setSel(e.id)}>
                      <Icon name={e.kind === "text" ? "pen" : e.kind === "qr" ? "grid" : e.kind === "seal" ? "award" : e.kind === "line" ? "list" : "image"} size={13} />
                      {e.label || (e.kind === "text" ? (e.text ?? "").slice(0, 26) : e.kind)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "colors" && (
            <div className="fa-designer__pane">
              <h5>Palettes</h5>
              <div className="fa-palettes">
                {PALETTES.map((p) => (
                  <button key={p.name} onClick={() => applyColors({ ...p.colors, background: design.decor === "executive" || design.decor === "technical" ? design.colors.background : p.colors.background })}>
                    <span style={{ background: p.colors.primary }} />
                    <span style={{ background: p.colors.accent }} />
                    <span style={{ background: p.colors.background, border: "1px solid #e4e9f3" }} />
                    {p.name}
                  </button>
                ))}
              </div>
              <h5>Custom colours</h5>
              {(["primary", "accent", "background", "text", "muted"] as const).map((k) => (
                <label key={k} className="fa-colorrow">
                  <span>{k[0].toUpperCase() + k.slice(1)}</span>
                  <input type="color" value={design.colors[k]} onChange={(e) => applyColors({ ...design.colors, [k]: e.target.value })} />
                  <code>{design.colors[k]}</code>
                </label>
              ))}
              <p className="fa-hint">Changes borders, seal, decorations and every element that uses these colours. Fine-tune a single element in the Properties panel.</p>
              <h5>Page</h5>
              <div className="fa-seg">
                {(["landscape", "portrait"] as const).map((o) => (
                  <button
                    key={o}
                    className={design.orientation === o ? "is-on" : ""}
                    onClick={() => {
                      if (design.orientation === o) return;
                      const from = CANVAS[design.orientation];
                      const to = CANVAS[o];
                      const next = clone(design);
                      next.orientation = o;
                      next.elements = next.elements.map((e) => ({ ...e, x: Math.round((e.x / from.w) * to.w), y: Math.round((e.y / from.h) * to.h) }));
                      commit(next);
                    }}
                  >
                    {o[0].toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Canvas */}
        <main className="fa-designer__stage" onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="fa-designer__paper" style={scaleStyle} data-orientation={design.orientation}>
            <CertificateCanvas ref={svgRef} design={design} data={data} selectedId={preview ? null : sel} onElementPointerDown={preview ? undefined : onElDown} onBackgroundPointerDown={() => setSel(null)} />
            {!preview && (
              <svg className="fa-designer__overlay" viewBox={`0 0 ${W} ${H}`}>
                {box && <rect x={box.x - 4} y={box.y - 4} width={box.width + 8} height={box.height + 8} fill="none" stroke="#1d5ee8" strokeWidth="2" strokeDasharray="6 4" />}
                {guide?.v !== undefined && <line x1={guide.v} y1="0" x2={guide.v} y2={H} stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4 4" />}
                {guide?.h !== undefined && <line x1="0" y1={guide.h} x2={W} y2={guide.h} stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4 4" />}
              </svg>
            )}
          </div>
          <p className="fa-designer__caption">
            {design.orientation === "landscape" ? "A4 · Landscape" : "A4 · Portrait"} · {preview ? "Preview with sample student data" : "Drag to move · arrow keys nudge · Delete removes"}
          </p>
        </main>

        {/* Properties */}
        <aside className="fa-designer__right">
          <h5>Properties</h5>
          {!selected && <p className="fa-hint">Select an element on the certificate to edit it.</p>}
          {selected && (
            <div className="fa-props">
              <div className="fa-props__head">
                <b>{selected.label || selected.kind}</b>
                <span>
                  <button className="fa-tool" title="Bring forward" onClick={() => reorder(1)}>↑</button>
                  <button className="fa-tool" title="Send backward" onClick={() => reorder(-1)}>↓</button>
                  <button className="fa-tool fa-tool--danger" title="Delete" onClick={removeSel}>✕</button>
                </span>
              </div>

              {(selected.kind === "text" || selected.kind === "signature") && (
                <label className="fa-field">
                  <span>{selected.kind === "signature" ? "Signature text (if no image)" : "Text"}</span>
                  <textarea rows={3} value={selected.text ?? ""} onChange={(e) => patchEl(selected.id, { text: e.target.value })} />
                </label>
              )}

              {selected.kind === "text" && (
                <>
                  <label className="fa-field">
                    <span>Font</span>
                    <select value={selected.font ?? "sans"} onChange={(e) => patchEl(selected.id, { font: e.target.value as FontKey })}>
                      {(Object.keys(FONT_LABEL) as FontKey[]).map((f) => (
                        <option key={f} value={f}>{FONT_LABEL[f]}</option>
                      ))}
                    </select>
                  </label>
                  <div className="fa-row2 fa-row2--even">
                    <label className="fa-field">
                      <span>Size</span>
                      <input type="number" min={6} max={200} value={selected.size ?? 16} onChange={(e) => patchEl(selected.id, { size: Number(e.target.value) || 16 })} />
                    </label>
                    <label className="fa-field">
                      <span>Weight</span>
                      <select value={selected.weight ?? 400} onChange={(e) => patchEl(selected.id, { weight: Number(e.target.value) })}>
                        {[300, 400, 500, 600, 700, 800].map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="fa-props__row">
                    <div className="fa-seg fa-seg--sm">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} className={(selected.align ?? "left") === a ? "is-on" : ""} onClick={() => patchEl(selected.id, { align: a })}>
                          {a[0].toUpperCase() + a.slice(1)}
                        </button>
                      ))}
                    </div>
                    <button className={`fa-tool fa-tool--text ${selected.italic ? "is-on" : ""}`} onClick={() => patchEl(selected.id, { italic: !selected.italic })}><i>I</i></button>
                    <button className={`fa-tool fa-tool--text ${selected.upper ? "is-on" : ""}`} onClick={() => patchEl(selected.id, { upper: !selected.upper })}>AA</button>
                  </div>
                  <div className="fa-row2 fa-row2--even">
                    <label className="fa-field">
                      <span>Letter spacing</span>
                      <input type="number" min={0} max={30} value={selected.spacing ?? 0} onChange={(e) => patchEl(selected.id, { spacing: Number(e.target.value) || 0 })} />
                    </label>
                    <label className="fa-field">
                      <span>Wrap width</span>
                      <input type="number" min={0} max={W} value={selected.w ?? 0} onChange={(e) => patchEl(selected.id, { w: Number(e.target.value) || undefined })} />
                    </label>
                  </div>
                </>
              )}

              {selected.kind !== "qr" && (
                <label className="fa-colorrow">
                  <span>Colour</span>
                  <input type="color" value={selected.color ?? "#0f1b33"} onChange={(e) => patchEl(selected.id, { color: e.target.value })} />
                  <code>{selected.color}</code>
                </label>
              )}

              {(selected.kind === "logo" || selected.kind === "signature") && (
                <div className="fa-field">
                  <span>{selected.kind === "logo" ? "Upload your logo" : "Upload signature image"}</span>
                  <label className="fa-btn fa-btn--outline fa-btn--sm fa-upload">
                    <Icon name="upload" size={14} /> Choose image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          patchEl(selected.id, { src: await readFile(f) });
                        } catch (err) {
                          toast(err instanceof Error ? err.message : "Upload failed");
                        }
                      }}
                    />
                  </label>
                  {selected.src && (
                    <button className="fa-link" onClick={() => patchEl(selected.id, { src: undefined })}>
                      Remove image (use {selected.kind === "logo" ? "Fockis logo" : "typed signature"})
                    </button>
                  )}
                  <small className="fa-hint">PNG with transparent background works best · max 600 KB. Only upload logos and signatures you are authorised to use.</small>
                </div>
              )}

              <div className="fa-row2 fa-row2--even">
                <label className="fa-field">
                  <span>X</span>
                  <input type="number" value={selected.x} onChange={(e) => patchEl(selected.id, { x: Number(e.target.value) || 0 })} />
                </label>
                <label className="fa-field">
                  <span>Y</span>
                  <input type="number" value={selected.y} onChange={(e) => patchEl(selected.id, { y: Number(e.target.value) || 0 })} />
                </label>
              </div>
              {selected.kind !== "text" && (
                <div className="fa-row2 fa-row2--even">
                  <label className="fa-field">
                    <span>{selected.kind === "seal" || selected.kind === "qr" ? "Size" : "Width"}</span>
                    <input type="number" min={10} value={selected.w ?? 100} onChange={(e) => patchEl(selected.id, { w: Number(e.target.value) || 10 })} />
                  </label>
                  {(selected.kind === "logo" || selected.kind === "signature" || selected.kind === "line") && (
                    <label className="fa-field">
                      <span>Height</span>
                      <input type="number" min={1} value={selected.h ?? 40} onChange={(e) => patchEl(selected.id, { h: Number(e.target.value) || 1 })} />
                    </label>
                  )}
                </div>
              )}
              <button className="fa-btn fa-btn--white fa-btn--sm" onClick={() => patchEl(selected.id, selected.kind === "text" ? { x: W / 2, align: "center" } : { x: Math.round(W / 2 - (selected.w ?? 0) / 2) })}>
                Center horizontally
              </button>
              {selected.kind === "qr" && <p className="fa-hint">The QR code links to this certificate’s public verification page. In the editor it shows a sample link.</p>}
            </div>
          )}

          <div className="fa-props__foot">
            {templateId && (
              <button className="fa-link fa-link--danger" onClick={remove}>
                <Icon name="lock" size={13} /> Delete template
              </button>
            )}
            <Link className="fa-btn fa-btn--primary fa-btn--sm" to={templateId ? `/academy/instructor/certificates?issue=${templateId}` : "/academy/instructor/certificates"}>
              <Icon name="award" size={14} /> Issue certificates
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
