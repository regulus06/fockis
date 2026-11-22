/**
 * ImageCropDialog.tsx
 * -----------------------------------------------------------------------------
 * Crop / zoom / drag / rotate an image inside a fixed aspect-ratio frame, with
 * an optional shape mask (rounded, circle, square). The image always covers
 * the frame, so it is never stretched or left with empty edges.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Move, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

import { drawCrop, loadImage, moveRoom, ratioOf, type CropState } from "./cropImage";
import type { ImageShape } from "./pageBrandingApi";

export interface CropResult extends CropState {
  aspect: string;
  shape?: ImageShape;
  image: HTMLImageElement;
}

const SHAPE_LABEL: Record<ImageShape, string> = { rounded: "Rounded", circle: "Circle", square: "Square" };

export default function ImageCropDialog({
  title,
  src,
  aspects,
  shapes,
  initial,
  busy,
  error,
  onCancel,
  onApply,
}: {
  title: string;
  /** Same-origin URL (object URL) of the original image. */
  src: string;
  aspects: string[];
  shapes?: ImageShape[];
  initial?: Partial<CropState> & { aspect?: string; shape?: ImageShape };
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onApply: (result: CropResult) => void;
}): React.JSX.Element {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aspect, setAspect] = useState(initial?.aspect && aspects.includes(initial.aspect) ? initial.aspect : aspects[0]);
  const [shape, setShape] = useState<ImageShape | undefined>(initial?.shape ?? shapes?.[0]);
  const [s, setS] = useState<CropState>({
    zoom: initial?.zoom ?? 1,
    x: initial?.x ?? 0,
    y: initial?.y ?? 0,
    rotate: initial?.rotate ?? 0,
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 480, h: 480 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let live = true;
    loadImage(src)
      .then((i) => live && setImg(i))
      .catch((e: Error) => live && setLoadError(e.message));
    return () => {
      live = false;
    };
  }, [src]);

  // Frame size: as wide as the dialog allows, height from the aspect ratio.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const r = ratioOf(aspect);
      const maxW = Math.max(200, el.clientWidth);
      const maxH = Math.min(380, Math.round(window.innerHeight * 0.45));
      let w = maxW;
      let h = Math.round(w / r);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * r);
      }
      setBox({ w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(box.w * dpr);
    c.height = Math.round(box.h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawCrop(ctx, img, c.width, c.height, s);
  }, [img, box, s]);

  const clampXY = (v: number) => Math.max(-1, Math.min(1, v));
  const setZoom = useCallback((z: number) => setS((p) => ({ ...p, zoom: Math.max(1, Math.min(5, Math.round(z * 100) / 100)) })), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: s.x, y: s.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !img) return;
    const { mx, my } = moveRoom(img, box.w, box.h, s);
    setS((p) => ({
      ...p,
      x: mx ? clampXY(d.x - (e.clientX - d.px) / mx) : 0,
      y: my ? clampXY(d.y - (e.clientY - d.py) / my) : 0,
    }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    const map: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const m = map[e.key];
    if (!m) return;
    e.preventDefault();
    setS((p) => ({ ...p, x: clampXY(p.x + m[0]), y: clampXY(p.y + m[1]) }));
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [busy, onCancel]);

  const radius = shape === "circle" ? "50%" : shape === "square" ? "0" : "14%";

  return createPortal(
    <div className="pb pb-modal pb-modal--top" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pb-modal__card pb-crop">
        <header className="pb-modal__head">
          <h2>{title}</h2>
          <button type="button" className="pb-icon" onClick={onCancel} disabled={busy} aria-label="Close">
            <X />
          </button>
        </header>

        <div className="pb-crop__stage" ref={wrapRef}>
          {loadError ? (
            <p className="pb-error">{loadError}</p>
          ) : (
            <div
              className={"pb-crop__frame" + (img ? "" : " is-loading")}
              style={{ width: box.w, height: box.h, borderRadius: shapes ? radius : 8 }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={(e) => setZoom(s.zoom - e.deltaY * 0.0015)}
              onKeyDown={onKey}
              tabIndex={0}
              role="img"
              aria-label="Drag to reposition. Arrow keys move, scroll or the slider zooms."
            >
              <canvas ref={canvasRef} style={{ width: box.w, height: box.h }} />
              <span className="pb-crop__grid" aria-hidden="true" />
              <span className="pb-crop__hint" aria-hidden="true">
                <Move /> Drag to reposition
              </span>
            </div>
          )}
        </div>

        <div className="pb-crop__controls">
          <div className="pb-row">
            <button type="button" className="pb-icon" onClick={() => setZoom(s.zoom - 0.1)} aria-label="Zoom out">
              <ZoomOut />
            </button>
            <input
              type="range"
              min={1}
              max={5}
              step={0.01}
              value={s.zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
            />
            <button type="button" className="pb-icon" onClick={() => setZoom(s.zoom + 0.1)} aria-label="Zoom in">
              <ZoomIn />
            </button>
            <span className="pb-sep" />
            <button type="button" className="pb-icon" onClick={() => setS((p) => ({ ...p, rotate: (p.rotate - 90) % 360 }))} aria-label="Rotate left">
              <RotateCcw />
            </button>
            <button type="button" className="pb-icon" onClick={() => setS((p) => ({ ...p, rotate: (p.rotate + 90) % 360 }))} aria-label="Rotate right">
              <RotateCw />
            </button>
          </div>

          {aspects.length > 1 && (
            <div className="pb-field">
              <span className="pb-field__label">Aspect ratio</span>
              <div className="pb-chips" role="radiogroup" aria-label="Aspect ratio">
                {aspects.map((a) => (
                  <button key={a} type="button" role="radio" aria-checked={a === aspect} className={"pb-chip" + (a === aspect ? " is-on" : "")} onClick={() => setAspect(a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {shapes && shapes.length > 1 && (
            <div className="pb-field">
              <span className="pb-field__label">Shape</span>
              <div className="pb-chips" role="radiogroup" aria-label="Shape">
                {shapes.map((sh) => (
                  <button key={sh} type="button" role="radio" aria-checked={sh === shape} className={"pb-chip" + (sh === shape ? " is-on" : "")} onClick={() => setShape(sh)}>
                    {SHAPE_LABEL[sh]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="pb-error">{error}</p>}

        <footer className="pb-modal__foot">
          <button type="button" className="pb-btn pb-btn--ghost" onClick={() => setS({ zoom: 1, x: 0, y: 0, rotate: 0 })} disabled={busy}>
            Reset crop
          </button>
          <span className="pb-grow" />
          <button type="button" className="pb-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="pb-btn pb-btn--primary"
            disabled={!img || busy}
            onClick={() => img && onApply({ ...s, aspect, shape, image: img })}
          >
            <Check /> {busy ? "Saving image…" : "Apply"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
