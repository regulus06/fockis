import type { AiPlan } from "../types/aiAdmin.types";

interface Props {
  plans: AiPlan[];
  onEdit: (plan: AiPlan) => void;
}

export default function AiPlanAccessTable({ plans, onEdit }: Props) {
  return (
    <div className="ai-table-wrap">
      <table className="ai-table">
        <thead>
          <tr>
            <th>Plan</th>
            <th>Chat</th>
            <th>Voice</th>
            <th>Phone</th>
            <th>Recommendations</th>
            <th>Special Ads</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>
                <strong>{plan.name}</strong>
                <small>{plan.description}</small>
              </td>
              <td>{plan.permissions.chat ? "ON" : "OFF"}</td>
              <td>{plan.permissions.voice ? "ON" : "OFF"}</td>
              <td>{plan.permissions.phoneCalls ? "ON" : "OFF"}</td>
              <td>{plan.permissions.recommendations ? "ON" : "OFF"}</td>
              <td>{plan.permissions.specialAds ? "ON" : "OFF"}</td>
              <td>
                <button className="ai-btn ai-btn-ghost" onClick={() => onEdit(plan)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
