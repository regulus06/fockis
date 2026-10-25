import {
  type KeyboardEvent,
  useRef,
} from "react";

import {
  Clapperboard,
  Images,
  LayoutGrid,
  ShoppingBag,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { ProfileTab } from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfileTabs.scss";

interface Props {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  /** Optional counts shown beside a tab label. */
  counts?: Partial<Record<ProfileTab, number>>;
  /** Id prefix used to link tabs to their panel (aria-controls). */
  idPrefix?: string;
}

const TABS: {
  id: ProfileTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "posts", label: "Posts", icon: LayoutGrid },
  { id: "about", label: "About", icon: UserRound },
  { id: "photos", label: "Photos", icon: Images },
  { id: "videos", label: "Waves", icon: Clapperboard },
  { id: "friends", label: "Friends", icon: Users },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
];

export default function FockisProfileTabs({
  activeTab,
  onChange,
  counts,
  idPrefix = "fk-profile",
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);

  function focusTab(index: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    if (!buttons || buttons.length === 0) return;
    const target = buttons[(index + buttons.length) % buttons.length];
    target.focus();
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    onChange(TABS[(index + TABS.length) % TABS.length].id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = TABS.findIndex((tab) => tab.id === activeTab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TABS.length - 1);
    }
  }

  return (
    <div
      ref={listRef}
      className="fk-profile-tabs"
      role="tablist"
      aria-label="Profile sections"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        const count = counts?.[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            className={`fk-profile-tabs__tab${selected ? " is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={17} aria-hidden={true} />
            <span>{tab.label}</span>
            {typeof count === "number" && count > 0 && (
              <span className="fk-profile-tabs__count">{count > 999 ? "999+" : count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
