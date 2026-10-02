import type { CSSProperties } from 'react';
import type { TemplatePreviewData } from '../types/createTypes';

// CSS custom properties (--p1 / --p2) aren't part of the official CSSProperties
// type, so we cast through this helper to keep the component fully typed.
type StyleWithVars = CSSProperties & Record<`--${string}`, string | undefined>;

interface TemplatePreviewProps {
  preview: TemplatePreviewData;
}

export default function TemplatePreview({ preview }: TemplatePreviewProps) {
  switch (preview.type) {
    case 'business-mock':
      return (
        <div className="preview preview-business" aria-hidden="true">
          <div className="mock">
            <span style={preview.small ? { fontSize: 15 } : undefined}>{preview.initials}</span>
          </div>
        </div>
      );

    case 'brand-shapes':
      return (
        <div className="preview preview-brand" aria-hidden="true">
          <div className="shape s1" />
          <div className="shape s2" />
          <div className="shape s3" />
        </div>
      );

    case 'flyer':
      return (
        <div className="preview preview-flyer" aria-hidden="true">
          <div className="flyer-text">
            <div className="big">
              {preview.big.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < preview.big.length - 1 && <br />}
                </span>
              ))}
            </div>
            <div className="small">{preview.small}</div>
          </div>
        </div>
      );

    case 'invite':
      return (
        <div className="preview preview-invite">
          <div className="frame" aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="invite-line">{preview.line}</div>
            <div className="invite-sub">{preview.sub}</div>
          </div>
        </div>
      );

    case 'menu':
      return (
        <div className="preview preview-menu">
          {preview.rows.map((row) => (
            <div className="menu-row" aria-hidden="true" key={row.name}>
              <span className="name">{row.name}</span>
              <span className="leader" />
              <span className="price">{row.price}</span>
            </div>
          ))}
        </div>
      );

    case 'card':
      return (
        <div className="preview preview-card" style={{ background: preview.dark ? 'var(--surface-alt)' : undefined }}>
          <div
            className="biz-card"
            style={preview.bg ? { background: preview.bg, boxShadow: 'var(--shadow-md)' } : undefined}
            aria-hidden="true"
          >
            <div className="top">
              <div className="name" style={preview.dark ? { color: '#fff' } : undefined}>{preview.name}</div>
              <div className="role" style={preview.dark ? { color: 'rgba(255,255,255,0.75)' } : undefined}>{preview.role}</div>
            </div>
            <div className="rule" />
            <div className="contact" style={preview.dark ? { color: 'rgba(255,255,255,0.7)' } : undefined}>{preview.contact}</div>
          </div>
        </div>
      );

    case 'photo':
      return (
        <div className="preview preview-photo" style={{ '--p1': preview.p1, '--p2': preview.p2 } as StyleWithVars}>
          <div className="photo-mock" aria-hidden="true" />
          <div className="scrim-bottom" aria-hidden="true" />
          <div className="photo-copy">
            <div className="eyebrow-mini">{preview.eyebrow}</div>
            <div className="headline">
              {preview.headline.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < preview.headline.length - 1 && <br />}
                </span>
              ))}
            </div>
            {preview.sub && <div className="sub">{preview.sub}</div>}
          </div>
        </div>
      );

    case 'social-quote':
      return (
        <div className="preview preview-social" style={{ background: 'var(--surface-alt)' }}>
          <div
            className="social-frame social-quote"
            style={{ '--p1': '#0D2740', '--p2': '#2B5D8C', background: 'linear-gradient(155deg, #0D2740, #2B5D8C)' } as StyleWithVars}
          >
            <div>
              <div className="mark" aria-hidden="true">&ldquo;</div>
              <p>
                {preview.quote.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < preview.quote.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      );

    case 'social-photo':
      return (
        <div className="preview preview-social" style={{ background: 'var(--surface-alt)' }}>
          <div
            className="social-frame"
            style={{
              '--p1': preview.p1,
              '--p2': preview.p2,
              background: `linear-gradient(155deg, ${preview.p1}, ${preview.p2})`,
              display: 'flex',
              alignItems: 'flex-end',
            } as StyleWithVars}
          >
            <div className="scrim-bottom" aria-hidden="true" />
            <div className="photo-copy" style={{ padding: 12 }}>
              <div className="eyebrow-mini">{preview.eyebrow}</div>
              <div className="headline" style={{ fontSize: 15 }}>
                {preview.headline.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < preview.headline.length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'badge':
      return (
        <div className="preview preview-badge" style={{ background: preview.bg }}>
          <div className="badge-shape" aria-hidden="true">
            <span className="num">{preview.num}</span>
            <span className="cap">{preview.cap}</span>
          </div>
        </div>
      );

    case 'list':
      return (
        <div className="preview preview-list">
          {preview.rows.map((row, i) => (
            <div className="list-row" aria-hidden="true" key={i}>
              <span className="swatch" style={{ '--p1': row.p1, '--p2': row.p2 } as StyleWithVars}>{row.num}</span>
              <span className="lines">
                <span className="l1" />
                <span className="l2" />
              </span>
            </div>
          ))}
        </div>
      );

    case 'bracket':
      return (
        <div className="preview preview-bracket">
          {preview.rows.map((row, i) => (
            <div className="bracket-row" aria-hidden="true" key={i}>
              <span className={`node${row.left === 'win' ? ' win' : ''}`} />
              <span className="vs">{row.label}</span>
              <span className={`node${row.right === 'win' ? ' win' : ''}`} />
            </div>
          ))}
        </div>
      );

    case 'app':
      return (
        <div className="preview preview-app" style={{ '--p1': preview.p1, '--p2': preview.p2 } as StyleWithVars}>
          <div className="app-frame" aria-hidden="true">
            <div className="dot" />
            <div className="row w60" />
            <div className="row" />
            <div className="row w60" />
            <div className="row gold" />
          </div>
        </div>
      );

    default:
      return <div className="preview" />;
  }
}
