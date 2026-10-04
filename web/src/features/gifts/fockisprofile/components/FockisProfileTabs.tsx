import type {
  ProfileTab,
} from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfileTabs.scss";

interface Props {
  activeTab: ProfileTab;

  onChange: (
    tab: ProfileTab
  ) => void;
}

const tabs: {
  id: ProfileTab;
  label: string;
}[] = [
  {
    id: "posts",
    label: "Posts",
  },
  {
    id: "about",
    label: "About",
  },
  {
    id: "friends",
    label: "Friends",
  },
  {
    id: "photos",
    label: "Photos",
  },
  {
    id: "marketplace",
    label: "Marketplace",
  },
];

export default function FockisProfileTabs({
  activeTab,
  onChange,
}: Props) {
  return (
    <nav
      className="fk-profile-tabs"
      aria-label="Profile sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={
            activeTab === tab.id
              ? "is-active"
              : ""
          }
          onClick={() =>
            onChange(tab.id)
          }
          aria-selected={
            activeTab === tab.id
          }
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
