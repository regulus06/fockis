import {
  useState,
} from "react";

import DomainAuthorizationForm from "../components/DomainAuthorizationForm";

import useDomainAdmin from "../hooks/useDomainAdmin";

import "../styles/DomainAuthorizations.scss";

export default function DomainAuthorizationsPage() {
  const {
    authorizations,
    loading,
    error,
    createAuthorization,
    revokeAuthorization,
  } = useDomainAdmin();

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  async function handleCreate(
    payload: Parameters<
      typeof createAuthorization
    >[0],
  ) {
    setSaving(true);

    try {
      await createAuthorization(
        payload,
      );

      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function revoke(
    id: string,
  ) {
    const confirmed =
      window.confirm(
        "Revoke this free-domain authorization?",
      );

    if (!confirmed) {
      return;
    }

    await revokeAuthorization(id);
  }

  return (
    <div className="domain-authorizations-page">
      <header className="domain-admin-header">
        <div>
          <span className="domain-eyebrow">
            Super App Administration
          </span>

          <h1>
            Domain Authorizations
          </h1>

          <p>
            Give individual users or
            businesses special free-domain
            access.
          </p>
        </div>

        <button
          type="button"
          className="domain-primary-button"
          onClick={() =>
            setShowForm(
              (current) => !current,
            )
          }
        >
          {showForm
            ? "Close"
            : "+ Grant Authorization"}
        </button>
      </header>

      {error && (
        <div
          className="domain-admin-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {showForm && (
        <section className="domain-panel">
          <h2>
            Grant Free Domain Access
          </h2>

          <DomainAuthorizationForm
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() =>
              setShowForm(false)
            }
          />
        </section>
      )}

      {loading ? (
        <div className="domain-table-state">
          Loading authorizations...
        </div>
      ) : (
        <section className="domain-authorization-list">
          {authorizations.length ===
          0 ? (
            <div className="domain-table-state">
              <strong>
                No special authorizations.
              </strong>

              <p>
                You can grant free-domain
                access to a user or business.
              </p>
            </div>
          ) : (
            authorizations.map(
              (authorization) => (
                <article
                  className="domain-authorization-card"
                  key={
                    authorization.id
                  }
                >
                  <div>
                    <span className="domain-eyebrow">
                      {
                        authorization.authorizationType
                      }
                    </span>

                    <h2>
                      {
                        authorization.ownerName
                      }
                    </h2>

                    {authorization.ownerEmail && (
                      <p>
                        {
                          authorization.ownerEmail
                        }
                      </p>
                    )}
                  </div>

                  <div className="domain-authorization-card__stats">
                    <div>
                      <strong>
                        {
                          authorization.unlimited
                            ? "∞"
                            : authorization.freeDomainLimit
                        }
                      </strong>

                      <span>
                        free allowed
                      </span>
                    </div>

                    <div>
                      <strong>
                        {
                          authorization.freeDomainsUsed
                        }
                      </strong>

                      <span>
                        used
                      </span>
                    </div>

                    <div>
                      <strong>
                        {
                          authorization.unlimited
                            ? "∞"
                            : authorization.freeDomainsRemaining
                        }
                      </strong>

                      <span>
                        remaining
                      </span>
                    </div>
                  </div>

                  {authorization.reason && (
                    <p className="domain-authorization-reason">
                      Reason:{" "}
                      {
                        authorization.reason
                      }
                    </p>
                  )}

                  <button
                    type="button"
                    className="domain-danger-button"
                    onClick={() =>
                      void revoke(
                        authorization.id,
                      )
                    }
                  >
                    Revoke
                  </button>
                </article>
              ),
            )
          )}
        </section>
      )}
    </div>
  );
}