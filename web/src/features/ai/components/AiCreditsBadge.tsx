import { useAiCredits } from "../hooks/useAiCredits";
import { formatAiCredits } from "../utils/aiFormatters";

export default function AiCreditsBadge() {
  const { credits, loading } = useAiCredits();

  return (
    <div className="fockis-ai-credits">
      <span>AI Credits</span>
      <strong>{loading ? "…" : formatAiCredits(credits?.balance)}</strong>
    </div>
  );
}
