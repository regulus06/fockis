import { useState } from "react";
import type { Tag } from "../types/mailchimp.types";
import { useTags } from "../hooks/useAudience";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { audienceApi } from "../services/audienceApi";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../components/ui/Layout";
import { SearchInput, TextArea, TextField } from "../components/ui/Field";
import { EmptyState, ErrorState, SkeletonRows } from "../components/ui/Feedback";
import { ActionMenu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Overlay";
import { TagChip } from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import { formatDate, formatNumber, timeAgo, cx } from "../utils/format";

const COLORS = ["#1f5eff", "#0e9f6e", "#7c3aed", "#e0598b", "#c98a04", "#0891b2", "#d64545", "#475569"];

type Mode = { kind: "create" } | { kind: "rename"; tag: Tag } | { kind: "assign"; tag: Tag } | null;

export default function TagsPage() {
  const tags = useTags();
  const run = useAction();
  const to = useMarketingPath();
  const navigate = useNavigate();
  const { confirm } = useMailchimp();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [emails, setEmails] = useState("");

  const list = (tags.data ?? []).filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const parsed = emails.split(/[\s,;]+/).filter((e) => e.includes("@"));

  const close = () => {
    setMode(null);
    setName("");
    setEmails("");
  };

  const submit = async () => {
    if (!mode) return;
    let ok: unknown;
    if (mode.kind === "create") ok = await run(() => audienceApi.createTag(name.trim(), color), `Created tag “${name.trim()}”.`);
    if (mode.kind === "rename") ok = await run(() => audienceApi.renameTag(mode.tag.id, name.trim()), "Tag renamed.");
    if (mode.kind === "assign") {
      const res = await run(() => audienceApi.assignTagByEmail(mode.tag.id, parsed));
      if (res) await run(async () => res, `Tagged ${res.matched} of ${parsed.length} contacts.`);
      ok = res;
    }
    if (ok) {
      close();
      tags.reload();
    }
  };

  return (
    <div className="fm-page">
      <PageHeader
        title="Tags"
        description="Labels you add to contacts, like “VIP” or “Seller”, to target and organize them."
        actions={<Button variant="primary" icon="plus" onClick={() => { setName(""); setColor(COLORS[0]); setMode({ kind: "create" }); }}>Create tag</Button>}
      />
      <Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Search tags" /></Toolbar>
      <Panel flush>
        {tags.error ? (
          <ErrorState message={tags.error} onRetry={tags.reload} />
        ) : tags.loading ? (
          <SkeletonRows rows={8} cols={4} />
        ) : list.length === 0 ? (
          <EmptyState icon="tag" title={search ? "No tags match" : "No tags yet"} body={search ? "Try a different name." : "Create a tag, then add it to contacts from the Audience page."} />
        ) : (
          <div className="fm-tablewrap">
            <table className="fm-table">
              <thead><tr><th scope="col">Tag</th><th scope="col" className="is-num">Contacts</th><th scope="col">Created</th><th scope="col">Last used</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td><TagChip name={t.name} color={t.color} /></td>
                    <td className="is-num">{formatNumber(t.contactCount)}</td>
                    <td>{formatDate(t.createdAt)}</td>
                    <td>{timeAgo(t.lastUsedAt)}</td>
                    <td className="is-actions">
                      <ActionMenu label={`Actions for ${t.name}`} items={[
                        { label: "View contacts", icon: "users", onSelect: () => navigate(`${to("audience")}?tag=${t.id}`) },
                        { label: "Assign contacts", icon: "plus", onSelect: () => setMode({ kind: "assign", tag: t }) },
                        { label: "Rename", icon: "edit", onSelect: () => { setName(t.name); setMode({ kind: "rename", tag: t }); } },
                        { label: "Delete", icon: "trash", danger: true, separated: true, onSelect: async () => {
                          if (!(await confirm({ title: `Delete “${t.name}”?`, body: `It's removed from ${formatNumber(t.contactCount)} contacts. The contacts themselves stay.`, confirmLabel: "Delete tag", danger: true }))) return;
                          if ((await run(() => audienceApi.deleteTag(t.id), "Tag deleted.")) !== undefined) tags.reload();
                        } },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(mode)}
        title={mode?.kind === "create" ? "Create tag" : mode?.kind === "rename" ? "Rename tag" : `Assign “${mode?.kind === "assign" ? mode.tag.name : ""}”`}
        size="sm"
        onClose={close}
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={mode?.kind === "assign" ? parsed.length === 0 : !name.trim()} onClick={submit}>{mode?.kind === "create" ? "Create tag" : mode?.kind === "rename" ? "Save name" : "Assign tag"}</Button></>}
      >
        {mode?.kind === "assign" ? (
          <TextArea label="Contact emails" rows={5} value={emails} onChange={(e) => setEmails(e.target.value)} hint={`${parsed.length} email${parsed.length === 1 ? "" : "s"}. Separate with commas or new lines. To tag many at once, select contacts on the Audience page.`} data-autofocus />
        ) : (
          <>
            <TextField label="Tag name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} data-autofocus />
            {mode?.kind === "create" && (
              <div className="fm-field">
                <span className="fm-field__label">Color</span>
                <div className="fm-swatches" role="radiogroup" aria-label="Tag color">
                  {COLORS.map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={cx(color === c && "is-active")} style={{ background: c }} onClick={() => setColor(c)} />
                  ))}
                </div>
                {name && <TagChip name={name} color={color} />}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
