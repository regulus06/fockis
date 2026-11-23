/**
 * GivingQrDialog.tsx — public "QR code" for a church's giving form.
 *
 * Opened from the Give Online section of the church website by any visitor
 * or member, so they can show the code to someone, save it or share the
 * link. Uses the same server endpoint as the admin card
 * (GET /church/organizations/:id/giving/qr): the link is built by the
 * server from the church's public address.
 */

import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, QrCode, Share2, X } from "lucide-react";

import { givingApi, type GivingQr } from "./givingApi";
import "./giving.scss";

const fileSafe = (v: string) => v.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "giving";

export default function GivingQrDialog({ organizationId, organizationName, onClose }: { organizationId: string; organizationName: string; onClose: () => void }) {
  const [qr, setQr] = useState<GivingQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    givingApi
      .qr(organizationId, undefined, controller.signal)
      .then((r) => !controller.signal.aborted && setQr(r))
      .catch((e) => !controller.signal.aborted && setError(e instanceof Error ? e.message : "The QR code could not be loaded."));
    return () => controller.abort();
  }, [organizationId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The link could not be copied.");
    }
  }

  async function share() {
    if (!qr) return;
    try {
      await navigator.share({ title: `Give to ${qr.organizationName}`, text: `Give to ${qr.organizationName}`, url: qr.url });
    } catch {
      /* closed the share sheet */
    }
  }

  function save() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr.png;
    a.download = `${fileSafe(qr.organizationName)}-giving-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="gv-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gv-dialog gv-qrdialog" role="dialog" aria-modal="true" aria-labelledby="gv-qr-title">
        <header className="gv-dialog__head">
          <span className="gv-dialog__icon" aria-hidden="true">
            <QrCode />
          </span>
          <div>
            <h2 id="gv-qr-title">Scan to give</h2>
            <p>{qr?.organizationName || organizationName}</p>
          </div>
          <button type="button" className="gv-close" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="gv-body gv-qrdialog__body">
          {error && (
            <p className="gv-error" role="alert">
              {error}
            </p>
          )}
          {!qr && !error && (
            <p className="gv-muted">
              <Loader2 className="gv-spin" aria-hidden="true" /> Loading…
            </p>
          )}
          {qr && (
            <>
              <img className="gv-qrdialog__code" src={qr.png} alt={`QR code: ${qr.url}`} />
              <p className="gv-muted">Point a phone camera at the code to open the giving form.</p>
              <p className="gv-qrdialog__url">{qr.url.replace(/^https?:\/\//, "")}</p>
              <div className="gv-row gv-qrdialog__actions">
                {canShare && (
                  <button type="button" className="gv-btn gv-btn--primary" onClick={() => void share()}>
                    <Share2 aria-hidden="true" /> Share
                  </button>
                )}
                <button type="button" className={"gv-btn " + (canShare ? "gv-btn--ghost" : "gv-btn--primary")} onClick={() => void copy()}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
                </button>
                <button type="button" className="gv-btn gv-btn--ghost" onClick={save}>
                  <Download aria-hidden="true" /> Save image
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
