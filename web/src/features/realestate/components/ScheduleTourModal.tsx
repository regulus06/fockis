import React, { useState } from "react";
import { X, Calendar } from "lucide-react";

import type { Property } from "../types/Property";

interface ScheduleTourModalProps {
  property: Property;
  onClose: () => void;
}

const ScheduleTourModal: React.FC<
  ScheduleTourModalProps
> = ({
  property,
  onClose,
}) => {
  const [sent, setSent] =
    useState(false);

  if (sent) {
    return (
      <div className="re-modal-backdrop">
        <div className="re-modal">
          <button
            className="re-modal__close"
            onClick={onClose}
          >
            <X size={19} />
          </button>

          <div className="re-modal__success">
            <Calendar size={28} />

            <h2>Tour requested</h2>

            <p>
              Your tour request for{" "}
              <strong>
                {property.title}
              </strong>{" "}
              has been received.
            </p>

            <button
              className="re-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="re-modal-backdrop">
      <div className="re-modal">
        <button
          className="re-modal__close"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <h2>Schedule a tour</h2>

        <p className="re-modal__subtitle">
          {property.title}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
        >
          <label>
            <span>Date</span>
            <input
              required
              type="date"
            />
          </label>

          <label>
            <span>Time</span>
            <input
              required
              type="time"
            />
          </label>

          <label>
            <span>Number of people</span>
            <input
              type="number"
              min={1}
              defaultValue={1}
            />
          </label>

          <label>
            <span>Message</span>
            <textarea
              rows={4}
              placeholder="Anything the agent should know?"
            />
          </label>

          <button
            className="re-primary re-primary--full"
            type="submit"
          >
            Request Tour
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScheduleTourModal;