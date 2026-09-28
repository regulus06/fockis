import { useEffect, useState } from "react";
import { aiAdminApi } from "../api/aiAdminApi";
import type { AiPlan } from "../types/aiAdmin.types";
import AiPlanAccessTable from "../components/AiPlanAccessTable";
import AiPlanEditor from "../components/AiPlanEditor";
import "../styles/AiAdmin.scss";

const demoPlans: AiPlan[] = [
  { id: "free", name: "Free", description: "No paid AI access", price: 0, status: "active", permissions: { chat:false, voice:false, phoneCalls:false, recommendations:false, specialAds:false }, limits:{chatMessages:0,voiceMinutes:0,phoneMinutes:0,recommendations:0} },
  { id: "basic", name: "Basic", description: "AI chat access", price: 4.99, status: "active", permissions: { chat:true, voice:false, phoneCalls:false, recommendations:false, specialAds:false }, limits:{chatMessages:300,voiceMinutes:0,phoneMinutes:0,recommendations:0} },
  { id: "pro", name: "Pro", description: "Chat, voice and recommendations", price: 12.99, status: "active", permissions: { chat:true, voice:true, phoneCalls:false, recommendations:true, specialAds:true }, limits:{chatMessages:1000,voiceMinutes:300,phoneMinutes:0,recommendations:300} },
  { id: "premium", name: "Premium", description: "Full Fockis AI access", price: 24.99, status: "active", permissions: { chat:true, voice:true, phoneCalls:true, recommendations:true, specialAds:true }, limits:{chatMessages:3000,voiceMinutes:1000,phoneMinutes:500,recommendations:1000} },
];

export default function AiPlansPage() {
  const [plans, setPlans] = useState<AiPlan[]>(demoPlans);
  const [editing, setEditing] = useState<AiPlan | null>(null);

  useEffect(() => {
    aiAdminApi.getPlans().then(setPlans).catch(() => {});
  }, []);

  const save = async (plan: AiPlan) => {
    try {
      const saved = await aiAdminApi.updatePlan(plan.id, plan);
      setPlans((items) => items.map((item) => item.id === saved.id ? saved : item));
    } catch {
      setPlans((items) => items.map((item) => item.id === plan.id ? plan : item));
    }
    setEditing(null);
  };

  return (
    <div className="ai-admin-page">
      <header className="ai-page-header">
        <div>
          <span className="ai-eyebrow">Access policy</span>
          <h1>Plans & Access</h1>
          <p>Define the default AI capabilities included with each membership plan.</p>
        </div>
      </header>
      <section className="ai-panel">
        <AiPlanAccessTable plans={plans} onEdit={setEditing} />
      </section>
      <AiPlanEditor plan={editing} onClose={() => setEditing(null)} onSave={save} />
    </div>
  );
}
