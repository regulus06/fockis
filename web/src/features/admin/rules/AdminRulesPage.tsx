import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    const res = await axios.get("http://localhost:3000/marketplace/rules");
    setRules(res.data);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (rule: any) => {
    await axios.put(`http://localhost:3000/marketplace/rules`, {
      rules: rules.map((r) =>
        r._id === rule._id
          ? { ...r, active: !r.active }
          : r
      ),
    });

    fetchRules();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🌍 Marketplace Rules Panel</h1>

      {rules.map((rule) => (
        <div
          key={rule._id}
          style={{
            border: "1px solid #ddd",
            margin: 10,
            padding: 10,
          }}
        >
          <h3>
            {rule.type.toUpperCase()} → {rule.value}
          </h3>

          <p>Action: {rule.action}</p>
          <p>Status: {rule.active ? "ACTIVE" : "DISABLED"}</p>

          <button onClick={() => toggleRule(rule)}>
            Toggle
          </button>
        </div>
      ))}
    </div>
  );
}