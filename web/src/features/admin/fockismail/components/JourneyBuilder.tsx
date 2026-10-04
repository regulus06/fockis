import { useState } from "react";
import type { Journey, JourneyNodeData, JourneyNodeKind } from "../types/mailchimp.types";
import { JOURNEY_NODE_LABELS } from "../utils/labels";
import { uid } from "../utils/format";
import { JourneyNode, BRANCHING, NODE_ICONS, isBranch } from "./JourneyNode";
import { ActionMenu } from "./ui/Menu";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/Field";
import { Icon } from "./ui/Icon";

// ---------------------------------------------------------------------------
// Immutable tree helpers
// ---------------------------------------------------------------------------

type Path = { list: "root" } | { parentId: string; branch: "yes" | "no" };

function mapTree(nodes: JourneyNodeData[], fn: (n: JourneyNodeData) => JourneyNodeData | null): JourneyNodeData[] {
  return nodes.flatMap((n) => {
    const next = fn(n);
    if (!next) return [];
    return [{ ...next, yes: next.yes && mapTree(next.yes, fn), no: next.no && mapTree(next.no, fn) }];
  });
}

function insertInto(nodes: JourneyNodeData[], path: Path, index: number, node: JourneyNodeData): JourneyNodeData[] {
  if ("list" in path) return [...nodes.slice(0, index), node, ...nodes.slice(index)];
  return mapTree(nodes, (n) => {
    if (n.id !== path.parentId) return n;
    const list = n[path.branch] ?? [];
    return { ...n, [path.branch]: [...list.slice(0, index), node, ...list.slice(index)] };
  });
}

export function findNode(nodes: JourneyNodeData[], id: string): JourneyNodeData | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const inner = findNode(n.yes ?? [], id) ?? findNode(n.no ?? [], id);
    if (inner) return inner;
  }
  return null;
}

export function countNodes(nodes: JourneyNodeData[], kind?: JourneyNodeKind): number {
  return nodes.reduce(
    (s, n) => s + (!kind || n.kind === kind ? 1 : 0) + countNodes(n.yes ?? [], kind) + countNodes(n.no ?? [], kind),
    0,
  );
}

const DEFAULTS: Record<JourneyNodeKind, [string, string]> = {
  trigger: ["New trigger", "Choose what starts this journey"],
  email: ["Send email", "Choose a template"],
  wait: ["Wait 1 day", "Delay 24 hours"],
  condition: ["Opened email?", "Opened the previous email"],
  tag: ["Add tag", "Choose a tag"],
  webhook: ["Call webhook", "POST to your endpoint"],
  sms: ["Send SMS", "Choose an SMS template"],
  audience: ["Move to audience", "Choose an audience"],
  purchase: ["Purchased?", "Any marketplace order"],
  event: ["Fockis event", "e.g., watched a Wave"],
};

const ADDABLE: JourneyNodeKind[] = ["email", "wait", "condition", "purchase", "tag", "sms", "webhook", "audience", "event"];

function makeNode(kind: JourneyNodeKind): JourneyNodeData {
  const [title, detail] = DEFAULTS[kind];
  return { id: uid("node"), kind, title, detail, ...(BRANCHING.includes(kind) ? { yes: [], no: [] } : {}) };
}

// ---------------------------------------------------------------------------

interface BuilderProps {
  journey: Journey;
  onChange: (j: Journey) => void;
}

export function JourneyBuilder({ journey, onChange }: BuilderProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const sel = selected ? findNode(journey.nodes, selected) : null;

  const setNodes = (nodes: JourneyNodeData[]) => onChange({ ...journey, nodes });

  const add = (path: Path, index: number, kind: JourneyNodeKind) => {
    const node = makeNode(kind);
    setNodes(insertInto(journey.nodes, path, index, node));
    setSelected(node.id);
  };

  const addButton = (path: Path, index: number) => (
    <div className="fm-jadd">
      <span className="fm-jline" aria-hidden />
      <ActionMenu
        label="Add a step here"
        items={ADDABLE.map((k) => ({ label: JOURNEY_NODE_LABELS[k], icon: NODE_ICONS[k], onSelect: () => add(path, index, k) }))}
      />
      <span className="fm-jline" aria-hidden />
    </div>
  );

  const renderList = (nodes: JourneyNodeData[], path: Path) => (
    <div className="fm-jlist">
      {nodes.map((n, i) => (
        <div key={n.id} className="fm-jitem">
          {i > 0 && addButton(path, i)}
          <JourneyNode node={n} selected={n.id === selected} onSelect={() => setSelected(n.id)} />
          {isBranch(n) && (
            <div className="fm-jbranches">
              <div className="fm-jbranch is-yes">
                <span className="fm-jbranch__label"><Icon name="check" size={12} /> Yes</span>
                {renderList(n.yes ?? [], { parentId: n.id, branch: "yes" })}
              </div>
              <div className="fm-jbranch is-no">
                <span className="fm-jbranch__label"><Icon name="x" size={12} /> No</span>
                {renderList(n.no ?? [], { parentId: n.id, branch: "no" })}
              </div>
            </div>
          )}
        </div>
      ))}
      {addButton(path, nodes.length)}
      {"list" in path && <span className="fm-jexit">Exit journey</span>}
    </div>
  );

  return (
    <div className="fm-journey">
      <div className="fm-journey__canvas" onClick={() => setSelected(null)}>
        <div className="fm-journey__zoom" role="group" aria-label="Zoom">
          <IconButton icon="divider" label="Zoom out" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1))); }} />
          <span>{Math.round(zoom * 100)}%</span>
          <IconButton icon="plus" label="Zoom in" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(1))); }} />
        </div>
        <div className="fm-journey__flow" style={{ transform: `scale(${zoom})` }}>
          {renderList(journey.nodes, { list: "root" })}
        </div>
      </div>

      <aside className="fm-journey__props" aria-label="Step settings">
        {sel ? (
          <>
            <div className="fm-eb-props__head">
              <h3><Icon name={NODE_ICONS[sel.kind]} size={16} /> {JOURNEY_NODE_LABELS[sel.kind]}</h3>
            </div>
            <TextField label="Step name" value={sel.title} onChange={(e) => setNodes(mapTree(journey.nodes, (n) => (n.id === sel.id ? { ...n, title: e.target.value } : n)))} />
            <TextField label="Details" value={sel.detail} onChange={(e) => setNodes(mapTree(journey.nodes, (n) => (n.id === sel.id ? { ...n, detail: e.target.value } : n)))} hint={sel.kind === "webhook" ? "The backend signs webhook calls. Never paste secrets here." : undefined} />
            {sel.kind !== "trigger" && (
              <Button
                variant="danger"
                icon="trash"
                onClick={() => {
                  setNodes(mapTree(journey.nodes, (n) => (n.id === sel.id ? null : n)));
                  setSelected(null);
                }}
              >
                Delete step{isBranch(sel) ? " and its branches" : ""}
              </Button>
            )}
          </>
        ) : (
          <>
            <h3>Journey</h3>
            <p className="fm-muted fm-small">Select a step to edit it. Use the + buttons between steps to add emails, waits, conditions, tags, SMS, or webhooks.</p>
            <dl className="fm-deflist">
              <div><dt>Steps</dt><dd>{countNodes(journey.nodes)}</dd></div>
              <div><dt>Emails</dt><dd>{countNodes(journey.nodes, "email")}</dd></div>
            </dl>
          </>
        )}
      </aside>
    </div>
  );
}
