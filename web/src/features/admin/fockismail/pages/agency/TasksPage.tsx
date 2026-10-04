import { useState } from "react";
import type { AgencyTask, TaskPriority, TaskStatus } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { agencyApi } from "../../services/agencyApi";
import { Avatar, Badge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { PageHeader, Panel, Toolbar } from "../../components/ui/Layout";
import { FilterSelect, SearchInput, SelectField, TextField } from "../../components/ui/Field";
import { EmptyState, SkeletonCards } from "../../components/ui/Feedback";
import { ActionMenu } from "../../components/ui/Menu";
import { Modal } from "../../components/ui/Overlay";
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES, TASK_STATUS_LABELS } from "../../utils/platformLabels";
import { cx, formatDate } from "../../utils/format";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "waiting", "completed"];
const ASSIGNEES = ["Elince M.", "Dana Ross", "Kofi Asante", "Maya Lin"];
type Draft = Omit<AgencyTask, "id" | "createdAt"> & { id?: string };

export default function TasksPage() {
  const run = useAction();
  const { confirm } = useMailchimp();
  const { businesses } = useMarketingWorkspace();
  const tasks = useAsync(() => agencyApi.getTasks(), []);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const clients = businesses.filter((b) => !b.isAgencyOwner);
  const name = (id: string) => businesses.find((b) => b.id === id)?.name ?? "—";

  const rows = (tasks.data ?? []).filter((t) => (client === "all" || t.businessId === client) && (assignee === "all" || t.assignee === assignee) && t.title.toLowerCase().includes(search.toLowerCase()));
  const save = async (t: Draft, msg: string) => {
    const next = await run(() => agencyApi.saveTask(t), msg);
    if (next) tasks.reload();
    return next;
  };
  const overdue = (t: AgencyTask) => t.status !== "completed" && new Date(t.dueDate).getTime() < Date.now();

  const card = (t: AgencyTask) => (
    <article key={t.id} className={cx("fm-taskcard", t.status === "completed" && "is-done")}>
      <header>
        <Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
        <ActionMenu label={`Actions for ${t.title}`} items={[
          { label: "Edit", icon: "edit", onSelect: () => setDraft({ ...t }) },
          ...STATUSES.filter((s) => s !== t.status).map((s) => ({ label: `Move to ${TASK_STATUS_LABELS[s].toLowerCase()}`, icon: (s === "completed" ? "check" : "arrowUp") as "check" | "arrowUp", onSelect: () => save({ ...t, status: s }, `Moved to ${TASK_STATUS_LABELS[s].toLowerCase()}.`) })),
          { label: "Delete", icon: "trash", danger: true, separated: true, onSelect: async () => {
            if (await confirm({ title: "Delete this task?", confirmLabel: "Delete task", danger: true }) && (await run(() => agencyApi.deleteTask(t.id), "Task deleted.")) !== undefined) tasks.reload();
          } },
        ]} />
      </header>
      <h3>{t.title}</h3>
      <p>{name(t.businessId)}</p>
      <footer>
        <span className="fm-row fm-row--tight"><Avatar name={t.assignee} size={22} /> <small>{t.assignee}</small></span>
        <small className={cx(overdue(t) && "fm-overdue")}>{overdue(t) ? "Overdue · " : ""}{formatDate(t.dueDate)}</small>
      </footer>
    </article>
  );

  return (
    <div className="fm-page">
      <PageHeader title="Tasks" description="Your team's to-do list across every client." actions={<Button variant="primary" icon="plus" onClick={() => setDraft({ title: "", businessId: clients[0]?.id ?? "", assignee: ASSIGNEES[0], priority: "medium", status: "todo", dueDate: new Date(Date.now() + 3 * 86400000).toISOString() })}>New task</Button>} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks" />
        <FilterSelect label="Client" value={client} onChange={setClient} options={[{ value: "all", label: "All clients" }, ...clients.map((b) => ({ value: b.id, label: b.name }))]} />
        <FilterSelect label="Assignee" value={assignee} onChange={setAssignee} options={[{ value: "all", label: "Anyone" }, ...ASSIGNEES.map((a) => ({ value: a, label: a }))]} />
        <span className="fm-toolbar__spacer" />
        <div className="fm-viewtoggle" role="group" aria-label="View">
          <IconButton icon="columns" label="Board view" active={view === "board"} onClick={() => setView("board")} />
          <IconButton icon="layout" label="List view" active={view === "list"} onClick={() => setView("list")} />
        </div>
      </Toolbar>

      {tasks.loading ? <SkeletonCards count={4} height={160} /> : rows.length === 0 ? <Panel><EmptyState icon="layout" title="No tasks" body="Create tasks like “Prepare monthly report” or “Import contacts”." /></Panel> : view === "board" ? (
        <div className="fm-board">
          {STATUSES.map((s) => {
            const col = rows.filter((t) => t.status === s);
            return (
              <section key={s} className="fm-board__col" aria-label={TASK_STATUS_LABELS[s]}>
                <h2>{TASK_STATUS_LABELS[s]} <span>{col.length}</span></h2>
                {col.map(card)}
                {col.length === 0 && <p className="fm-board__empty">Nothing here</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <Panel flush>
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Task</th><th scope="col">Client</th><th scope="col">Assignee</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Due</th></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id}>
                <td className="fm-table__primary"><button type="button" className="fm-linkbtn" onClick={() => setDraft({ ...t })}>{t.title}</button></td>
                <td>{name(t.businessId)}</td>
                <td>{t.assignee}</td>
                <td><Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge></td>
                <td><FilterSelect label={`Status of ${t.title}`} value={t.status} onChange={(v) => save({ ...t, status: v as TaskStatus }, "Status updated.")} options={STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))} /></td>
                <td className={cx(overdue(t) && "fm-overdue")}>{formatDate(t.dueDate)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Panel>
      )}

      <Modal open={Boolean(draft)} title={draft?.id ? "Edit task" : "New task"} size="sm" onClose={() => setDraft(null)}
        footer={draft && <><Button onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" disabled={!draft.title.trim() || !draft.businessId} onClick={async () => { if (await save(draft, draft.id ? "Task saved." : "Task created.")) setDraft(null); }}>{draft.id ? "Save task" : "Create task"}</Button></>}
      >
        {draft && (
          <>
            <TextField label="Task" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Prepare monthly report" data-autofocus />
            <SelectField label="Client" value={draft.businessId} onChange={(e) => setDraft({ ...draft, businessId: e.target.value })} options={clients.map((b) => ({ value: b.id, label: b.name }))} />
            <div className="fm-formgrid">
              <SelectField label="Assignee" value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} options={ASSIGNEES.map((a) => ({ value: a, label: a }))} />
              <SelectField label="Priority" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })} options={(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }))} />
              <SelectField label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })} options={STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }))} />
              <TextField label="Due date" type="date" value={draft.dueDate.slice(0, 10)} onChange={(e) => e.target.value && setDraft({ ...draft, dueDate: new Date(`${e.target.value}T17:00:00`).toISOString() })} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
