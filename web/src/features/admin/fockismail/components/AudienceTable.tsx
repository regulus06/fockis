import { Link } from "react-router-dom";
import type { Contact, Tag } from "../types/mailchimp.types";
import { CONTACT_SOURCE_LABELS, CONTACT_STATUS_LABELS, CONTACT_STATUS_TONES } from "../utils/labels";
import { formatCurrency, formatDate, timeAgo } from "../utils/format";
import { Avatar, Badge, TagChip } from "./ui/Badge";
import { Checkbox } from "./ui/Field";
import { IconButton } from "./ui/Button";
import { useMarketingPath } from "../hooks/useMailchimp";

type SortKey = "name" | "joinedAt" | "lastActivityAt" | "revenue";

interface Props {
  contacts: Contact[];
  tags: Tag[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onQuickView: (c: Contact) => void;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}

export type { SortKey };

export function AudienceTable({ contacts, tags, selected, onToggle, onToggleAll, onQuickView, sort, onSort }: Props) {
  const to = useMarketingPath();
  const allOn = contacts.length > 0 && contacts.every((c) => selected.has(c.id));
  const someOn = contacts.some((c) => selected.has(c.id));
  const tagById = (id: string) => tags.find((t) => t.id === id);

  const sortHeader = (k: SortKey, label: string, num?: boolean) => (
    <th scope="col" className={num ? "is-num" : undefined} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="fm-sortbtn" onClick={() => onSort(k)}>
        {label}
        <span aria-hidden>{sort.key === k ? (sort.dir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className="fm-tablewrap">
      <table className="fm-table fm-table--select">
        <thead>
          <tr>
            <th scope="col" className="is-check">
              <Checkbox hideLabel label="Select all contacts on this page" checked={allOn} indeterminate={!allOn && someOn} onChange={onToggleAll} />
            </th>
            {sortHeader("name", "Name")}
            <th scope="col">Status</th>
            <th scope="col">Tags</th>
            <th scope="col">Source</th>
            {sortHeader("joinedAt", "Joined")}
            {sortHeader("lastActivityAt", "Last activity")}
            {sortHeader("revenue", "Revenue", true)}
            <th scope="col"><span className="fm-sr">Quick view</span></th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} className={selected.has(c.id) ? "is-selected" : undefined}>
              <td className="is-check">
                <Checkbox hideLabel label={`Select ${c.firstName} ${c.lastName}`} checked={selected.has(c.id)} onChange={() => onToggle(c.id)} />
              </td>
              <td className="fm-table__primary">
                <div className="fm-person">
                  <Avatar name={`${c.firstName} ${c.lastName}`} />
                  <div>
                    <Link to={to(`audience/${c.id}`)}>{c.firstName} {c.lastName}</Link>
                    {c.vip && <span className="fm-vip" title="VIP">VIP</span>}
                    <span className="fm-table__sub">{c.email}</span>
                  </div>
                </div>
              </td>
              <td><Badge tone={CONTACT_STATUS_TONES[c.status]} dot>{CONTACT_STATUS_LABELS[c.status]}</Badge></td>
              <td>
                <div className="fm-chipset fm-chipset--tight">
                  {c.tagIds.slice(0, 2).map((id) => {
                    const t = tagById(id);
                    return t ? <TagChip key={id} name={t.name} color={t.color} /> : null;
                  })}
                  {c.tagIds.length > 2 && <span className="fm-muted fm-small">+{c.tagIds.length - 2}</span>}
                </div>
              </td>
              <td>{CONTACT_SOURCE_LABELS[c.source]}</td>
              <td>{formatDate(c.joinedAt)}</td>
              <td>{timeAgo(c.lastActivityAt)}</td>
              <td className="is-num">{formatCurrency(c.revenue)}</td>
              <td className="is-actions">
                <IconButton icon="eye" label={`Quick view ${c.firstName} ${c.lastName}`} onClick={() => onQuickView(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
