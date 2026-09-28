import { Check, Radio, X } from "lucide-react";
import type { AppNotification } from "../type/Notification";

interface LiveGuestInvitationProps {
  notification: AppNotification;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function LiveGuestInvitation({
  notification,
  onAccept,
  onDecline,
}: LiveGuestInvitationProps) {
  return (
    <div className="fockis-live-invitation">
      <div className="fockis-live-invitation__icon">
        <Radio size={20} />
      </div>

      <div className="fockis-live-invitation__content">
        <strong>
          {notification.title || "LIVE guest invitation"}
        </strong>

        <p>
          {notification.message ||
            "You have been invited to join a LIVE stream."}
        </p>

        <div className="fockis-live-invitation__actions">
          <button
            type="button"
            className="fockis-btn fockis-btn--primary"
            onClick={onAccept}
          >
            <Check size={15} />
            Accept
          </button>

          <button
            type="button"
            className="fockis-btn fockis-btn--secondary"
            onClick={onDecline}
          >
            <X size={15} />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
