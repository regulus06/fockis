/*
 * ============================================================================
 * FOCKIS ADMIN PROPERTY TABLE
 * ============================================================================
 */

import React from "react";

/* ============================================================================
 * TYPES
 * ========================================================================== */

export interface AdminProperty {
  id?: string;
  _id?: string;

  title?: string;
  name?: string;

  status?: string;

  featured?: boolean;
  isFeatured?: boolean;

  price?: number;
  propertyType?: string;

  city?: string;
  state?: string;
  location?: string;

  createdAt?: string;

  [key: string]: unknown;
}

export interface PropertyTableProps {
  properties: AdminProperty[];

  loading?: boolean;

  busyId?: string | null;

  getPropertyId?: (
    property: AdminProperty,
  ) => string;

  onApprove?: (
    id: string,
  ) => void | Promise<void>;

  onReject?: (
    id: string,
  ) => void | Promise<void>;

  onFeature?: (
    id: string,
  ) => void | Promise<void>;

  onDelete?: (
    id: string,
  ) => void | Promise<void>;
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function getId(
  property: AdminProperty,
): string {
  return String(
    property.id ??
      property._id ??
      "",
  );
}

function getPropertyName(
  property: AdminProperty,
): string {
  return String(
    property.title ??
      property.name ??
      "Untitled Property",
  );
}

function getStatus(
  property: AdminProperty,
): string {
  return String(
    property.status ??
      "pending",
  );
}

function getLocation(
  property: AdminProperty,
): string {
  if (property.location) {
    return String(property.location);
  }

  const parts = [
    property.city,
    property.state,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "—";
}

function formatPrice(
  price: unknown,
): string {
  if (
    typeof price !== "number" ||
    Number.isNaN(price)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    },
  ).format(price);
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function PropertyTable({
  properties,
  loading = false,
  busyId = null,
  getPropertyId,
  onApprove,
  onReject,
  onFeature,
  onDelete,
}: PropertyTableProps) {
  if (loading) {
    return (
      <div className="fockis-property-table">
        <div className="fockis-property-table__loading">
          Loading properties...
        </div>
      </div>
    );
  }

  if (
    !properties ||
    properties.length === 0
  ) {
    return (
      <div className="fockis-property-table">
        <div className="fockis-property-table__empty">
          No properties found.
        </div>
      </div>
    );
  }

  return (
    <div className="fockis-property-table">
      <div className="fockis-property-table__scroll">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Location</th>
              <th>Price</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {properties.map(
              (property) => {
                const id =
                  getPropertyId?.(
                    property,
                  ) ??
                  getId(property);

                const status =
                  getStatus(property);

                const featured =
                  property.featured === true ||
                  property.isFeatured === true;

                const busy =
                  busyId === id;

                return (
                  <tr key={id}>
                    <td>
                      <strong>
                        {getPropertyName(
                          property,
                        )}
                      </strong>
                    </td>

                    <td>
                      {String(
                        property.propertyType ??
                          "—",
                      )}
                    </td>

                    <td>
                      {getLocation(
                        property,
                      )}
                    </td>

                    <td>
                      {formatPrice(
                        property.price,
                      )}
                    </td>

                    <td>
                      <span
                        className={`fockis-property-status fockis-property-status--${status.toLowerCase()}`}
                      >
                        {status}
                      </span>
                    </td>

                    <td>
                      {featured
                        ? "Yes"
                        : "No"}
                    </td>

                    <td>
                      <div className="fockis-property-actions">
                        {onApprove && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onApprove(
                                id,
                              )
                            }
                          >
                            Approve
                          </button>
                        )}

                        {onReject && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onReject(
                                id,
                              )
                            }
                          >
                            Reject
                          </button>
                        )}

                        {onFeature && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onFeature(
                                id,
                              )
                            }
                          >
                            {featured
                              ? "Unfeature"
                              : "Feature"}
                          </button>
                        )}

                        {onDelete && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onDelete(
                                id,
                              )
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}