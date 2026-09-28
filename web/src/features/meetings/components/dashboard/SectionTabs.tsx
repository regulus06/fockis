import '../../styles/components/dashboard.scss';

interface SectionTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function SectionTabs({ tabs, active, onChange }: SectionTabsProps) {
  return (
    <div className="fm-section-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          className={`fm-section-tabs__tab ${active === tab ? 'fm-section-tabs__tab--active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
