import type { CSSProperties } from "react";
import type { EmailBlock as EmailBlockModel } from "../types/mailchimp.types";

interface EmailBlockProps {
  block: EmailBlockModel;
  editable?: boolean;
  onTextChange?: (text: string) => void;
}

function countdownParts(endsAt: string): Array<[string, string]> {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return [[String(d), "days"], [String(h).padStart(2, "0"), "hours"], [String(m).padStart(2, "0"), "mins"]];
}

/** Placeholder art for image slots so the canvas never loads remote assets. */
function ImageSlot({ label, ratio = "2 / 1", url }: { label: string; ratio?: string; url?: string }) {
  if (url) return <img src={url} alt={label} style={{ width: "100%", display: "block", aspectRatio: ratio, objectFit: "cover" }} />;
  return (
    <div className="fm-eb-imgslot" style={{ aspectRatio: ratio }} role="img" aria-label={label}>
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

/** Renders one email block. Used by the builder canvas and every preview. */
export function EmailBlock({ block: b, editable, onTextChange }: EmailBlockProps) {
  const s = b.style;
  const wrap: CSSProperties = {
    padding: `${s.paddingY}px ${s.paddingX}px`,
    background: s.background,
    textAlign: s.align,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    color: s.color,
    lineHeight: 1.55,
  };
  const inline = (tag: "p" | "h2") => {
    const Tag = tag;
    return (
      <Tag
        className={tag === "h2" ? "fm-eb-heading" : "fm-eb-text"}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => onTextChange?.(e.currentTarget.textContent ?? "")}
        style={{ margin: 0, fontSize: s.fontSize, color: s.color, fontFamily: s.fontFamily }}
      >
        {b.text}
      </Tag>
    );
  };

  switch (b.type) {
    case "heading":
      return <div style={wrap}>{inline("h2")}</div>;
    case "text":
      return <div style={wrap}>{inline("p")}</div>;
    case "logo":
      return (
        <div style={wrap}>
          <span className="fm-eb-logo" style={{ color: s.color, fontSize: s.fontSize }}>
            <span className="fm-eb-logo__mark" style={{ background: s.color }}>F</span>
            {b.text}
          </span>
        </div>
      );
    case "image":
      return <div style={wrap}><ImageSlot label={b.text || "Image"} url={b.imageUrl} /></div>;
    case "video":
      return (
        <div style={wrap}>
          <div className="fm-eb-video">
            <ImageSlot label={b.text || "Video"} ratio="16 / 9" url={b.imageUrl} />
            <span className="fm-eb-video__play" aria-hidden>▶</span>
          </div>
          <p className="fm-eb-caption">{b.text}</p>
        </div>
      );
    case "button":
      return (
        <div style={wrap}>
          <span
            className="fm-eb-button"
            style={{ background: s.buttonColor, color: s.buttonTextColor, borderRadius: s.borderRadius, fontFamily: s.fontFamily, border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : undefined }}
          >
            {b.text}
          </span>
        </div>
      );
    case "divider":
      return <div style={wrap}><hr style={{ border: 0, borderTop: `${Math.max(1, s.borderWidth)}px solid ${s.borderColor}`, margin: 0 }} /></div>;
    case "spacer":
      return <div style={{ height: b.height, background: s.background }} aria-hidden />;
    case "social":
      return (
        <div style={wrap}>
          <div className="fm-eb-social" style={{ justifyContent: s.align === "left" ? "flex-start" : s.align === "right" ? "flex-end" : "center" }}>
            {b.text.split(/[·,|]/).map((n) => n.trim()).filter(Boolean).map((n) => (
              <span key={n} style={{ borderColor: s.color, color: s.color }}>{n}</span>
            ))}
          </div>
        </div>
      );
    case "product":
    case "product_grid": {
      const grid = b.type === "product_grid";
      return (
        <div style={wrap}>
          <div className={grid ? "fm-eb-products is-grid" : "fm-eb-products"}>
            {b.products.map((p, i) => (
              <div key={`${p.name}-${i}`} className="fm-eb-product">
                <ImageSlot label={p.name} ratio={grid ? "1 / 1" : "4 / 3"} url={p.imageUrl} />
                <strong>{p.name}</strong>
                <span>{p.price}</span>
                <span className="fm-eb-product__cta" style={{ color: s.buttonColor }}>Shop now</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "coupon":
      return (
        <div style={wrap}>
          <div className="fm-eb-coupon" style={{ borderColor: s.borderColor, borderWidth: s.borderWidth, borderRadius: s.borderRadius }}>
            <p style={{ margin: 0 }}>{b.text}</p>
            <strong style={{ color: s.buttonColor }}>{b.code}</strong>
          </div>
        </div>
      );
    case "countdown":
      return (
        <div style={wrap}>
          <p style={{ margin: "0 0 8px" }}>{b.text}</p>
          <div className="fm-eb-countdown">
            {countdownParts(b.endsAt).map(([v, l]) => (
              <span key={l} style={{ background: s.buttonColor, color: s.buttonTextColor }}>
                <strong>{v}</strong>
                <small>{l}</small>
              </span>
            ))}
          </div>
        </div>
      );
    case "columns":
      return (
        <div style={wrap}>
          <div className="fm-eb-columns">
            <p>{b.columns[0]}</p>
            <p>{b.columns[1]}</p>
          </div>
        </div>
      );
    case "footer":
      return (
        <div style={wrap}>
          <p style={{ margin: 0 }}>{b.text}</p>
          <p style={{ margin: "8px 0 0" }}><u>Unsubscribe</u> · <u>Update preferences</u></p>
        </div>
      );
  }
}
