import {
  useEffect,
  useState,
} from "react";

import DomainTable from "../components/DomainTable";

import useDomainAdmin from "../hooks/useDomainAdmin";

import type {
  DomainAssignmentType,
  DomainOwnerType,
  DomainStatus,
} from "../types/domainAdmin.types";

import "../styles/DomainManagement.scss";

export default function DomainManagementPage() {
  const {
    domains,
    loading,
    error,
    loadDomains,
  } = useDomainAdmin();

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<
      DomainStatus | ""
    >("");

  const [
    assignmentType,
    setAssignmentType,
  ] = useState<
    DomainAssignmentType | ""
  >("");

  const [ownerType, setOwnerType] =
    useState<
      DomainOwnerType | ""
    >("");

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadDomains({
          search:
            search.trim() ||
            undefined,

          status:
            status || undefined,

          assignmentType:
            assignmentType ||
            undefined,

          ownerType:
            ownerType || undefined,
        });
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [
    search,
    status,
    assignmentType,
    ownerType,
    loadDomains,
  ]);

  return (
    <div className="domain-management-page">
      <header className="domain-admin-header">
        <div>
          <span className="domain-eyebrow">
            Super App Administration
          </span>

          <h1>
            Domain Management
          </h1>

          <p>
            View and manage every Fockis
            domain and its ownership.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="domain-admin-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <section className="domain-filter-panel">
        <label>
          <span>Search</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search domain or owner..."
          />
        </label>

        <label>
          <span>Status</span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as
                  | DomainStatus
                  | "",
              )
            }
          >
            <option value="">
              All statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="available">
              Available
            </option>

            <option value="suspended">
              Suspended
            </option>

            <option value="expired">
              Expired
            </option>
          </select>
        </label>

        <label>
          <span>Assignment</span>

          <select
            value={assignmentType}
            onChange={(event) =>
              setAssignmentType(
                event.target.value as
                  | DomainAssignmentType
                  | "",
              )
            }
          >
            <option value="">
              All types
            </option>

            <option value="free">
              Free
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="manual">
              Manual
            </option>

            <option value="promotional">
              Promotion
            </option>
          </select>
        </label>

        <label>
          <span>Owner</span>

          <select
            value={ownerType}
            onChange={(event) =>
              setOwnerType(
                event.target.value as
                  | DomainOwnerType
                  | "",
              )
            }
          >
            <option value="">
              Everyone
            </option>

            <option value="user">
              Users
            </option>

            <option value="organization">
              Businesses
            </option>
          </select>
        </label>
      </section>

      <DomainTable
        domains={domains}
        loading={loading}
      />
    </div>
  );
}