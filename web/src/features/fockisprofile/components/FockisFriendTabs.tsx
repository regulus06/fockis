import React from "react";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export default function FockisFriendTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="fk-friend-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`fk-friend-tabs__tab ${
            active === tab.key ? "fk-friend-tabs__tab--active" : ""
          }`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}

          {typeof tab.count === "number" && tab.count > 0 && (
            <span className="fk-friend-tabs__count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}