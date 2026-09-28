import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import ManagedIdentityCard from "../components/ManagedIdentityCard";

import organizationIdentityApi from "../services/organizationIdentityApi";

import type {
  OrganizationIdentity,
  OrganizationIdentityStats,
} from "../types/organizationIdentity.types";

import "../styles/OrganizationIdentity.scss";

interface Props {
  organizationId: string;
}

export default function OrganizationIdentityHomePage({
  organizationId,
}: Props) {
  const navigate = useNavigate();

  const [stats, setStats] =
    useState<OrganizationIdentityStats | null>(
      null,
    );

  const [users, setUsers] =
    useState<OrganizationIdentity[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const [statsResult, usersResult] =
          await Promise.all([
            organizationIdentityApi.getStats(
              organizationId,
            ),
            organizationIdentityApi.getUsers(
              organizationId,
            ),
          ]);

        if (!mounted) {
          return;
        }

        setStats(statsResult);
        setUsers(usersResult.slice(0, 4));
      } catch {
        if (mounted) {
          setStats(null);
          setUsers([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [organizationId]);

  return (
    <div className="identity-layout">
      <OrganizationIdentitySidebar
        organizationId={organizationId}
      />

      <main className="identity-main">
        <header className="identity-header">
          <div>
            <span className="eyebrow">
              Fockis organization
            </span>

            <h1>
              Identity & access
            </h1>

            <p>
              Create and manage organization
              identities, activation emails,
              security policies, and custom
              domains.
            </p>
          </div>

          <Link
            className="primary-button"
            to={`/organizations/${organizationId}/identity/users/create`}
          >
            + Create User
          </Link>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>
              Total users
            </span>

            <strong>
              {loading
                ? "..."
                : stats?.totalUsers ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Active
            </span>

            <strong>
              {loading
                ? "..."
                : stats?.activeUsers ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Invited
            </span>

            <strong>
              {loading
                ? "..."
                : stats?.invitedUsers ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Verified domains
            </span>

            <strong>
              {loading
                ? "..."
                : stats?.verifiedDomains ?? 0}
            </strong>
          </div>
        </section>

        <section className="identity-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                Recently managed
              </span>

              <h2>
                Organization identities
              </h2>
            </div>

            <Link
              to={`/organizations/${organizationId}/identity/users`}
            >
              View all
            </Link>
          </div>

          {users.length > 0 ? (
            <div className="identity-card-grid">
              {users.map((user) => (
                <ManagedIdentityCard
                  key={user.id}
                  identity={user}
                  onClick={() =>
                    navigate(
                      `/organizations/${organizationId}/identity/users/${user.id}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>
                No managed identities
              </strong>

              <p>
                Create an organization user
                to get started.
              </p>

              <Link
                className="primary-button"
                to={`/organizations/${organizationId}/identity/users/create`}
              >
                Create first user
              </Link>
            </div>
          )}
        </section>

        <section className="identity-info-grid">
          <article>
            <span className="info-icon">
              F
            </span>

            <h3>
              Fockis-managed identities
            </h3>

            <p>
              Your organization does not
              have to purchase a domain.
              Fockis can provide the
              organization identity layer.
            </p>

            <code>
              username@students.fockis.com
            </code>
          </article>

          <article>
            <span className="info-icon">
              @
            </span>

            <h3>
              Custom domains
            </h3>

            <p>
              Organizations that control
              their own domain can verify
              it and use addresses such as
              company.com, school.edu,
              nonprofit.org, and more.
            </p>

            <Link
              to={`/organizations/${organizationId}/identity/domains`}
            >
              Manage domains →
            </Link>
          </article>
        </section>
      </main>
    </div>
  );
}