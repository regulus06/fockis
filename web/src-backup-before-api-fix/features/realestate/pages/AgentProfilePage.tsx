import React, { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Mail,
  Phone,
  MapPin,
  Bed,
  Bath,
  Heart,
  Building2,
} from "lucide-react";

import "../styles/AgentProfilePage.scss";
import "../styles/_input-reset.scss";

/* ============================================================================
   TYPES
============================================================================ */

interface AgentProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  type: "House" | "Apartment" | "Land" | "Commercial";
  listingType: "For Sale" | "For Rent";
  image: string;
  bedrooms?: number;
  bathrooms?: number;
}

interface AgentProfile {
  id: string;
  name: string;
  avatar: string;
  coverImage: string;
  company?: string;
  location: string;
  phone?: string;
  email?: string;
  bio: string;
  verified: boolean;
  properties: AgentProperty[];
}

/* ============================================================================
   DEMO AGENT

   TODO: replace this lookup with a real fetch once
   GET /realestate/agents/:agentId is wired up.
============================================================================ */

const demoAgent: AgentProfile = {
  id: "demo-agent",
  name: "Michael Johnson",
  avatar:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
  coverImage:
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
  company: "Fockis Realty Group",
  location: "Columbus, Ohio",
  phone: "(614) 555-0198",
  email: "michael@example.com",
  bio:
    "Experienced real estate professional helping buyers, sellers, renters, and investors find the right property. Specializing in residential properties, apartments, land, and investment opportunities.",
  verified: true,
  properties: [
    {
      id: "property-1",
      title: "Modern Family Home",
      location: "Galloway, Ohio",
      price: 385000,
      type: "House",
      listingType: "For Sale",
      image:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
      bedrooms: 4,
      bathrooms: 3,
    },
    {
      id: "property-2",
      title: "Luxury Downtown Apartment",
      location: "Columbus, Ohio",
      price: 1850,
      type: "Apartment",
      listingType: "For Rent",
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
      bedrooms: 2,
      bathrooms: 2,
    },
    {
      id: "property-3",
      title: "Development Land",
      location: "Grove City, Ohio",
      price: 245000,
      type: "Land",
      listingType: "For Sale",
      image:
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
    },
  ],
};

/* ============================================================================
   HELPERS
============================================================================ */

const formatPrice = (
  price: number,
  listingType: "For Sale" | "For Rent",
): string => {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);

  return listingType === "For Rent" ? `${formatted}/month` : formatted;
};

/* ============================================================================
   COMPONENT
============================================================================ */

const AgentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();

  const agent = useMemo<AgentProfile>(() => {
    return {
      ...demoAgent,
      id: agentId || demoAgent.id,
    };
  }, [agentId]);

  const handleContact = () => {
    if (!agent.email) return;
    window.location.href = `mailto:${agent.email}`;
  };

  const handleCall = () => {
    if (!agent.phone) return;
    const phone = agent.phone.replace(/\D/g, "");
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="agent-page">
      <div className="agent-container">
        <button type="button" className="agent-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>

        <section className="agent-card">
          <div
            className="agent-cover"
            style={{ backgroundImage: `url("${agent.coverImage}")` }}
          >
            <div className="agent-cover-overlay" />
          </div>

          <div className="agent-main">
            <div className="agent-avatar-wrap">
              <img src={agent.avatar} alt={agent.name} className="agent-avatar" />

              {agent.verified && (
                <span className="agent-verified-badge" title="Verified agent">
                  <BadgeCheck size={16} />
                </span>
              )}
            </div>

            <div className="agent-info">
              <div className="agent-name-row">
                <h1>{agent.name}</h1>

                {agent.verified && (
                  <span className="agent-verified-pill">
                    <BadgeCheck size={13} />
                    Verified Agent
                  </span>
                )}
              </div>

              {agent.company && (
                <p className="agent-company">
                  <Building2 size={14} />
                  {agent.company}
                </p>
              )}

              <p className="agent-location">
                <MapPin size={14} />
                {agent.location}
              </p>

              <p className="agent-bio">{agent.bio}</p>

              <div className="agent-actions">
                {agent.email && (
                  <button type="button" className="agent-btn-primary" onClick={handleContact}>
                    <Mail size={15} />
                    Contact Agent
                  </button>
                )}

                {agent.phone && (
                  <button type="button" className="agent-btn-secondary" onClick={handleCall}>
                    <Phone size={15} />
                    Call
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="agent-stats">
            <div className="agent-stat">
              <strong>{agent.properties.length}</strong>
              <span>Listings</span>
            </div>

            <div className="agent-stat">
              <strong>
                {agent.properties.filter((p) => p.listingType === "For Sale").length}
              </strong>
              <span>For Sale</span>
            </div>

            <div className="agent-stat">
              <strong>
                {agent.properties.filter((p) => p.listingType === "For Rent").length}
              </strong>
              <span>For Rent</span>
            </div>

            <div className="agent-stat">
              <strong>5+</strong>
              <span>Years Experience</span>
            </div>
          </div>
        </section>

        <section className="agent-listings">
          <div className="agent-listings-header">
            <div>
              <h2>Properties by {agent.name}</h2>
              <p>Explore homes, apartments, land, and other properties listed by this agent.</p>
            </div>

            <span className="agent-listing-count">{agent.properties.length} properties</span>
          </div>

          {agent.properties.length === 0 ? (
            <div className="agent-empty">
              <div className="agent-empty-icon">
                <Building2 size={22} />
              </div>
              <h3>No properties listed</h3>
              <p>This agent does not currently have any active properties.</p>
            </div>
          ) : (
            <div className="agent-property-grid">
              {agent.properties.map((property) => (
                <Link
                  key={property.id}
                  to={`/realestate/property/${property.id}`}
                  className="agent-property-card"
                >
                  <div className="agent-property-image-wrap">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="agent-property-image"
                    />

                    <span
                      className={`agent-property-badge ${
                        property.listingType === "For Rent" ? "rent" : "sale"
                      }`}
                    >
                      {property.listingType}
                    </span>

                    <button
                      type="button"
                      className="agent-property-fav"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      aria-label="Save property"
                    >
                      <Heart size={16} />
                    </button>
                  </div>

                  <div className="agent-property-body">
                    <h3>{property.title}</h3>

                    <p className="agent-property-location">
                      <MapPin size={13} />
                      {property.location}
                    </p>

                    <strong className="agent-property-price">
                      {formatPrice(property.price, property.listingType)}
                    </strong>

                    <div className="agent-property-details">
                      <span>{property.type}</span>

                      {property.bedrooms !== undefined && (
                        <span>
                          <Bed size={12} />
                          {property.bedrooms} beds
                        </span>
                      )}

                      {property.bathrooms !== undefined && (
                        <span>
                          <Bath size={12} />
                          {property.bathrooms} baths
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="agent-contact-card">
          <div>
            <h2>Interested in a property?</h2>
            <p>
              Contact {agent.name} directly for availability, pricing, appointments, and
              additional property information.
            </p>
          </div>

          <div className="agent-contact-actions">
            {agent.email && (
              <button type="button" className="agent-btn-primary" onClick={handleContact}>
                Send Message
              </button>
            )}

            {agent.phone && (
              <button type="button" className="agent-btn-secondary" onClick={handleCall}>
                Call Agent
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AgentProfilePage;