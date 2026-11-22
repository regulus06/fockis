import React from "react";
import { Icon } from "../icons";
import { useRender, useSection } from "../context";
import { EditableText, SiteLink } from "../editable";
import { Socials } from "./HeaderSection";

export default function FooterSection() {
  const section = useSection();
  const { content } = useRender();
  const p = section.props;
  const s = content.settings;
  const year = new Date().getFullYear();
  return (
    <div className="ws-footer">
      <div className="ws-container ws-footer__grid">
        <div className="ws-footer__brand">
          <div className="ws-footer__name">
            <Icon name={s.logoIcon} size={30} />
            <span>{s.businessName}</span>
          </div>
          <EditableText as="p" path="about" multiline />
          {p.showSocial ? (
            <div className="ws-footer__social">
              <Socials size={22} />
            </div>
          ) : null}
        </div>
        {(p.columns ?? []).map((col: any, i: number) => (
          <div key={i} className="ws-footer__col">
            <EditableText as="h4" path={`columns.${i}.title`} />
            <ul>
              {(col.links ?? []).map(([label, href]: [string, string], j: number) => (
                <li key={j}>
                  <SiteLink href={href}>{label}</SiteLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {p.showContact ? (
          <div className="ws-footer__col">
            <h4>Contact</h4>
            <ul className="ws-footer__contact">
              <li><Icon name="MapPin" size={16} /> {s.address}</li>
              <li><Icon name="Phone" size={16} /> <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}>{s.phone}</a></li>
              <li><Icon name="Mail" size={16} /> <a href={`mailto:${s.email}`}>{s.email}</a></li>
            </ul>
          </div>
        ) : null}
        {p.showHours ? (
          <div className="ws-footer__col">
            <h4>Hours</h4>
            <ul>
              {s.hours.map((h, i) => (
                <li key={i} className="ws-footer__hours">
                  <span>{h.label}</span>
                  <span>{h.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="ws-footer__bottom">
        <div className="ws-container">
          <span>{String(p.copyright ?? "").replace("{year}", String(year))}</span>
          <span className="ws-footer__powered">Built with Fockis Website Studio</span>
        </div>
      </div>
    </div>
  );
}
