import type { CreditTransaction } from "../types/platform.types";
import { TRANSACTION_TYPE_LABELS } from "../utils/platformLabels";
import { CHANNEL_NAME, formatMoney } from "../utils/credits";
import { cx, formatDate, formatNumber } from "../utils/format";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/Feedback";

export function TransactionTable({ rows }: { rows: CreditTransaction[] }) {
  if (!rows.length) return <EmptyState compact icon="receipt" title="No transactions" body="Purchases, sends, and adjustments appear here." />;
  return (
    <div className="fm-tablewrap">
      <table className="fm-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Description</th><th scope="col">Channel</th><th scope="col" className="is-num">Credits</th><th scope="col" className="is-num">Amount</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((t) => (
          <tr key={t.id}>
            <td>{formatDate(t.createdAt)}</td>
            <td>{TRANSACTION_TYPE_LABELS[t.type]}</td>
            <td>{t.description}</td>
            <td>{CHANNEL_NAME[t.channel]}</td>
            <td className={cx("is-num", t.credits > 0 && "fm-pos", t.credits < 0 && "fm-neg")}>{t.credits > 0 ? "+" : ""}{formatNumber(t.credits)}</td>
            <td className="is-num">{t.amount ? formatMoney(t.amount) : "—"}</td>
            <td><Badge tone={t.status === "completed" ? "green" : t.status === "pending" ? "amber" : t.status === "refunded" ? "violet" : "red"} dot>{t.status[0].toUpperCase() + t.status.slice(1)}</Badge></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
