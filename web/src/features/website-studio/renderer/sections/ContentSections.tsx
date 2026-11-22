import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";
import { useRender, useSection } from "../context";
import { EditableButton, EditableImage, EditableText, SectionHeading, SiteLink } from "../editable";
import { formatMoney } from "../theme";
import { ItemLink } from "./CardSections";
import { Stars } from "./CommerceSections";
import { Socials } from "./HeaderSection";

export function TextBlock() {
  const section = useSection();
  const p = section.props;
  return (
    <div className="ws-container ws-text-block">
      <SectionHeading bodyPath="body" />
      {p.buttons?.length ? (
        <div className="ws-btn-row">
          {p.buttons.map((_: unknown, i: number) => (
            <EditableButton key={i} path={`buttons.${i}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ImageText() {
  const section = useSection();
  const p = section.props;
  return (
    <div className={`ws-container ws-split ws-split--${p.imageSide === "right" ? "right" : "left"}`}>
      <div className="ws-split__media">
        <EditableImage path="image" className="ws-split__img" />
      </div>
      <div className="ws-split__copy">
        <SectionHeading bodyPath="body" styleOverride="plain" />
        {p.buttons?.length ? (
          <div className="ws-btn-row">
            {p.buttons.map((_: unknown, i: number) => (
              <EditableButton key={i} path={`buttons.${i}`} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ImageBlock() {
  const section = useSection();
  const p = section.props;
  const img = <EditableImage path="src" className="ws-image-block__img" />;
  return (
    <figure className="ws-container ws-image-block">
      {p.href ? <SiteLink href={p.href}>{img}</SiteLink> : img}
      {p.caption ? <EditableText as="figcaption" path="caption" /> : null}
    </figure>
  );
}

export function ButtonRow() {
  const section = useSection();
  return (
    <div className="ws-container ws-btn-row ws-btn-row--section">
      {(section.props.buttons ?? []).map((_: unknown, i: number) => (
        <EditableButton key={i} path={`buttons.${i}`} />
      ))}
    </div>
  );
}

export function Gallery() {
  const section = useSection();
  const { edit } = useRender();
  const p = section.props;
  const [open, setOpen] = useState<number | null>(null);
  const images: { src: string; alt?: string }[] = p.images ?? [];
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-gallery">
        {images.map((im, i) => (
          <button type="button" key={i} className="ws-gallery__item" onClick={() => !edit && p.lightbox !== false && setOpen(i)}>
            <EditableImage path={`images.${i}.src`} alt={im.alt} className="ws-gallery__img" />
          </button>
        ))}
      </div>
      {open !== null && images[open] ? (
        <div className="ws-modal ws-lightbox" onClick={() => setOpen(null)} role="dialog" aria-label="Image viewer">
          <button type="button" className="ws-lightbox__nav is-prev" onClick={(e) => (e.stopPropagation(), setOpen((open - 1 + images.length) % images.length))} aria-label="Previous">
            <Icon name="ChevronLeft" size={30} />
          </button>
          <img src={images[open].src} alt={images[open].alt ?? ""} />
          <button type="button" className="ws-lightbox__nav is-next" onClick={(e) => (e.stopPropagation(), setOpen((open + 1) % images.length))} aria-label="Next">
            <Icon name="ChevronRight" size={30} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function embedUrl(url: string): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vm = /vimeo\.com\/(\d+)/.exec(url);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.includes("/uploads/media/")) return { kind: "video", src: url };
  return null;
}

export function VideoSection() {
  const section = useSection();
  const { edit } = useRender();
  const e = embedUrl(section.props.url ?? "");
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-video">
        {!e ? (
          edit ? <div className="ws-img-placeholder"><Icon name="Video" size={30} /><span>Paste a YouTube, Vimeo or MP4 link in the settings panel</span></div> : null
        ) : e.kind === "iframe" ? (
          <iframe src={e.src} title={section.props.title || "Video"} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen style={edit ? { pointerEvents: "none" } : undefined} />
        ) : (
          <video src={e.src} controls playsInline preload="metadata" poster={section.props.poster || undefined} />
        )}
      </div>
    </div>
  );
}

export function Testimonials() {
  const section = useSection();
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-testimonials">
        {(section.props.items ?? []).map((t: any, i: number) => (
          <ItemLink key={i} index={i} className="ws-quote">
            <Stars rating={t.rating ?? 5} />
            <EditableText as="blockquote" path={`items.${i}.quote`} multiline />
            <EditableText path={`items.${i}.name`} className="ws-quote__name" />
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export function Team() {
  const section = useSection();
  const { content, navigate, mode } = useRender();
  const p = section.props;
  const bookPage = content.pages.find((x) => x.sections.some((s) => s.type === "booking-form"));
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-team">
        {content.catalog.staff.map((m) => (
          <div key={m.id} className="ws-member">
            {m.image ? <img src={m.image} alt={m.name} className="ws-member__img" loading="lazy" /> : <span className="ws-member__avatar">{initials(m.name)}</span>}
            <h3>{m.name}</h3>
            <p className="ws-member__role">{m.role}</p>
            <p className="ws-member__bio">{m.bio}</p>
            {p.showBook && bookPage ? (
              <button type="button" className="ws-btn ws-btn--outline ws-btn--sm" onClick={() => mode !== "edit" && navigate(`page:${bookPage.slug}?staff=${m.id}`)}>
                <Icon name="CalendarDays" size={16} />
                <span>Book with {m.name.split(" ")[0]}</span>
              </button>
            ) : null}
          </div>
        ))}
        {!content.catalog.staff.length ? <p className="ws-empty">Add team members in Business settings → Staff.</p> : null}
      </div>
    </div>
  );
}

export function ServicesList() {
  const section = useSection();
  const { content, navigate, mode } = useRender();
  const p = section.props;
  const currency = content.settings.currency;
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-services">
        {content.catalog.services.map((s) => (
          <article key={s.id} className="ws-service">
            {s.image ? <img src={s.image} alt={s.name} loading="lazy" className="ws-service__img" /> : <span className="ws-service__icon"><Icon name={s.icon || "Sparkles"} size={30} /></span>}
            <div className="ws-service__body">
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <div className="ws-service__meta">
                {p.showPrice && s.price ? <strong>{formatMoney(s.price, currency)}</strong> : null}
                {p.showDuration && s.durationMinutes ? <span><Icon name="Clock" size={15} /> {s.durationMinutes} min</span> : null}
              </div>
              {p.showBook ? (
                <button type="button" className="ws-btn ws-btn--primary ws-btn--sm" onClick={() => mode !== "edit" && navigate(`${p.bookHref || "page:book"}?service=${s.id}`)}>
                  <Icon name="CalendarDays" size={16} />
                  <span>Book Now</span>
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!content.catalog.services.length ? <p className="ws-empty">Add services in Business settings → Services.</p> : null}
      </div>
    </div>
  );
}

export function PricingTable() {
  const section = useSection();
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-pricing">
        {(section.props.plans ?? []).map((plan: any, i: number) => (
          <ItemLink key={i} index={i} listPath="plans" className={`ws-plan${plan.highlighted ? " is-featured" : ""}`}>
            <EditableText as="h3" path={`plans.${i}.name`} />
            <div className="ws-plan__price">
              <EditableText path={`plans.${i}.price`} className="ws-plan__amount" />
              <EditableText path={`plans.${i}.period`} className="ws-plan__period" />
            </div>
            <ul>
              {(plan.features ?? []).map((_: string, j: number) => (
                <li key={j}>
                  <Icon name="Check" size={16} />
                  <EditableText path={`plans.${i}.features.${j}`} />
                </li>
              ))}
            </ul>
            <EditableButton path={`plans.${i}.button`} className="ws-btn--block" />
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

export function Faq() {
  const section = useSection();
  const { edit } = useRender();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="ws-container ws-faq-wrap">
      <SectionHeading styleOverride="plain" />
      <div className="ws-faq">
        {(section.props.items ?? []).map((_: unknown, i: number) => (
          <div key={i} className={`ws-faq__item${open === i || edit ? " is-open" : ""}`}>
            <button type="button" className="ws-faq__q" onClick={() => !edit && setOpen(open === i ? null : i)}>
              <EditableText path={`items.${i}.q`} />
              <Icon name="ChevronDown" size={20} />
            </button>
            <div className="ws-faq__a">
              <EditableText as="p" path={`items.${i}.a`} multiline />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Events() {
  const section = useSection();
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-events">
        {(section.props.items ?? []).map((ev: any, i: number) => (
          <ItemLink key={i} index={i} className="ws-event">
            <EditableImage path={`items.${i}.image`} className="ws-event__img" />
            <div className="ws-event__body">
              <div className="ws-event__when">
                <Icon name="CalendarDays" size={16} />
                <EditableText path={`items.${i}.date`} /> · <EditableText path={`items.${i}.time`} />
              </div>
              <EditableText as="h3" path={`items.${i}.title`} />
              <EditableText as="p" path={`items.${i}.description`} multiline />
              {ev.location ? (
                <small>
                  <Icon name="MapPin" size={14} /> <EditableText path={`items.${i}.location`} />
                </small>
              ) : null}
            </div>
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

export function Stats() {
  const section = useSection();
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-stats">
        {(section.props.items ?? []).map((_: unknown, i: number) => (
          <ItemLink key={i} index={i} className="ws-stat">
            <EditableText path={`items.${i}.value`} className="ws-stat__value" />
            <EditableText path={`items.${i}.label`} className="ws-stat__label" />
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

export function SocialLinksSection() {
  return (
    <div className="ws-container ws-social-row">
      <SectionHeading styleOverride="plain" />
      <div className="ws-social-row__icons">
        <Socials size={28} />
      </div>
    </div>
  );
}

export function Countdown() {
  const section = useSection();
  const target = useMemo(() => new Date(section.props.target || Date.now()).getTime(), [section.props.target]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const parts = [
    ["Days", Math.floor(diff / 86400000)],
    ["Hours", Math.floor((diff / 3600000) % 24)],
    ["Minutes", Math.floor((diff / 60000) % 60)],
    ["Seconds", Math.floor((diff / 1000) % 60)],
  ] as const;
  return (
    <div className="ws-container ws-countdown">
      <SectionHeading />
      <div className="ws-countdown__grid">
        {parts.map(([label, value]) => (
          <div key={label} className="ws-countdown__cell">
            <strong>{String(value).padStart(2, "0")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {diff === 0 ? <EditableText as="p" path="endedText" className="ws-muted" /> : null}
    </div>
  );
}

export function BlogPosts() {
  const section = useSection();
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className="ws-events">
        {(section.props.posts ?? []).map((_: any, i: number) => (
          <ItemLink key={i} index={i} listPath="posts" className="ws-event">
            <EditableImage path={`posts.${i}.image`} className="ws-event__img" />
            <div className="ws-event__body">
              <small><EditableText path={`posts.${i}.date`} /></small>
              <EditableText as="h3" path={`posts.${i}.title`} />
              <EditableText as="p" path={`posts.${i}.excerpt`} multiline />
            </div>
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

export function Hours() {
  const section = useSection();
  const { content } = useRender();
  const s = content.settings;
  const p = section.props;
  return (
    <div className="ws-container ws-hours">
      <div className="ws-hours__intro">
        <EditableText as="h2" path="title" className="ws-heading__title" />
        <EditableText as="p" path="text" multiline />
        {p.showAddress ? <p className="ws-hours__line"><Icon name="MapPin" size={20} /> {s.address}</p> : null}
        {p.showPhone ? <p className="ws-hours__line"><Icon name="Phone" size={20} /> <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>{s.phone}</a></p> : null}
      </div>
      <dl className="ws-hours__table">
        {s.hours.map((h, i) => (
          <div key={i}>
            <dt>{h.label}</dt>
            <dd>{h.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function MapSection() {
  const section = useSection();
  const { content, edit } = useRender();
  const address = section.props.address || content.settings.address;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return (
    <div className="ws-map" style={{ height: section.props.height || 360 }}>
      <iframe title={`Map of ${address}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={edit ? { pointerEvents: "none" } : undefined} />
    </div>
  );
}

export function Spacer() {
  const section = useSection();
  return <div style={{ height: section.props.height ?? 48 }} aria-hidden="true" />;
}

/** Custom HTML is rendered inside a sandboxed iframe: scripts can never run on the published website. */
export function CustomHtml() {
  const section = useSection();
  const { edit } = useRender();
  const html = String(section.props.html ?? "");
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:system-ui,sans-serif}</style></head><body>${html}</body></html>`;
  return (
    <div className="ws-container">
      {html ? (
        <iframe className="ws-custom-html" sandbox="" srcDoc={doc} title="Custom content" style={{ height: section.props.height ?? 240, pointerEvents: edit ? "none" : undefined }} />
      ) : edit ? (
        <div className="ws-img-placeholder"><Icon name="LayoutGrid" size={26} /><span>Add HTML in the settings panel</span></div>
      ) : null}
    </div>
  );
}
