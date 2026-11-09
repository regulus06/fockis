/**
 * BadgePhotoButton.tsx
 * -----------------------------------------------------------------------------
 * "Upload photo" / "Change photo" (and "Remove photo") for one member's badge.
 * Used on My badge (the member themself) and on the admin badges page.
 * The server checks that the signed-in user is that member or a badge admin.
 * -----------------------------------------------------------------------------
 */

import { useRef, useState } from "react";

import { BADGE_PHOTO_ACCEPT, BADGE_PHOTO_MAX_BYTES, badgeApi, type Badge } from "./badgeApi";
import { errorText } from "../ui/OrgShell";

interface Props {
  badge: Badge;
  /** Called with the rebuilt badge after a photo is uploaded or removed. */
  onChange: (badge: Badge) => void;
  /** Smaller buttons for the badge grid. */
  compact?: boolean;
  showRemove?: boolean;
}

export default function BadgePhotoButton({ badge, onChange, compact = false, showRemove = true }: Props): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!BADGE_PHOTO_ACCEPT.split(",").includes(file.type)) {
      setError("Use a JPG, PNG, WebP or GIF picture.");
      return;
    }
    if (file.size > BADGE_PHOTO_MAX_BYTES) {
      setError("The photo is too large. The limit is 8 MB.");
      return;
    }
    setBusy("upload");
    try {
      const res = await badgeApi.uploadPhoto(badge.organizationId, badge.membershipId, file);
      onChange(res.badge ?? { ...badge, avatarUrl: res.avatarUrl });
    } catch (err) {
      setError(errorText(err, "The photo could not be uploaded."));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setError(null);
    setBusy("remove");
    try {
      const res = await badgeApi.removePhoto(badge.organizationId, badge.membershipId);
      onChange(res.badge ?? { ...badge, avatarUrl: null });
    } catch (err) {
      setError(errorText(err, "The photo could not be removed."));
    } finally {
      setBusy(null);
    }
  }

  const size = compact ? { padding: "6px 10px", fontSize: 13 } : undefined;

  return (
    <div className="badge-photo-actions" style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <div className="fko-actions" style={{ justifyContent: "center", gap: 8 }}>
        <button
          type="button"
          className="fko-btn fko-btn--secondary"
          style={size}
          disabled={busy !== null}
          onClick={() => input.current?.click()}
        >
          {busy === "upload" ? "Uploading…" : badge.avatarUrl ? "📷 Change photo" : "📷 Upload photo"}
        </button>
        {showRemove && badge.avatarUrl && (
          <button type="button" className="fko-btn fko-btn--ghost" style={size} disabled={busy !== null} onClick={remove}>
            {busy === "remove" ? "Removing…" : "Remove photo"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={BADGE_PHOTO_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {error && (
        <p className="fko-hint" role="alert" style={{ color: "var(--church-danger, #b42318)", margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}
