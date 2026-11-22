import React from "react";
import { Icon } from "../icons";
import { useRender, useSection } from "../context";
import { EditableButton, EditableImage, EditableText, SectionHeading, SiteLink } from "../editable";
import { useCart } from "../../runtime/cart";

/** Click target for one item of a list; selects it in the editor, follows the link on the site. */
export function ItemLink({
  index,
  href,
  className,
  children,
  listPath = "items",
}: {
  index: number;
  href?: string;
  className?: string;
  children: React.ReactNode;
  listPath?: string;
}) {
  const section = useSection();
  const { edit } = useRender();
  if (edit) {
    const selected = edit.selection?.sectionId === section.id && edit.selection?.path === `${listPath}.${index}`;
    return (
      <div
        className={`${className ?? ""} ws-editable-item${selected ? " is-selected" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          edit.select({ sectionId: section.id, path: `${listPath}.${index}`, kind: "list-item" });
        }}
      >
        {children}
      </div>
    );
  }
  if (!href) return <div className={className}>{children}</div>;
  return (
    <SiteLink href={href} className={className}>
      {children}
    </SiteLink>
  );
}

export function FeaturesStrip() {
  const section = useSection();
  const p = section.props;
  return (
    <div className={`ws-container ws-features ws-features--${section.variant ?? "strip"}${p.dividers ? " has-dividers" : ""}`}>
      {(p.items ?? []).map((it: any, i: number) => (
        <ItemLink key={i} index={i} className="ws-features__item">
          <span className="ws-features__icon" style={p.iconColor ? { color: p.iconColor } : undefined}>
            <Icon name={it.icon} size={46} strokeWidth={1.5} />
          </span>
          <span className="ws-features__text">
            <EditableText path={`items.${i}.title`} className="ws-features__title" />
            <EditableText path={`items.${i}.text`} className="ws-features__desc" />
          </span>
        </ItemLink>
      ))}
    </div>
  );
}

export function CategoryCards() {
  const section = useSection();
  const p = section.props;
  const variant = section.variant ?? "caption-below";
  const barStyle: React.CSSProperties = {};
  if (p.barColor) barStyle.background = p.barColor;
  if (p.barTextColor) barStyle.color = p.barTextColor;
  return (
    <div className="ws-container">
      <SectionHeading />
      <div className={`ws-cards ws-cards--${variant}`}>
        {(p.items ?? []).map((it: any, i: number) => (
          <ItemLink key={i} index={i} href={it.href} className="ws-card">
            <div className="ws-card__media">
              <EditableImage path={`items.${i}.image`} alt={it.label} className="ws-card__img" />
            </div>
            <div className="ws-card__caption" style={variant === "caption-bar" ? barStyle : undefined}>
              {variant === "caption-bar" && it.icon ? <Icon name={it.icon} size={26} strokeWidth={1.7} /> : null}
              <EditableText path={`items.${i}.label`} className="ws-card__label" />
              {variant === "caption-below" ? <Icon name="ArrowRight" size={22} strokeWidth={1.7} className="ws-card__arrow" /> : null}
            </div>
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

export function CategoryTiles() {
  const section = useSection();
  const p = section.props;
  return (
    <div className="ws-container">
      <SectionHeading styleOverride="plain" />
      <div className="ws-tiles">
        {(p.items ?? []).map((it: any, i: number) => (
          <ItemLink key={i} index={i} href={it.href} className="ws-tile">
            <EditableImage path={`items.${i}.image`} alt={it.label} className="ws-tile__img" />
            <EditableText path={`items.${i}.label`} className="ws-tile__label" />
          </ItemLink>
        ))}
      </div>
    </div>
  );
}

export function PromoBanner() {
  const section = useSection();
  const { content, mode } = useRender();
  const cart = useCart();
  const p = section.props;
  const variant = section.variant ?? "simple";
  const product = p.productId ? content.catalog.products.find((x) => x.id === p.productId) : undefined;
  const addSpecial =
    product && content.settings.features.cart && mode !== "edit"
      ? () => cart.add({ kind: "product", productId: product.id, name: product.name, image: product.image, unitPrice: product.price, quantity: 1 })
      : undefined;

  const title =
    p.titleParts?.length === 2 ? (
      <h2 className="ws-promo__title">
        <EditableText path="titleParts.0" className="ws-promo__title-a" /> <EditableText path="titleParts.1" className="ws-promo__title-b" />
      </h2>
    ) : (
      <EditableText as="h2" path="title" className="ws-promo__title" />
    );

  return (
    <div className={`ws-promo ws-promo--${variant}`}>
      <div className="ws-promo__media">
        <EditableImage path="image" className="ws-promo__img" />
        {variant === "split-gold" ? <span className="ws-promo__stripe" aria-hidden="true" /> : null}
      </div>
      <div className="ws-promo__body">
        <div className="ws-promo__copy">
          {p.scriptTitle ? <EditableText as="p" path="scriptTitle" className="ws-promo__script" /> : null}
          {title}
          <EditableText as="p" path="text" className="ws-promo__text" multiline />
        </div>
        {p.price ? (
          <>
            <span className="ws-promo__divider" aria-hidden="true" />
            <EditableText path="price" className="ws-promo__price" />
          </>
        ) : null}
        <span className="ws-promo__divider ws-promo__divider--btn" aria-hidden="true" />
        <EditableButton path="button" className="ws-promo__btn" defaultStyle="accent" onAction={addSpecial} />
      </div>
    </div>
  );
}
