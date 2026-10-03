import { FOCKIS_API_URL } from "../config/fockisConfig";
import "../styles/Login.scss";

import { Link, useNavigate } from "react-router-dom";
import { FormEvent, useEffect, useState } from "react";
import axios from "axios";

import { getLanguage, subscribeToLanguage, t } from "../i18n";
import type { FockisLanguage } from "../i18n/language";
import LanguageSelector from "../i18n/components/LanguageSelector";
import { setToken, setUserId } from "../utils/auth";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

type MfaMode = "login" | "setup" | "verify";

type LoginUser = {
  _id?: string;
  id?: string;
  role?: string;
  [key: string]: unknown;
};

type AuthResponse = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  jwt?: string;

  user?: LoginUser;

  data?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    jwt?: string;
    user?: LoginUser;
    [key: string]: unknown;
  };

  result?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    jwt?: string;
    user?: LoginUser;
    [key: string]: unknown;
  };

  requiresMfa?: boolean;
  mfaSetup?: boolean;
  mfaSetupRequired?: boolean;
  mfaVerified?: boolean;

  setup_token?: string;
  setupToken?: string;

  challengeToken?: string;
  challenge_token?: string;

  qrCode?: string;
  qr_code?: string;
  qrCodeDataUrl?: string;
  qr_code_data_url?: string;
  otpAuthUrl?: string;
  otpauthUrl?: string;

  mfaSecret?: string;
  secret?: string;

  message?: string;

  [key: string]: unknown;
};

function extractToken(
  data: AuthResponse | undefined | null,
): string | null {
  const token =
    data?.access_token ||
    data?.accessToken ||
    data?.token ||
    data?.jwt ||
    data?.data?.access_token ||
    data?.data?.accessToken ||
    data?.data?.token ||
    data?.data?.jwt ||
    data?.result?.access_token ||
    data?.result?.accessToken ||
    data?.result?.token ||
    data?.result?.jwt;

  return typeof token === "string" && token.trim()
    ? token.trim()
    : null;
}

function extractUser(
  data: AuthResponse | undefined | null,
): LoginUser | null {
  const user =
    data?.user ||
    data?.data?.user ||
    data?.result?.user;

  return user && typeof user === "object" ? user : null;
}

function extractSetupToken(
  data: AuthResponse | undefined | null,
): string | null {
  const value =
    data?.setup_token ||
    data?.setupToken;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function extractChallengeToken(
  data: AuthResponse | undefined | null,
): string | null {
  const value =
    data?.challengeToken ||
    data?.challenge_token;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function extractQrCode(
  data: AuthResponse | undefined | null,
): string | null {
  const value =
    data?.qrCode ||
    data?.qr_code ||
    data?.qrCodeDataUrl ||
    data?.qr_code_data_url ||
    data?.otpAuthUrl ||
    data?.otpauthUrl ||
    null;

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  // Some QR libraries return a raw data URI without the expected key.
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  return null;
}

function extractMfaSecret(
  data: AuthResponse | undefined | null,
): string | null {
  const value =
    data?.mfaSecret ||
    data?.secret;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [language, setCurrentLanguage] =
    useState<FockisLanguage>(getLanguage());

  const [mfaMode, setMfaMode] =
    useState<MfaMode>("login");

  const [mfaCode, setMfaCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");

  useEffect(() => {
    return subscribeToLanguage((nextLanguage) => {
      setCurrentLanguage(nextLanguage);
    });
  }, []);

  void language;

  const establishSession = async (
    data: AuthResponse,
    fallbackUser?: LoginUser | null,
  ) => {
    const token = extractToken(data);
    const user =
      extractUser(data) ||
      fallbackUser ||
      null;

    if (!token) {
      throw new Error(
        "Authentication completed without a JWT token.",
      );
    }

    if (!user || typeof user !== "object") {
      throw new Error(
        t("login.alerts.backendUserError"),
      );
    }

    const userId =
      user._id ||
      user.id;

    if (
      typeof userId !== "string" ||
      !userId.trim()
    ) {
      throw new Error(
        t("login.alerts.userIdError"),
      );
    }

    const cleanToken = token.trim();

    localStorage.removeItem("access_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("jwt");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");

    localStorage.setItem(
      "access_token",
      cleanToken,
    );

    setToken(cleanToken);
    setUserId(userId);

    localStorage.setItem(
      "user",
      JSON.stringify(user),
    );

    localStorage.setItem(
      "token",
      cleanToken,
    );

    console.log(
      "[FOCKIS AUTH] Authentication established successfully.",
    );

    const role = String(
      user.role || "",
    )
      .trim()
      .toLowerCase();

    if (
      role === "admin" ||
      role === "super_admin"
    ) {
      navigate("/admin/dashboard", {
        replace: true,
      });
    } else {
      navigate("/feed", {
        replace: true,
      });
    }
  };

  const startMfaSetup = async (
    token: string,
  ) => {
    const response =
      await axios.post<AuthResponse>(
        `${API_BASE_URL}/auth/mfa/setup`,
        {
          setupToken: token,
        },
        {
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
        },
      );

    const data = response.data;

    const nextSetupToken =
      extractSetupToken(data) ||
      token;

    setSetupToken(nextSetupToken);

    setQrCode(
      extractQrCode(data) || "",
    );

    setMfaSecret(
      extractMfaSecret(data) || "",
    );

    setMfaCode("");
    setMfaMode("setup");
  };

  const confirmMfaSetup = async () => {
    if (
      !setupToken ||
      mfaCode.length !== 6
    ) {
      alert(
        "Enter the 6-digit authenticator code.",
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/mfa/confirm`,
          {
            setupToken,
            code: mfaCode,
          },
          {
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
          },
        );

      const data = response.data;

      console.log(
        "[FOCKIS AUTH] MFA setup confirmed.",
      );

      const directToken =
        extractToken(data);

      if (directToken) {
        await establishSession(data);
        return;
      }

      // MFA is now enabled.
      // Authenticate again to obtain the MFA challenge.
      await authenticateForMfaChallenge();
    } catch (err: unknown) {
      console.error(
        "[FOCKIS AUTH] MFA SETUP ERROR:",
        err,
      );

      const message =
        axios.isAxiosError(err) &&
        typeof err.response?.data?.message ===
          "string"
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Unable to confirm MFA setup.";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const authenticateForMfaChallenge =
    async () => {
      const response =
        await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/login`,
          {
            email: email.trim(),
            password,
          },
          {
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
          },
        );

      const data = response.data;

      const directToken =
        extractToken(data);

      const user =
        extractUser(data);

      if (
        directToken &&
        data.requiresMfa !== true &&
        data.mfaSetup !== true &&
        data.mfaSetupRequired !== true
      ) {
        await establishSession(
          data,
          user,
        );
        return;
      }

      const nextChallenge =
        extractChallengeToken(data);

      if (nextChallenge) {
        setChallengeToken(
          nextChallenge,
        );

        setMfaCode("");
        setMfaMode("verify");
        return;
      }

      if (
        data.mfaSetup ||
        data.mfaSetupRequired ||
        data.requiresMfa
      ) {
        const nextSetup =
          extractSetupToken(data);

        if (nextSetup) {
          await startMfaSetup(
            nextSetup,
          );
          return;
        }
      }

      throw new Error(
        "The backend did not return an MFA challenge token.",
      );
    };

  const verifyMfaLogin = async () => {
    if (
      !challengeToken ||
      mfaCode.length !== 6
    ) {
      alert(
        "Enter the 6-digit authenticator code.",
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/mfa/verify`,
          {
            challengeToken,
            code: mfaCode,
          },
          {
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
          },
        );

      const data = response.data;

      const token =
        extractToken(data);

      if (!token) {
        throw new Error(
          "MFA was verified, but the backend did not return the final JWT token.",
        );
      }

      await establishSession(
        data,
        extractUser(data),
      );
    } catch (err: unknown) {
      console.error(
        "[FOCKIS AUTH] MFA LOGIN ERROR:",
        err,
      );

      const message =
        axios.isAxiosError(err) &&
        typeof err.response?.data?.message ===
          "string"
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Unable to verify MFA.";

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (loading) return;

    if (
      !email.trim() ||
      !password
    ) {
      alert(
        t("login.alerts.invalidCredentials"),
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/login`,
          {
            email: email.trim(),
            password,
          },
          {
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
          },
        );

      const data = response.data;

      console.log(
        "[FOCKIS AUTH] LOGIN RESPONSE KEYS:",
        data &&
          typeof data === "object"
          ? Object.keys(data)
          : [],
      );

      const token =
        extractToken(data);

      const user =
        extractUser(data);

      /*
       * ============================================================
       * FIRST-LOGIN MFA ENROLLMENT
       *
       * The backend can return either:
       *
       *   mfaSetup: true
       *
       * or:
       *
       *   mfaSetupRequired: true
       *
       * The previous frontend only checked mfaSetupRequired,
       * which caused:
       *
       *   "Backend did not return a JWT token."
       *
       * because MFA setup intentionally does not return a JWT yet.
       * ============================================================
       */

      const setupRequired =
        data.mfaSetup === true ||
        data.mfaSetupRequired === true;

      if (setupRequired) {
        const nextSetupToken =
          extractSetupToken(data);

        if (!nextSetupToken) {
          throw new Error(
            "MFA setup is required, but the backend did not return a setup token.",
          );
        }

        await startMfaSetup(
          nextSetupToken,
        );

        return;
      }

      /*
       * ============================================================
       * MFA ALREADY CONFIGURED
       * ============================================================
       */

      if (data.requiresMfa === true) {
        const nextChallenge =
          extractChallengeToken(data);

        if (nextChallenge) {
          setChallengeToken(
            nextChallenge,
          );

          setMfaCode("");
          setMfaMode("verify");

          return;
        }

        throw new Error(
          "MFA is required, but the backend did not return an MFA challenge token.",
        );
      }

      /*
       * ============================================================
       * NORMAL LOGIN
       * ============================================================
       */

      if (token) {
        await establishSession(
          data,
          user,
        );

        return;
      }

      throw new Error(
        "Backend did not return a JWT token.",
      );
    } catch (err: unknown) {
      console.error(
        "[FOCKIS AUTH] LOGIN ERROR:",
        err,
      );

      if (axios.isAxiosError(err)) {
        console.error(
          "[FOCKIS AUTH] SERVER STATUS:",
          err.response?.status,
        );

        console.error(
          "[FOCKIS AUTH] SERVER RESPONSE KEYS:",
          err.response?.data &&
            typeof err.response.data ===
              "object"
            ? Object.keys(
                err.response.data,
              )
            : [],
        );
      }

      let message =
        t(
          "login.alerts.invalidCredentials",
        );

      if (axios.isAxiosError(err)) {
        const serverMessage =
          err.response?.data?.message;

        if (Array.isArray(serverMessage)) {
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
          err.response?.status ===
          401
        ) {
          message =
            t(
              "login.alerts.invalidCredentials",
            );
        } else if (
          err.response?.status ===
          400
        ) {
          message =
            t(
              "login.alerts.checkCredentials",
            );
        } else if (!err.response) {
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
            {t(
              "login.connectedDescription",
            )}
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

          {mfaMode === "login" ? (
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
                  {t(
                    "login.signingIn",
                  )}
                </span>
              </button>
            </form>
          ) : (
            <div
              className="fockis-mfa-flow"
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "18px",
                padding: "24px 0",
              }}
            >
              <div>
                <h2
                  style={{
                    marginBottom: 8,
                  }}
                >
                  {mfaMode === "setup"
                    ? "Secure your Fockis account"
                    : "Two-factor authentication"}
                </h2>

                <p
                  style={{
                    margin: 0,
                    opacity: 0.78,
                    lineHeight: 1.5,
                  }}
                >
                  {mfaMode === "setup"
                    ? "MFA is required for this account. Set up an authenticator app before continuing."
                    : "Enter the 6-digit code from your authenticator app to finish signing in."}
                </p>
              </div>

              {mfaMode === "setup" && (
                <>
                  {qrCode ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "center",
                        padding: 16,
                        background:
                          "#fff",
                        borderRadius: 16,
                      }}
                    >
                      <img
                        src={qrCode}
                        alt="Fockis MFA setup QR code"
                        style={{
                          width: 220,
                          height: 220,
                          objectFit:
                            "contain",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background:
                          "rgba(37, 99, 235, 0.08)",
                      }}
                    >
                      The QR code could not
                      be displayed. Use the
                      manual secret below.
                    </div>
                  )}

                  {mfaSecret && (
                    <div>
                      <label
                        style={{
                          display:
                            "block",
                          marginBottom: 8,
                          fontWeight: 600,
                        }}
                      >
                        Manual setup key
                      </label>

                      <code
                        style={{
                          display:
                            "block",
                          padding: 12,
                          borderRadius: 10,
                          wordBreak:
                            "break-all",
                          background:
                            "rgba(0,0,0,0.06)",
                        }}
                      >
                        {mfaSecret}
                      </code>
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="mfa-code">
                      Authenticator code
                    </label>

                    <div className="input-shell">
                      <input
                        id="mfa-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        placeholder="123456"
                        value={mfaCode}
                        onChange={(e) =>
                          setMfaCode(
                            e.target.value
                              .replace(
                                /\D/g,
                                "",
                              )
                              .slice(
                                0,
                                6,
                              ),
                          )
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      loading ||
                      mfaCode.length !==
                        6
                    }
                    onClick={
                      confirmMfaSetup
                    }
                  >
                    {loading
                      ? "Confirming MFA..."
                      : "Confirm MFA setup"}
                  </button>
                </>
              )}

              {mfaMode === "verify" && (
                <>
                  <div className="field">
                    <label htmlFor="mfa-verify-code">
                      6-digit authenticator
                      code
                    </label>

                    <div className="input-shell">
                      <input
                        id="mfa-verify-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        placeholder="123456"
                        value={mfaCode}
                        onChange={(e) =>
                          setMfaCode(
                            e.target.value
                              .replace(
                                /\D/g,
                                "",
                              )
                              .slice(
                                0,
                                6,
                              ),
                          )
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      loading ||
                      mfaCode.length !==
                        6
                    }
                    onClick={
                      verifyMfaLogin
                    }
                  >
                    {loading
                      ? "Verifying..."
                      : "Verify and sign in"}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setMfaMode(
                        "setup",
                      );
                      setMfaCode("");
                      setChallengeToken(
                        "",
                      );
                    }}
                    style={{
                      border: 0,
                      background:
                        "transparent",
                      cursor:
                        "pointer",
                      padding: "8px",
                    }}
                  >
                    Need to set up MFA
                    instead
                  </button>
                </>
              )}
            </div>
          )}

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