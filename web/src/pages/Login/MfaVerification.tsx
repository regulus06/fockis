import type { MfaMode } from "./loginTypes";

type Props = {
  mfaMode: MfaMode;
  loading: boolean;
  mfaCode: string;
  qrCode: string;
  mfaSecret: string;
  onCodeChange: (code: string) => void;
  onConfirmSetup: () => void;
  onVerify: () => void;
  onSwitchToSetup: () => void;
};

export default function MfaVerification({
  mfaMode,
  loading,
  mfaCode,
  qrCode,
  mfaSecret,
  onCodeChange,
  onConfirmSetup,
  onVerify,
  onSwitchToSetup,
}: Props) {
  return (
    <div
      className="fockis-mfa-flow"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        padding: "24px 0",
      }}
    >
      <div>
        <h2 style={{ marginBottom: 8 }}>
          {mfaMode === "setup"
            ? "Secure your Fockis account"
            : "Two-factor authentication"}
        </h2>

        <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.5 }}>
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
                justifyContent: "center",
                padding: 16,
                background: "#fff",
                borderRadius: 16,
              }}
            >
              <img
                src={qrCode}
                alt="Fockis MFA setup QR code"
                style={{ width: 220, height: 220, objectFit: "contain" }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "rgba(37, 99, 235, 0.08)",
              }}
            >
              The QR code could not be displayed. Use the manual secret below.
            </div>
          )}

          {mfaSecret && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Manual setup key
              </label>
              <code
                style={{
                  display: "block",
                  padding: 12,
                  borderRadius: 10,
                  wordBreak: "break-all",
                  background: "rgba(0,0,0,0.06)",
                }}
              >
                {mfaSecret}
              </code>
            </div>
          )}

          <div className="field">
            <label htmlFor="mfa-code">Authenticator code</label>
            <div className="input-shell">
              <input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => onCodeChange(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={loading || mfaCode.length !== 6}
            onClick={onConfirmSetup}
          >
            {loading ? "Confirming MFA..." : "Confirm MFA setup"}
          </button>
        </>
      )}

      {mfaMode === "verify" && (
        <>
          <div className="field">
            <label htmlFor="mfa-verify-code">6-digit authenticator code</label>
            <div className="input-shell">
              <input
                id="mfa-verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => onCodeChange(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={loading || mfaCode.length !== 6}
            onClick={onVerify}
          >
            {loading ? "Verifying..." : "Verify and sign in"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onSwitchToSetup}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            Need to set up MFA instead
          </button>
        </>
      )}
    </div>
  );
}
