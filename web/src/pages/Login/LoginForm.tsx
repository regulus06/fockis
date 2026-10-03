import { FormEvent } from "react";
import { Link } from "react-router-dom";
import { t } from "../../i18n";
import LanguageSelector from "../../i18n/components/LanguageSelector";
import type { MfaMode } from "./loginTypes";
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
} from "./LoginIcons";
import MfaVerification from "./MfaVerification";

type Props = {
  mfaMode: MfaMode;
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  mfaCode: string;
  qrCode: string;
  mfaSecret: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCodeChange: (value: string) => void;
  onConfirmSetup: () => void;
  onVerify: () => void;
  onSwitchToSetup: () => void;
};

export default function LoginForm({
  mfaMode,
  email,
  password,
  showPassword,
  loading,
  mfaCode,
  qrCode,
  mfaSecret,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onCodeChange,
  onConfirmSetup,
  onVerify,
  onSwitchToSetup,
}: Props) {
  return (
    <div className="form-panel">
      <div className="login-language">
        <LanguageSelector />
      </div>

      <div className="form-panel__wrap">
        <div className="form-header">
          <h2>{t("login.welcomeBack")}</h2>
          <p className="form-header__sub">{t("login.signInToFockis")}</p>
          <p className="form-header__body">{t("login.formDescription")}</p>
        </div>

        {mfaMode === "login" ? (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">{t("login.email")}</label>
              <div className="input-shell">
                <span className="input-shell__icon"><IconMail /></span>
                <input
                  id="email"
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">{t("login.password")}</label>
              <div className="input-shell">
                <span className="input-shell__icon"><IconLock /></span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={
                    showPassword
                      ? t("login.hidePassword")
                      : t("login.showPassword")
                  }
                  onClick={onTogglePassword}
                  disabled={loading}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <div className="row-between">
              <Link
                to="/forgot-password"
                className="forgot-password-link"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>

            <button
              type="submit"
              className={`btn-primary${loading ? " is-loading" : ""}`}
              disabled={loading}
            >
              <span className="spinner" />
              <span className="btn-label">{t("login.signIn")}</span>
              <span className="loading-label">{t("login.signingIn")}</span>
            </button>
          </form>
        ) : (
          <MfaVerification
            mfaMode={mfaMode}
            loading={loading}
            mfaCode={mfaCode}
            qrCode={qrCode}
            mfaSecret={mfaSecret}
            onCodeChange={onCodeChange}
            onConfirmSetup={onConfirmSetup}
            onVerify={onVerify}
            onSwitchToSetup={onSwitchToSetup}
          />
        )}

        <p className="create-account">
          {t("login.noAccount")}{" "}
          <Link to="/register">{t("login.register")}</Link>
        </p>
      </div>
    </div>
  );
}
