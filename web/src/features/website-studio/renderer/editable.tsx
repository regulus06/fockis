import React, { useLayoutEffect, useRef } from "react";
import { Icon } from "./icons";
import { useRender, useSection } from "./context";
import { elementStyleToCss, getPath } from "./theme";

type Tag = keyof React.JSX.IntrinsicElements;

/**
 * Text bound to a path inside the current section's props.
 * Edit mode: click selects it, typing edits it in place, blur commits.
 */
export function EditableText({
  path,
  as = "span",
  className,
  fallback = "",
  multiline = false,
  style,
}: {
  path: string;
  as?: Tag;
  className?: string;
  fallback?: string;
  multiline?: boolean;
  style?: React.CSSProperties;
}) {
  const section = useSection();
  const { edit } = useRender();
  const raw = getPath(section.props, path);
  const value = raw == null ? fallback : String(raw);
  const es = elementStyleToCss(section.elementStyles?.[path]);
  const ref = useRef<HTMLElement | null>(null);
  const Comp = as as any;

  const selected = !!edit && edit.selection?.sectionId === section.id && edit.selection?.path === path;

  // keep DOM text in sync when value changes from the properties panel (but not while typing)
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.ownerDocument.activeElement !== el && el.innerText !== value) {
      el.innerText = value;
    }
  });

  if (!edit) {
    if (!value) return null;
    return (
      <Comp className={className} style={{ ...style, ...es }}>
        {value}
      </Comp>
    );
  }

  return (
    <Comp
      ref={ref}
      className={`${className ?? ""} ws-editable${selected ? " is-selected" : ""}${!value ? " is-empty" : ""}`}
      style={{ ...style, ...es }}
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Type here…"
      spellCheck
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        edit.select({ sectionId: section.id, path, kind: "text" });
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
        if (e.key === "Escape") (e.target as HTMLElement).blur();
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.innerText.replace(/ /g, " ");
        const clean = multiline ? next.replace(/\n{3,}/g, "\n\n") : next.replace(/\s*\n\s*/g, " ");
        if (clean !== value) edit.updateProp(section.id, path, clean.trimEnd());
      }}
    />
  );
}

/** Image bound to a section prop path. */
export function EditableImage({
  path,
  alt,
  className,
  style,
  loading = "lazy",
}: {
  path: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
}) {
  const section = useSection();
  const { edit } = useRender();
  const src = getPath(section.props, path) as string | undefined;
  const altText = (getPath(section.props, `${path}Alt`) as string | undefined) ?? alt ?? "";
  const es = elementStyleToCss(section.elementStyles?.[path]);
  const selected = !!edit && edit.selection?.sectionId === section.id && edit.selection?.path === path;

  if (!src) {
    if (!edit) return null;
    return (
      <div
        className={`${className ?? ""} ws-img-placeholder${selected ? " is-selected" : ""}`}
        style={{ ...style, ...es }}
        onClick={(e) => {
          e.stopPropagation();
          edit.select({ sectionId: section.id, path, kind: "image" });
        }}
      >
        <Icon name="Camera" size={28} />
        <span>Add image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={altText}
      loading={loading}
      decoding="async"
      className={`${className ?? ""}${edit ? " ws-editable-img" : ""}${selected ? " is-selected" : ""}`}
      style={{ ...style, ...es }}
      onClick={
        edit
          ? (e) => {
              e.stopPropagation();
              e.preventDefault();
              edit.select({ sectionId: section.id, path, kind: "image" });
            }
          : undefined
      }
      draggable={false}
    />
  );
}

export interface ButtonData {
  label: string;
  href?: string;
  icon?: string;
  iconRight?: boolean;
  style?: string;
}

/** Button bound to a section prop path (object with label/href/icon/style). */
export function EditableButton({
  path,
  className = "",
  defaultStyle = "primary",
  onAction,
}: {
  path: string;
  className?: string;
  defaultStyle?: string;
  onAction?: () => void;
}) {
  const section = useSection();
  const { edit, navigate, resolveHref } = useRender();
  const data = getPath(section.props, path) as ButtonData | undefined;
  if (!data || !data.label) return null;
  const es = section.elementStyles?.[path];
  const css = elementStyleToCss(es);
  const variant = data.style || defaultStyle;
  const selected = !!edit && edit.selection?.sectionId === section.id && edit.selection?.path === path;
  const cls = [
    "ws-btn",
    `ws-btn--${variant}`,
    es?.size ? `ws-btn--${es.size}` : "",
    es?.shape ? `ws-btn--shape-${es.shape}` : "",
    es?.hoverEffect && es.hoverEffect !== "none" ? `ws-hover-${es.hoverEffect}` : "",
    className,
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {data.icon && !data.iconRight ? <Icon name={data.icon} size={20} /> : null}
      <span>{data.label}</span>
      {data.icon && data.iconRight ? <Icon name={data.icon} size={20} /> : null}
    </>
  );
  if (edit) {
    return (
      <button
        type="button"
        className={`${cls} ws-editable-btn`}
        style={css}
        onClick={(e) => {
          e.stopPropagation();
          edit.select({ sectionId: section.id, path, kind: "button" });
        }}
      >
        {content}
      </button>
    );
  }
  const href = data.href ? resolveHref(data.href) : "#";
  return (
    <a
      className={cls}
      style={css}
      href={href}
      target={/^https?:/.test(data.href ?? "") ? "_blank" : undefined}
      rel={/^https?:/.test(data.href ?? "") ? "noopener noreferrer" : undefined}
      onClick={(e) => {
        if (onAction) {
          e.preventDefault();
          onAction();
          return;
        }
        if (data.href && data.href.startsWith("page:")) {
          e.preventDefault();
          navigate(data.href);
        }
      }}
    >
      {content}
    </a>
  );
}

/** Internal link that works in edit (navigates editor), preview and live modes. */
export function SiteLink({
  href,
  className,
  children,
  style,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const { navigate, resolveHref } = useRender();
  const external = /^https?:/.test(href);
  return (
    <a
      href={resolveHref(href)}
      className={className}
      style={style}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={(e) => {
        onClick?.();
        if (href.startsWith("page:") || href === "" || href.startsWith("/")) {
          e.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}

/** Heading block with optional eyebrow lines, used by many sections. */
export function SectionHeading({
  eyebrowPath = "eyebrow",
  titlePath = "title",
  bodyPath,
  styleOverride,
}: {
  eyebrowPath?: string;
  titlePath?: string;
  bodyPath?: string;
  styleOverride?: string;
}) {
  const section = useSection();
  const { edit } = useRender();
  const eyebrow = getPath(section.props, eyebrowPath);
  const title = getPath(section.props, titlePath);
  const body = bodyPath ? getPath(section.props, bodyPath) : "";
  const style = styleOverride ?? section.props.headingStyle ?? "lines";
  if (!edit && !eyebrow && !title && !body) return null;
  return (
    <div className={`ws-heading ws-heading--${style}`}>
      {eyebrow && style !== "side-lines" ? (
        <div className="ws-heading__eyebrow">
          {style === "lines" ? <span className="ws-line" /> : null}
          <EditableText path={eyebrowPath} />
          {style === "lines" ? <span className="ws-line" /> : null}
        </div>
      ) : null}
      {title || edit ? (
        <div className="ws-heading__title-row">
          {style === "side-lines" ? <span className="ws-line ws-line--long" /> : null}
          <EditableText as="h2" path={titlePath} className="ws-heading__title" />
          {style === "side-lines" ? <span className="ws-line ws-line--long" /> : null}
        </div>
      ) : null}
      {bodyPath && (body || edit) ? <EditableText as="p" path={bodyPath} className="ws-heading__body" multiline /> : null}
    </div>
  );
}
