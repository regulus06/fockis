import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import HelpShell from "../../support/components/HelpShell";
import { POLICY_TABS } from "./PolicyUi";

import "../styles/PolicyCenter.scss";

/** Banner illustration: policy document, padlock and the Fockis shield. */
export function PolicyArt() {
  return (
    <svg className="fk-pol-hero__art" viewBox="0 0 380 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="polDoc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe9fb" />
        </linearGradient>
        <linearGradient id="polShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4d8dff" />
          <stop offset="1" stopColor="#1452d8" />
        </linearGradient>
        <linearGradient id="polBig" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b9bff" />
          <stop offset="1" stopColor="#1a4fd6" />
        </linearGradient>
        <linearGradient id="polLock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8db8ff" />
          <stop offset="1" stopColor="#3f78e8" />
        </linearGradient>
        <filter id="polShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1d4fbf" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* document */}
      <g filter="url(#polShadow)">
        <path d="M22 18h96l26 26v112H22z" fill="url(#polDoc)" stroke="#c5d8f8" strokeWidth="2" />
        <path d="M118 18v26h26" fill="#e9f0fd" stroke="#c5d8f8" strokeWidth="2" />
      </g>
      <rect x="40" y="46" width="54" height="7" rx="3.5" fill="#3d7cf0" />
      <rect x="40" y="62" width="70" height="6" rx="3" fill="#b9cdf3" />
      <rect x="40" y="76" width="62" height="6" rx="3" fill="#b9cdf3" />
      <rect x="40" y="90" width="44" height="6" rx="3" fill="#b9cdf3" />
      <rect x="40" y="104" width="56" height="6" rx="3" fill="#b9cdf3" />

      {/* small shield with check over the document */}
      <g filter="url(#polShadow)">
        <path d="M118 66l34 12v26c0 22-15 36-34 44-19-8-34-22-34-44V78z" fill="url(#polShield)" stroke="#ffffff" strokeWidth="3" />
        <path d="M103 106l11 11 21-23" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* padlock */}
      <g filter="url(#polShadow)">
        <path d="M184 92v-14a20 20 0 0 1 40 0v14" fill="none" stroke="#9fc2ff" strokeWidth="9" strokeLinecap="round" />
        <rect x="172" y="90" width="64" height="58" rx="12" fill="url(#polLock)" />
        <circle cx="204" cy="112" r="7" fill="#1846b8" />
        <rect x="200.5" y="114" width="7" height="16" rx="3.5" fill="#1846b8" />
      </g>

      {/* Fockis shield */}
      <g filter="url(#polShadow)">
        <path d="M300 6l62 20v44c0 40-27 64-62 78-35-14-62-38-62-78V26z" fill="url(#polBig)" stroke="#ffffff" strokeWidth="4" />
        <path d="M300 22l46 15v33c0 30-20 48-46 59-26-11-46-29-46-59V37z" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />
        <path d="M288 48c0-6 4-10 10-10h26v13h-22v13h18v13h-18v26h-14z" fill="#ffffff" />
      </g>
    </svg>
  );
}

export default function PolicyShell({ children }: { children: ReactNode }) {
  const tabs = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();
  // Keep the active tab visible when the row scrolls (phones, tablets).
  useEffect(() => {
    const active = tabs.current?.querySelector<HTMLElement>(".fk-pol-tab.is-active");
    if (active && tabs.current && tabs.current.scrollWidth > tabs.current.clientWidth) {
      tabs.current.scrollLeft = active.offsetLeft - tabs.current.clientWidth / 2 + active.offsetWidth / 2;
    }
  }, [pathname]);

  return (
    <HelpShell>
      <div className="fk-pol">
        <header className="fk-pol-hero">
          <span className="fk-pol-hero__badge" aria-hidden="true">
            <ShieldCheck size={68} strokeWidth={1.8} />
          </span>
          <div className="fk-pol-hero__copy">
            <h1>Policy, Privacy &amp; Safety</h1>
            <p>Understand our policies, manage your privacy, control your data, and keep your Fockis account safe.</p>
          </div>
          <PolicyArt />
        </header>

        <nav ref={tabs} className="fk-pol-tabs" aria-label="Policy, Privacy & Safety sections">
          {POLICY_TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `fk-pol-tab${isActive ? " is-active" : ""}`}>
              <Icon size={19} strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="fk-pol-body">{children}</div>
      </div>
    </HelpShell>
  );
}
