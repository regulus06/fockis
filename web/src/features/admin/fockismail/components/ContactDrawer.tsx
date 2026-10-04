import type { Contact, Tag } from "../types/mailchimp.types";
import { Drawer } from "./ui/Overlay";
import { Avatar, Badge, TagChip } from "./ui/Badge";
import { LinkButton } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { CONTACT_SOURCE_LABELS, CONTACT_STATUS_LABELS, CONTACT_STATUS_TONES } from "../utils/labels";
import { formatCurrency, formatDate, timeAgo } from "../utils/format";
import { useMarketingPath } from "../hooks/useMailchimp";

export function ContactDrawer({ contact, tags, onClose }: { contact: Contact | null; tags: Tag[]; onClose: () => void }) {
  const to = useMarketingPath();
  if (!contact) return null;
  const c = contact;
  return (
    <Drawer
      open
      title="Contact"
      onClose={onClose}
      footer={<LinkButton to={to(`audience/${c.id}`)} variant="primary" icon="users">Open full profile</LinkButton>}
    >
      <div className="fm-contacthead">
        <Avatar name={`${c.firstName} ${c.lastName}`} size={52} />
        <div>
          <h3>{c.firstName} {c.lastName} {c.vip && <span className="fm-vip">VIP</span>}</h3>
          <p>{c.email}</p>
          <Badge tone={CONTACT_STATUS_TONES[c.status]} dot>{CONTACT_STATUS_LABELS[c.status]}</Badge>
        </div>
      </div>
      <dl className="fm-deflist">
        <div><dt><Icon name="phone" size={14} /> Phone</dt><dd>{c.phone ?? "—"}</dd></div>
        <div><dt><Icon name="pin" size={14} /> Location</dt><dd>{c.location || "—"}</dd></div>
        <div><dt>Source</dt><dd>{CONTACT_SOURCE_LABELS[c.source]}</dd></div>
        <div><dt>Joined</dt><dd>{formatDate(c.joinedAt)}</dd></div>
        <div><dt>Revenue</dt><dd>{formatCurrency(c.revenue)} from {c.orderCount} orders</dd></div>
      </dl>
      <h4 className="fm-subhead">Tags</h4>
      <div className="fm-chipset">
        {c.tagIds.length ? c.tagIds.map((id) => {
          const t = tags.find((x) => x.id === id);
          return t ? <TagChip key={id} name={t.name} color={t.color} /> : null;
        }) : <span className="fm-muted">No tags</span>}
      </div>
      <h4 className="fm-subhead">Recent activity</h4>
      <ul className="fm-timeline is-compact">
        {c.activity.slice(0, 5).map((a) => (
          <li key={a.id}>
            <span className={`fm-timeline__dot is-${a.kind}`} />
            <p>{a.label}</p>
            <time>{timeAgo(a.at)}</time>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
