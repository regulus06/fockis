import React from "react";
import {
  CheckCircle2,
  MessageCircle,
  Phone,
  Calendar,
} from "lucide-react";

import type { PropertyAgent as Agent } from "../types/Property";

interface PropertyAgentProps {
  agent: Agent;
  onMessage: () => void;
  onTour: () => void;
}

const PropertyAgent: React.FC<
  PropertyAgentProps
> = ({
  agent,
  onMessage,
  onTour,
}) => {
  return (
    <div className="re-agent-card">
      <div className="re-agent-card__top">
        <div className="re-agent-avatar">
          {agent.avatar ||
            agent.name
              .slice(0, 2)
              .toUpperCase()}
        </div>

        <div>
          <h3>{agent.name}</h3>

          <p>
            {agent.role}
            {agent.company
              ? ` · ${agent.company}`
              : ""}
          </p>

          {agent.verified && (
            <span className="re-agent-verified">
              <CheckCircle2 size={13} />
              Verified
            </span>
          )}
        </div>
      </div>

      {agent.responseTime && (
        <p className="re-agent-response">
          {agent.responseTime}
        </p>
      )}

      <div className="re-agent-buttons">
        <button
          type="button"
          onClick={onMessage}
        >
          <MessageCircle size={15} />
          Message
        </button>

        {agent.phone && (
          <a href={`tel:${agent.phone}`}>
            <Phone size={15} />
            Call
          </a>
        )}

        <button
          type="button"
          className="primary"
          onClick={onTour}
        >
          <Calendar size={15} />
          Schedule Tour
        </button>
      </div>
    </div>
  );
};

export default PropertyAgent;