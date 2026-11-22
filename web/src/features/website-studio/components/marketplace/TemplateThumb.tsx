import React from "react";
import type { WebsiteTemplate } from "../../types/studio";
import { googleFontUrl, ensureFonts } from "../../renderer/theme";

/**
 * Template preview image. Official templates have a real screenshot; templates
 * without one get a live mini-mockup drawn from the template's own theme.
 */
export default function TemplateThumb({ template, tall }: { template: WebsiteTemplate; tall?: boolean }) {
  if (template.thumbnail) {
    return (
      <div className={`wst-thumb${tall ? " is-tall" : ""}`}>
        <img src={template.thumbnail} alt={`${template.name} preview`} loading="lazy" />
      </div>
    );
  }
  const th = template.theme;
  if (th && typeof document !== "undefined") ensureFonts([th.fonts.heading].filter((f) => !!googleFontUrl(f)));
  const c = th?.colors;
  return (
    <div className={`wst-thumb wst-thumb--mock${tall ? " is-tall" : ""}`} style={{ background: c?.background ?? "#fff" }} aria-label={`${template.name} preview`}>
      <div className="wst-mock__header" style={{ background: c?.headerBg, color: c?.headerText }}>
        <b style={{ fontFamily: th?.fonts.heading }}>{template.name.split(" ")[0]}</b>
        <span /><span /><span />
        <i style={{ background: c?.primary }} />
      </div>
      <div className="wst-mock__hero" style={{ background: c?.surface }}>
        <div>
          <strong style={{ fontFamily: th?.fonts.heading, color: c?.heading }}>{template.name}</strong>
          <em style={{ background: c?.primary }} />
          <em style={{ background: c?.accent, width: "28%" }} />
        </div>
        <div className="wst-mock__img" style={{ background: `linear-gradient(135deg, ${c?.primary ?? "#999"}, ${c?.accent ?? "#ccc"})` }} />
      </div>
      <div className="wst-mock__cards">
        {[0, 1, 2, 3].map((i) => <span key={i} style={{ background: c?.surface, borderBottom: `6px solid ${i % 2 ? c?.accent : c?.primary}` }} />)}
      </div>
    </div>
  );
}
