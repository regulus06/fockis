import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Check, Moon, MonitorSmartphone, Palette, Sun } from "lucide-react";

import { useFockisTheme, type FockisTheme } from "../../../context/ThemeContext";
import { t } from "../../../i18n";
import "./AppearanceSettings.scss";

/* ============================================================================
   SETTINGS → APPEARANCE (Lumière / Sombre)
   Two preview cards plus "Follow device theme". Changing it applies to the
   whole app at once (ThemeContext → <html data-fk-theme>), is saved, and
   survives a refresh. /settings/appearance scrolls here.
============================================================================ */

function Preview({ theme }: { theme: FockisTheme }) {
  return (
    <span className={`fk-appearance__preview is-${theme}`} aria-hidden="true">
      <span className="fk-appearance__preview-bar">
        <i />
        <i />
      </span>
      <span className="fk-appearance__preview-row">
        <b />
        <i />
      </span>
      <span className="fk-appearance__preview-row">
        <b />
        <i />
      </span>
    </span>
  );
}

export default function AppearanceSettings() {
  const { theme, preference, setPreference } = useFockisTheme();
  const location = useLocation();
  const ref = useRef<HTMLElement>(null);
  const followSystem = preference === "system";

  useEffect(() => {
    if (location.pathname.replace(/\/+$/, "").endsWith("/appearance")) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname]);

  const options: Array<{ value: FockisTheme; label: string; desc: string; icon: typeof Sun }> = [
    { value: "light", label: t("appearance.light"), desc: t("appearance.lightDesc"), icon: Sun },
    { value: "dark", label: t("appearance.dark"), desc: t("appearance.darkDesc"), icon: Moon },
  ];

  return (
    <section ref={ref} id="appearance" className="fk-appearance" aria-labelledby="fk-appearance-title" data-no-translate>
      <div className="fk-appearance__head">
        <span className="fk-appearance__badge" aria-hidden="true">
          <Palette size={22} />
        </span>
        <div>
          <h2 id="fk-appearance-title">{t("appearance.title")}</h2>
          <p>{t("appearance.subtitle")}</p>
        </div>
      </div>

      <div className="fk-appearance__options" role="radiogroup" aria-label={t("appearance.title")}>
        {options.map(({ value, label, desc, icon: Icon }) => {
          // With "follow device" on, the card for the theme in effect is marked.
          const selected = followSystem ? theme === value : preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`fk-appearance__option${selected ? " is-selected" : ""}`}
              onClick={() => setPreference(value)}
            >
              <Preview theme={value} />
              {selected && (
                <span className="fk-appearance__check" aria-hidden="true">
                  <Check size={16} strokeWidth={3} />
                </span>
              )}
              <span className="fk-appearance__label">
                <Icon size={18} aria-hidden="true" /> {label}
              </span>
              <span className="fk-appearance__desc">{desc}</span>
            </button>
          );
        })}
      </div>

      <label className="fk-appearance__system">
        <MonitorSmartphone size={22} aria-hidden="true" />
        <span>
          <strong>{t("appearance.system")}</strong>
          <small>{t("appearance.systemDesc")}</small>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={followSystem}
          onChange={(e) => setPreference(e.target.checked ? "system" : theme)}
        />
        <span className="fk-appearance__switch" aria-hidden="true" />
      </label>
    </section>
  );
}
