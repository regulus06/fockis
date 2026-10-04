import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Portal } from "./Overlay";
import { cx } from "../../utils/format";

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Draws a separator above this item. */
  separated?: boolean;
}

interface ActionMenuProps {
  items: MenuItem[];
  label?: string;
  trigger?: "dots" | "button";
  buttonLabel?: string;
}

/**
 * Accessible dropdown rendered in a portal with fixed positioning, so it is
 * never clipped by scrolling table containers.
 */
export function ActionMenu({ items, label = "More actions", trigger = "dots", buttonLabel }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const menuWidth = 208;
    const estHeight = items.length * 36 + 12;
    const below = r.bottom + 6 + estHeight < window.innerHeight;
    setPos({
      top: below ? r.bottom + 6 : Math.max(8, r.top - estHeight - 6),
      left: Math.min(Math.max(8, r.right - menuWidth), window.innerWidth - menuWidth - 8),
    });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    const close = (e: Event) => {
      if (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const all = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
        const i = all.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (i + 1) % all.length : (i - 1 + all.length) % all.length;
        all[next]?.focus();
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={trigger === "dots" ? "fm-iconbtn" : "fm-btn fm-btn--secondary fm-btn--md"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trigger === "dots" ? label : undefined}
        title={trigger === "dots" ? label : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {trigger === "dots" ? <Icon name="more" /> : <><span>{buttonLabel ?? label}</span><Icon name="chevronDown" size={15} /></>}
      </button>
      {open && (
        <Portal>
          <div ref={menu} className="fm-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cx("fm-menu__item", item.danger && "is-danger", item.separated && "is-separated")}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon && <Icon name={item.icon} size={16} />}
                {item.label}
              </button>
            ))}
          </div>
        </Portal>
      )}
    </>
  );
}
