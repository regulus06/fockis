import type { EmailDocument, EmailTemplate, TemplateCategory } from "../types/mailchimp.types";
import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";
import { activeBusinessId, db, findOrThrow, removeById, upsert } from "./mockDb";
import { uid } from "../utils/format";
import { cloneDocument } from "../utils/emailBlocks";

export const templatesApi = {
  list: () => call<EmailTemplate[]>(() => db.templates, ENDPOINTS.templates),

  get: (id: string) => call<EmailTemplate>(() => findOrThrow(db.templates, id, "Template"), ENDPOINTS.template(id)),

  save: (input: { id?: string; name: string; category: TemplateCategory; document: EmailDocument; description?: string }) =>
    call<EmailTemplate>(() => {
      const existing = input.id ? db.templates.find((t) => t.id === input.id) : undefined;
      return upsert(db.templates, {
        id: existing?.id ?? uid("tpl"),
        businessId: activeBusinessId(),
        name: input.name,
        category: input.category,
        description: input.description ?? existing?.description ?? "Saved from the email builder.",
        fockisSpecific: existing?.fockisSpecific ?? false,
        accent: existing?.accent ?? "#1f5eff",
        usageCount: existing?.usageCount ?? 0,
        updatedAt: new Date().toISOString(),
        document: input.document,
      });
    }, input.id ? ENDPOINTS.template(input.id) : ENDPOINTS.templates, {
      method: input.id ? "PUT" : "POST",
      body: input,
    }),

  duplicate: (id: string) =>
    call<EmailTemplate>(() => {
      const t = findOrThrow(db.templates, id, "Template");
      return upsert(db.templates, {
        ...t,
        id: uid("tpl"), businessId: activeBusinessId(),
        name: `${t.name} (copy)`,
        usageCount: 0,
        updatedAt: new Date().toISOString(),
        document: cloneDocument(t.document),
      });
    }, `${ENDPOINTS.template(id)}/duplicate`, { method: "POST" }),

  remove: (id: string) => call<void>(() => removeById(db.templates, id), ENDPOINTS.template(id), { method: "DELETE" }),
};
