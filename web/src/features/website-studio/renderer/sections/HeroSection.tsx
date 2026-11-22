import React, { useEffect, useState } from "react";
import { Icon } from "../icons";
import { useRender, useSection } from "../context";
import { EditableButton, EditableImage, EditableText } from "../editable";

function Eyebrow() {
  const section = useSection();
  const { edit } = useRender();
  const p = section.props;
  if (p.eyebrowStyle === "icon-lines" && p.eyebrowIcon) {
    return (
      <div className="ws-hero__eyebrow ws-hero__eyebrow--icon">
        <span className="ws-line" />
        <Icon name={p.eyebrowIcon} size={40} strokeWidth={1.6} />
        <span className="ws-line" />
      </div>
    );
  }
  if (p.eyebrow) {
    return (
      <div className="ws-hero__eyebrow ws-hero__eyebrow--text">
        {p.eyebrowStyle === "text-lines" ? <span className="ws-line" /> : null}
        <EditableText path="eyebrow" />
        {p.eyebrowStyle === "text-lines" ? <span className="ws-line" /> : null}
      </div>
    );
  }
  return null;
}

function Title() {
  const section = useSection();
  const { edit } = useRender();
  const p = section.props;
  const accent = p.titleAccent ? (
    <>
      {p.titleAccentPrefix ? <EditableText path="titleAccentPrefix" className="ws-hero__accent-prefix" /> : null}
      <EditableText path="titleAccent" className={`ws-hero__accent ws-hero__accent--${p.accentStyle ?? "script"}`} />
    </>
  ) : null;
  return (
    <h1 className={`ws-hero__title${p.accentInline ? " is-inline" : ""}`}>
      {p.preTitle ? <EditableText path="preTitle" className="ws-hero__pretitle" /> : null}
      <EditableText path="title" className="ws-hero__main" />
      {p.accentInline ? " " : null}
      {accent ? <span className="ws-hero__accent-wrap">{accent}</span> : null}
    </h1>
  );
}

export default function HeroSection() {
  const section = useSection();
  const { edit } = useRender();
  const p = section.props;
  const variant = section.variant ?? "split";
  const images: string[] = (p.images?.length ? p.images : p.image ? [p.image] : []).filter(Boolean);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (edit || images.length < 2) return;
    const t = window.setInterval(() => setSlide((s) => (s + 1) % images.length), 6000);
    return () => window.clearInterval(t);
  }, [edit, images.length]);

  const current = images[slide % Math.max(images.length, 1)];
  const imagePath = slide === 0 || !p.images?.length ? "image" : `images.${slide}`;
  const move = (d: number) => setSlide((s) => (s + d + images.length) % images.length);

  const copy = (
    <div className={`ws-hero__copy ws-hero__copy--${p.contentAlign ?? "left"}`}>
      <Eyebrow />
      <Title />
      {p.decorBelowTitle ? (
        <div className="ws-hero__decor">
          <span className="ws-line" />
          <Icon name={p.decorBelowTitle} size={40} strokeWidth={1.5} />
          <span className="ws-line" />
        </div>
      ) : null}
      {p.tagline ? <EditableText as="p" path="tagline" className="ws-hero__tagline" /> : null}
      <EditableText as="p" path="subtitle" className="ws-hero__subtitle" multiline />
      {p.badges?.length ? (
        <div className="ws-hero__badges">
          {p.badges.map((b: any, i: number) => (
            <span key={i} className="ws-hero__badge">
              <Icon name={b.icon} size={26} strokeWidth={1.6} />
              <EditableText path={`badges.${i}.text`} />
            </span>
          ))}
        </div>
      ) : null}
      <div className="ws-hero__buttons">
        {(p.buttons ?? []).map((_: unknown, i: number) => (
          <EditableButton key={i} path={`buttons.${i}`} className="ws-hero__btn" />
        ))}
      </div>
    </div>
  );

  const media = (
    <div className="ws-hero__media">
      {current || edit ? (
        current && imagePath === "image" ? (
          <EditableImage path="image" className="ws-hero__img" loading="eager" />
        ) : current ? (
          <img src={current} alt="" className="ws-hero__img" />
        ) : (
          <EditableImage path="image" className="ws-hero__img" />
        )
      ) : (
        <div className="ws-hero__blob" aria-hidden="true" />
      )}
    </div>
  );

  return (
    <div className={`ws-hero ws-hero--${variant}`}>
      {variant === "bakery" && p.decorImage ? (
        <div className="ws-hero__decor-img" aria-hidden="true">
          <EditableImage path="decorImage" loading="eager" />
        </div>
      ) : null}
      {variant === "split" ? (
        <div className="ws-container ws-hero__grid">
          {copy}
          {media}
        </div>
      ) : (
        <>
          {media}
          <div className="ws-hero__shade" aria-hidden="true" />
          <div className="ws-container ws-hero__inner">{copy}</div>
        </>
      )}
      {p.showArrows && images.length > 1 ? (
        <>
          <button type="button" className="ws-hero__arrow ws-hero__arrow--prev" onClick={() => move(-1)} aria-label="Previous slide">
            <Icon name="ChevronLeft" size={26} strokeWidth={2.2} />
          </button>
          <button type="button" className="ws-hero__arrow ws-hero__arrow--next" onClick={() => move(1)} aria-label="Next slide">
            <Icon name="ChevronRight" size={26} strokeWidth={2.2} />
          </button>
        </>
      ) : null}
      {images.length > 1 ? (
        <div className="ws-hero__dots">
          {images.map((_, i) => (
            <button type="button" key={i} className={i === slide ? "is-active" : ""} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
