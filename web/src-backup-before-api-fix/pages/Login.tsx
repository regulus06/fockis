import "../styles/Login.scss";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import axios from "axios";

import {
  getLanguage,
  subscribeToLanguage,
  t,
} from "../i18n";

import type {
  FockisLanguage,
} from "../i18n/language";

import LanguageSelector from "../i18n/components/LanguageSelector";

import {
  setToken,
  setUserId,
} from "../utils/auth";

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

// ============================================================================
// LOGIN
// ============================================================================

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * The centralized i18n system stores the active language outside React.
   * This local state makes Login re-render when the language changes.
   */
  const [language, setCurrentLanguage] =
    useState<FockisLanguage>(getLanguage());

  // ==========================================================================
  // LANGUAGE SUBSCRIPTION
  // ==========================================================================

  useEffect(() => {
    return subscribeToLanguage((nextLanguage) => {
      setCurrentLanguage(nextLanguage);
    });
  }, []);

  // Keep the language state intentionally connected to this component's
  // render lifecycle. All actual translations come from the centralized t().
  void language;

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  const submit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    try {
      setLoading(true);

      // ======================================================================
      // LOGIN REQUEST
      // ======================================================================

      const res = await axios.post(
        `${API_BASE_URL}/auth/login`,
        {
          email: email.trim(),
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      console.log(
        "[FOCKIS AUTH] LOGIN RESPONSE:",
        res.data,
      );

      // ======================================================================
      // EXTRACT TOKEN
      // ======================================================================

      const token =
        res.data?.access_token ||
        res.data?.accessToken ||
        res.data?.token ||
        res.data?.jwt ||
        null;

      // ======================================================================
      // EXTRACT USER
      // ======================================================================

      const user =
        res.data?.user ||
        res.data?.data?.user ||
        null;

      if (
        typeof token !== "string" ||
        !token.trim()
      ) {
        console.error(
          "[FOCKIS AUTH] Backend did not return a JWT.",
          res.data,
        );

        throw new Error(
          t("login.alerts.backendJwtError"),
        );
      }

      const cleanToken = token.trim();

      // ======================================================================
      // DETERMINE USER
      // ======================================================================

      if (
        !user ||
        typeof user !== "object"
      ) {
        console.error(
          "[FOCKIS AUTH] Backend did not return a user.",
          res.data,
        );

        throw new Error(
          t("login.alerts.backendUserError"),
        );
      }

      const userId =
        user._id ||
        user.id ||
        null;

      if (
        typeof userId !== "string" ||
        !userId.trim()
      ) {
        console.error(
          "[FOCKIS AUTH] User ID missing.",
          user,
        );

        throw new Error(
          t("login.alerts.userIdError"),
        );
      }

      // ======================================================================
      // CLEAR OLD / STALE AUTHENTICATION
      // ======================================================================

      localStorage.removeItem(
        "access_token",
      );

      localStorage.removeItem(
        "accessToken",
      );

      localStorage.removeItem(
        "token",
      );

      localStorage.removeItem(
        "jwt",
      );

      localStorage.removeItem(
        "authToken",
      );

      localStorage.removeItem(
        "user",
      );

      localStorage.removeItem(
        "userId",
      );

      // ======================================================================
      // SAVE FRESH JWT
      // ======================================================================

      // Canonical Fockis authentication key.
      localStorage.setItem(
        "access_token",
        cleanToken,
      );

      // Existing application auth helper.
      setToken(cleanToken);

      // Save user ID.
      setUserId(userId);

      // Save complete user.
      localStorage.setItem(
        "user",
        JSON.stringify(user),
      );

      // ======================================================================
      // COMPATIBILITY
      // ======================================================================

      // Older parts of Fockis may still read "token".
      localStorage.setItem(
        "token",
        cleanToken,
      );

      // ======================================================================
      // VERIFY STORAGE
      // ======================================================================

      const savedAccessToken =
        localStorage.getItem(
          "access_token",
        );

      const savedToken =
        localStorage.getItem(
          "token",
        );

      const savedUser =
        localStorage.getItem(
          "user",
        );

      console.log(
        "[FOCKIS AUTH] TOKEN SAVED:",
        !!savedAccessToken,
      );

      console.log(
        "[FOCKIS AUTH] TOKEN COMPATIBILITY KEY SAVED:",
        !!savedToken,
      );

      console.log(
        "[FOCKIS AUTH] USER SAVED:",
        !!savedUser,
      );

      console.log(
        "[FOCKIS AUTH] USER ID:",
        userId,
      );

      // Never print the actual JWT.
      console.log(
        "[FOCKIS AUTH] Authentication established successfully.",
      );

      // ======================================================================
      // REDIRECT
      // ======================================================================

      const role = String(
        user.role || "",
      )
        .trim()
        .toLowerCase();

      if (
        role === "admin" ||
        role === "super_admin"
      ) {
        navigate(
          "/admin/dashboard",
          {
            replace: true,
          },
        );
      } else {
        navigate(
          "/feed",
          {
            replace: true,
          },
        );
      }
    } catch (err: unknown) {
      console.error(
        "[FOCKIS AUTH] LOGIN ERROR:",
        err,
      );

      if (
        axios.isAxiosError(err)
      ) {
        console.error(
          "[FOCKIS AUTH] SERVER RESPONSE:",
          err.response?.data,
        );
      }

      let message =
        t("login.alerts.invalidCredentials");

      if (
        axios.isAxiosError(err)
      ) {
        const serverMessage =
          err.response?.data?.message;

        if (
          Array.isArray(
            serverMessage,
          )
        ) {
          message =
            serverMessage
              .map(String)
              .join(", ");
        } else if (
          typeof serverMessage ===
            "string" &&
          serverMessage.trim()
        ) {
          message =
            serverMessage;
        } else if (
          err.response?.status === 401
        ) {
          message =
            t(
              "login.alerts.invalidCredentials",
            );
        } else if (
          err.response?.status === 400
        ) {
          message =
            t(
              "login.alerts.checkCredentials",
            );
        } else if (
          !err.response
        ) {
          message =
            t(
              "login.alerts.connectionError",
            );
        }
      } else if (
        err instanceof Error &&
        err.message
      ) {
        message = err.message;
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // UI
  // ==========================================================================

  return (
    <div className="login-page">

      {/* ================================================================== */}
      {/* LEFT: BRAND / ECOSYSTEM */}
      {/* ================================================================== */}

      <div className="auth-panel">

        <div className="auth-panel__top">
          <div className="wordmark">
            <span className="wordmark__brand">
              FOCKIS
            </span>
          </div>
        </div>

        <div className="auth-panel__hero">
          <p className="auth-panel__eyebrow">
            {t("login.heroEyebrow")}
          </p>

          <h1>
            {t("login.welcomeBack")}
          </h1>

          <p className="auth-panel__body">
            {t("login.heroDescription")}
          </p>
        </div>

        {/* ================================================================ */}
        {/* ECOSYSTEM */}
        {/* ================================================================ */}

        <div className="ecosystem">

          <div className="ecosystem__label">
            {t("login.exploreFockis")}
          </div>

          <div className="constellation">

            <div className="node">
              <div className="node__dot">
                <IconUsers />
              </div>

              <div className="node__label">
                {t("login.social")}
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconStore />
              </div>

              <div className="node__label">
                {t("login.marketplace")}
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconBuilding />
              </div>

              <div className="node__label">
                {t("login.realEstate")}
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconBriefcase />
              </div>

              <div className="node__label">
                {t("login.careers")}
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconCap />
              </div>

              <div className="node__label">
                {t("login.academy")}
              </div>
            </div>

          </div>
        </div>

        {/* ================================================================ */}
        {/* TRUST NOTE */}
        {/* ================================================================ */}

        <div className="trust-note">
          <strong>
            {t("login.connectedTitle")}
          </strong>

          <span>
            {t("login.connectedDescription")}
          </span>
        </div>

      </div>

      {/* ================================================================== */}
      {/* RIGHT: LOGIN FORM */}
      {/* ================================================================== */}

      <div className="form-panel">

        {/* ================================================================ */}
        {/* LANGUAGE SELECTOR */}
        {/* ================================================================ */}

        <div className="login-language">
          <LanguageSelector />
        </div>

        <div className="form-panel__wrap">

          <div className="form-header">

            <h2>
              {t("login.welcomeBack")}
            </h2>

            <p className="form-header__sub">
              {t("login.signInToFockis")}
            </p>

            <p className="form-header__body">
              {t("login.formDescription")}
            </p>

          </div>

          <form onSubmit={submit}>

            {/* ============================================================ */}
            {/* EMAIL */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="email">
                {t("login.email")}
              </label>

              <div className="input-shell">

                <span className="input-shell__icon">
                  <IconMail />
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder={t(
                    "login.emailPlaceholder",
                  )}
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value,
                    )
                  }
                  autoComplete="email"
                  disabled={loading}
                  required
                />

              </div>

            </div>

            {/* ============================================================ */}
            {/* PASSWORD */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="password">
                {t("login.password")}
              </label>

              <div className="input-shell">

                <span className="input-shell__icon">
                  <IconLock />
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder={t(
                    "login.passwordPlaceholder",
                  )}
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value,
                    )
                  }
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={
                    showPassword
                      ? t(
                          "login.hidePassword",
                        )
                      : t(
                          "login.showPassword",
                        )
                  }
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value,
                    )
                  }
                  disabled={loading}
                >
                  {showPassword ? (
                    <IconEyeOff />
                  ) : (
                    <IconEye />
                  )}
                </button>

              </div>

            </div>

            {/* ============================================================ */}
            {/* FORGOT PASSWORD */}
            {/* ============================================================ */}

            <div className="row-between">

              <Link
                to="/forgot-password"
                className="forgot-password-link"
              >
                {t(
                  "login.forgotPassword",
                )}
              </Link>

            </div>

            {/* ============================================================ */}
            {/* SUBMIT */}
            {/* ============================================================ */}

            <button
              type="submit"
              className={`btn-primary${
                loading
                  ? " is-loading"
                  : ""
              }`}
              disabled={loading}
            >
              <span className="spinner" />

              <span className="btn-label">
                {t("login.signIn")}
              </span>

              <span className="loading-label">
                {t("login.signingIn")}
              </span>
            </button>

          </form>

          {/* ================================================================ */}
          {/* REGISTER */}
          {/* ================================================================ */}

          <p className="create-account">
            {t("login.noAccount")}{" "}

            <Link to="/register">
              {t("login.register")}
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}

// ============================================================================
// INLINE ICONS
// ============================================================================

function IconMail() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
      />

      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
      />

      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6.5 0-10-7-10-7a18.6 18.6 0 0 1 4.22-5.06M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19" />

      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />

      <line
        x1="2"
        y1="2"
        x2="22"
        y2="22"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />

      <circle
        cx="9"
        cy="7"
        r="4"
      />

      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />

      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />

      <path d="M3 6h18" />

      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />

      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />

      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="7"
        width="20"
        height="14"
        rx="2"
      />

      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconCap() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />

      <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}