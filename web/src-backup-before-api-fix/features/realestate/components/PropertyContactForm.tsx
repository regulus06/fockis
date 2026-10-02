import React, { useState } from "react";
import {
  Mail,
  X,
} from "lucide-react";

import type { Property } from "../types/Property";

interface PropertyContactFormProps {
  property: Property;
  onClose: () => void;
}

const PropertyContactForm: React.FC<
  PropertyContactFormProps
> = ({
  property,
  onClose,
}) => {
  const [sent, setSent] =
    useState(false);

  return (
    <div className="re-modal-backdrop">
      <div className="re-modal">
        <button
          className="re-modal__close"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        {sent ? (
          <div className="re-modal__success">
            <Mail size={28} />

            <h2>Message sent</h2>

            <p>
              Your inquiry has been sent to{" "}
              {property.agent.name}.
            </p>

            <button
              className="re-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2>
              Contact{" "}
              {property.agent.role ===
              "Owner"
                ? "Owner"
                : "Agent"}
            </h2>

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
                <span>Name</span>
                <input required />
              </label>

              <label>
                <span>Email</span>
                <input
                  required
                  type="email"
                />
              </label>

              <label>
                <span>Phone</span>
                <input type="tel" />
              </label>

              <label>
                <span>Message</span>
                <textarea
                  rows={5}
                  defaultValue={`I'm interested in ${property.title}.`}
                />
              </label>

              <button
                className="re-primary re-primary--full"
                type="submit"
              >
                Send Inquiry
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyContactForm;