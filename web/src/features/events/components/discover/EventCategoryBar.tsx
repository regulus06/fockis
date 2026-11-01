import { useEffect, useId, useRef, useState } from "react";
import { LayoutGrid, MoreHorizontal } from "lucide-react";

import { EVENT_CATEGORIES } from "../../constants/eventCategories";
import type { EventCategory } from "../../types/event.types";

interface Props {
  value: EventCategory | "";
  onChange: (category: EventCategory | "") => void;
}

const PRIMARY: EventCategory[] = ["music", "business", "education", "sports", "food", "technology", "arts", "community"];

/**
 * All · eight primary categories · More (every other category in a
 * popover). Arrow keys move between tiles; the bar scrolls on small screens.
 */
export default function EventCategoryBar({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuId = useId();
  const moreRef = useRef<HTMLDivElement>(null);
  const primary = PRIMARY.map((id) => EVENT_CATEGORIES.find((item) => item.value === id)!).filter(Boolean);
  const others = EVENT_CATEGORIES.filter((item) => !PRIMARY.includes(item.value));
  const activeOther = others.find((item) => item.value === value);

  // The bar scrolls horizontally (which clips absolutely-positioned
  // children), so the popover is fixed and placed under the More tile.
  useEffect(() => {
    if (!open) return;

    const place = () => {
      const rect = moreRef.current?.getBoundingClientRect();

      if (!rect) return;

      const width = 220;

      setMenuPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }

      if (!moreRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const onKeyDown = (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (keyEvent.key !== "ArrowRight" && keyEvent.key !== "ArrowLeft") return;

    const tiles = Array.from(keyEvent.currentTarget.querySelectorAll<HTMLButtonElement>(".fkd-cat"));
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement);

    if (index === -1) return;

    keyEvent.preventDefault();
    tiles[(index + (keyEvent.key === "ArrowRight" ? 1 : -1) + tiles.length) % tiles.length]?.focus();
  };

  return (
    <div className="fkd-cats" role="toolbar" aria-label="Event categories" onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`fkd-cat ${value === "" ? "is-active" : ""}`}
        aria-pressed={value === ""}
        onClick={() => onChange("")}
      >
        <LayoutGrid size={24} strokeWidth={1.8} aria-hidden="true" />
        <span>All</span>
      </button>

      {primary.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`fkd-cat ${value === item.value ? "is-active" : ""}`}
          aria-pressed={value === item.value}
          onClick={() => onChange(value === item.value ? "" : item.value)}
        >
          <item.icon size={24} strokeWidth={1.8} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}

      <div className="fkd-cats__more" ref={moreRef}>
        <button
          type="button"
          className={`fkd-cat ${activeOther ? "is-active" : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
        >
          {activeOther ? (
            <activeOther.icon size={24} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <MoreHorizontal size={24} strokeWidth={2.2} aria-hidden="true" />
          )}
          <span>{activeOther ? activeOther.label : "More"}</span>
        </button>

        {open && (
          <div
            className="fkd-cats__menu"
            id={menuId}
            role="menu"
            aria-label="More categories"
            style={menuPos ? { top: menuPos.top, left: menuPos.left } : { visibility: "hidden" }}
          >
            {others.map((item) => (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                aria-checked={value === item.value}
                className={value === item.value ? "is-active" : ""}
                onClick={() => {
                  onChange(value === item.value ? "" : item.value);
                  setOpen(false);
                }}
              >
                <item.icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
