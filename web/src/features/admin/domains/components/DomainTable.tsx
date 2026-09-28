import type {
  ManagedDomain,
} from "../types/domainAdmin.types";

interface Props {
  domains: ManagedDomain[];

  loading?: boolean;
}

function assignmentLabel(
  value: ManagedDomain["assignmentType"],
) {
  switch (value) {
    case "free":
      return "Free";

    case "paid":
      return "Paid";

    case "manual":
      return "Manual";

    case "promotional":
      return "Promotion";

    default:
      return value;
  }
}

export default function DomainTable({
  domains,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="domain-table-state">
        Loading domains...
      </div>
    );
  }

  if (!domains.length) {
    return (
      <div className="domain-table-state">
        <strong>
          No domains found.
        </strong>

        <p>
          Registered Fockis domains will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="domain-table-wrapper">
      <table className="domain-table">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Owner</th>
            <th>Type</th>
            <th>Status</th>
            <th>Price</th>
          </tr>
        </thead>

        <tbody>
          {domains.map((domain) => (
            <tr key={domain.id}>
              <td>
                <strong>
                  {domain.domain}
                </strong>
              </td>

              <td>
                <div className="domain-owner">
                  <strong>
                    {domain.ownerName ||
                      domain.organizationName ||
                      "Unassigned"}
                  </strong>

                  <small>
                    {domain.ownerType}
                  </small>
                </div>
              </td>

              <td>
                <span className="domain-badge">
                  {assignmentLabel(
                    domain.assignmentType,
                  )}
                </span>
              </td>

              <td>
                <span
                  className={`domain-status domain-status--${domain.status}`}
                >
                  {domain.status}
                </span>
              </td>

              <td>
                {domain.isFree
                  ? "FREE"
                  : `$${domain.price.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}