import { LayoutGrid, MoreHorizontal } from "lucide-react";

import type { BusinessCategory } from "../../types/business.types";
import { BUSINESS_CATEGORIES } from "../../utils/businessUtils";

interface Props {
  value: BusinessCategory | undefined;
  onChange: (category: BusinessCategory | undefined) => void;
}

const SHORT_LABELS: Partial<Record<BusinessCategory, string>> = {
  PROFESSIONAL_SERVICES: "Professional Services",
  HOME_SERVICES: "Home Services",
};

/**
 * All · the 14 backend categories · More (= Other / Company). Every tile
 * filters the directory through GET /businesses?category=.
 */
export default function BusinessCategoryBar({ value, onChange }: Props) {
  const tiles = BUSINESS_CATEGORIES.filter((item) => item.value !== "OTHER");

  const onKeyDown = (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (keyEvent.key !== "ArrowRight" && keyEvent.key !== "ArrowLeft") return;

    const buttons = Array.from(keyEvent.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (index === -1) return;

    keyEvent.preventDefault();
    buttons[(index + (keyEvent.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div className="fkbd-cats" role="toolbar" aria-label="Business categories" onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`fkbd-cat ${!value ? "is-active" : ""}`}
        aria-pressed={!value}
        onClick={() => onChange(undefined)}
      >
        <LayoutGrid size={22} strokeWidth={1.8} aria-hidden="true" />
        <span>All</span>
      </button>

      {tiles.map(({ value: id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`fkbd-cat ${value === id ? "is-active" : ""}`}
          aria-pressed={value === id}
          onClick={() => onChange(value === id ? undefined : id)}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{SHORT_LABELS[id] ?? label}</span>
        </button>
      ))}

      <button
        type="button"
        className={`fkbd-cat ${value === "OTHER" ? "is-active" : ""}`}
        aria-pressed={value === "OTHER"}
        title="Other businesses and companies"
        onClick={() => onChange(value === "OTHER" ? undefined : "OTHER")}
      >
        <MoreHorizontal size={22} strokeWidth={2.2} aria-hidden="true" />
        <span>More</span>
      </button>
    </div>
  );
}
