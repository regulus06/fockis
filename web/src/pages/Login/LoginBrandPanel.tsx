import { t } from "../../i18n";
import {
  IconUsers,
  IconStore,
  IconBuilding,
  IconBriefcase,
  IconCap,
} from "./LoginIcons";

export default function LoginBrandPanel() {
  return (
    <div className="auth-panel">
      <div className="auth-panel__top">
        <div className="wordmark">
          <img
            className="wordmark__logo"
            src="/brand/fockis-icon-96.png"
            srcSet="/brand/fockis-icon-96.png 1x, /brand/fockis-icon-192.png 2x"
            alt=""
            width={44}
            height={44}
          />
          <span className="wordmark__brand">FOCKIS</span>
        </div>
      </div>

      <div className="auth-panel__hero">
        <p className="auth-panel__eyebrow">{t("login.heroEyebrow")}</p>
        <h1>{t("login.welcomeBack")}</h1>
        <p className="auth-panel__body">{t("login.heroDescription")}</p>
      </div>

      <div className="ecosystem">
        <div className="ecosystem__label">{t("login.exploreFockis")}</div>

        <div className="constellation">
          <div className="node">
            <div className="node__dot"><IconUsers /></div>
            <div className="node__label">{t("login.social")}</div>
          </div>

          <div className="node">
            <div className="node__dot"><IconStore /></div>
            <div className="node__label">{t("login.marketplace")}</div>
          </div>

          <div className="node">
            <div className="node__dot"><IconBuilding /></div>
            <div className="node__label">{t("login.realEstate")}</div>
          </div>

          <div className="node">
            <div className="node__dot"><IconBriefcase /></div>
            <div className="node__label">{t("login.careers")}</div>
          </div>

          <div className="node">
            <div className="node__dot"><IconCap /></div>
            <div className="node__label">{t("login.academy")}</div>
          </div>
        </div>
      </div>

      <div className="trust-note">
        <strong>{t("login.connectedTitle")}</strong>
        <span>{t("login.connectedDescription")}</span>
      </div>
    </div>
  );
}
