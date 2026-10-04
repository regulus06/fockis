import type { JourneyNodeData, JourneyNodeKind } from "../types/mailchimp.types";
import { JOURNEY_NODE_LABELS } from "../utils/labels";
import { Icon, type IconName } from "./ui/Icon";
import { cx } from "../utils/format";

export const NODE_ICONS: Record<JourneyNodeKind, IconName> = {
  trigger: "zap", email: "mail", wait: "clock", condition: "branch", tag: "tag",
  webhook: "webhook", sms: "message", audience: "users", purchase: "cart", event: "sparkle",
};

export const BRANCHING: JourneyNodeKind[] = ["condition", "purchase"];

export function isBranch(n: JourneyNodeData): boolean {
  return Boolean(n.yes || n.no);
}

interface Props {
  node: JourneyNodeData;
  selected: boolean;
  onSelect: () => void;
}

export function JourneyNode({ node, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={cx("fm-jnode", `is-${node.kind}`, selected && "is-selected")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      aria-pressed={selected}
    >
      <span className="fm-jnode__icon"><Icon name={NODE_ICONS[node.kind]} size={16} /></span>
      <span className="fm-jnode__text">
        <small>{JOURNEY_NODE_LABELS[node.kind]}</small>
        <strong>{node.title}</strong>
        <span>{node.detail}</span>
      </span>
    </button>
  );
}
