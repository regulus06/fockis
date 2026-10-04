import type {



  Audience,



  Contact,



  ContactInput,



  ContactStatus,



  Segment,



  SegmentCondition,



  Tag,



} from "../types/fockis-mail.types";







import { ENDPOINTS } from "./endpoints";



import { call } from "./httpClient";



import {



  activeBusinessId,



  db,



  findOrThrow,



  removeById,



  upsert,



} from "./mockDb";



import { uid } from "../utils/format";



type AudienceContact = Contact & {

  businessId: string;

  status: ContactStatus;

  vip: boolean;

  joinedAt: string;

  tagIds: string[];

  audienceIds: string[];

  location: string;

  revenue: number;

  email: string;

  firstName: string;

  lastName: string;

};



type SegmentDraft = {

  id?: string;

  name: string;

  match: "all" | "any";

  conditions: SegmentCondition[];

};



function mockContacts(): AudienceContact[] {

  return db.contacts as AudienceContact[];

}







export interface ContactQuery {



  search?: string;



  status?: ContactStatus | "all" | "vip";



  tagId?: string;



  audienceId?: string;



}







export interface AudienceStats {



  total: number;



  subscribed: number;



  unsubscribed: number;



  cleaned: number;



  pending: number;



  vip: number;



  newThisMonth: number;



}







export type BulkContactAction =



  | { kind: "delete" }



  | { kind: "tag"; tagId: string }



  | { kind: "untag"; tagId: string }



  | { kind: "status"; status: ContactStatus };







/* -------------------------------------------------------------------------- */



/* Mock helpers                                                               */



/* -------------------------------------------------------------------------- */







function filterContacts(q: ContactQuery): AudienceContact[] {



  return mockContacts().filter((c) => {



    if (q.status === "vip" && !c.vip) {



      return false;



    }







    if (



      q.status &&



      q.status !== "all" &&



      q.status !== "vip" &&



      c.status !== q.status



    ) {



      return false;



    }







    if (q.tagId && !c.tagIds.includes(q.tagId)) {



      return false;



    }







    if (



      q.audienceId &&



      q.audienceId !== "all" &&



      !c.audienceIds.includes(q.audienceId)



    ) {



      return false;



    }







    if (q.search) {



      const search = q.search.toLowerCase();







      const haystack =



        `${c.firstName} ${c.lastName} ${c.email} ${c.location}`.toLowerCase();







      if (!haystack.includes(search)) {



        return false;



      }



    }







    return true;



  });



}







/**



 * Mock-only estimate.



 *



 * The real backend should eventually evaluate segment conditions



 * against actual contacts.



 */



function estimateSegment(



  conditions: SegmentCondition[],



  match: "all" | "any",



): number {



  if (!conditions.length) {



    return mockContacts().length * 670;



  }







  const base = 48210;







  const factor = conditions.reduce(



    (f, condition) =>



      match === "all"



        ? f * (0.35 + (condition.value.length % 5) * 0.1)



        : f + 0.12,



    match === "all" ? 1 : 0.1,



  );







  return Math.max(12, Math.round(base * Math.min(factor, 0.95)));



}







/* -------------------------------------------------------------------------- */



/* Audience API                                                               */



/* -------------------------------------------------------------------------- */







export const audienceApi = {



  /**



   * Get all audiences belonging to the current Fockis Mail workspace.



   *



   * Real mode:



   *   GET /fockis-mail/audiences



   */



  audiences: () =>



    call<Audience[]>(



      () => db.audiences,



      ENDPOINTS.audiences,



    ),







  /**



   * Get contact statistics.



   *



   * Real mode:



   *   GET /fockis-mail/contacts/stats



   */



  stats: () =>



    call<AudienceStats>(



      () => {



        const scale = db.scale;







        const count = (predicate: (contact: AudienceContact) => boolean) =>



          mockContacts().filter(predicate).length * scale;







        const monthAgo = Date.now() - 30 * 86400000;







        return {



          total: mockContacts().length * scale,







          subscribed: count(



            (contact) => contact.status === "subscribed",



          ),







          unsubscribed: count(



            (contact) => contact.status === "unsubscribed",



          ),







          cleaned: count(



            (contact) => contact.status === "cleaned",



          ),







          pending: count(



            (contact) => contact.status === "pending",



          ),







          vip: count(



            (contact) => contact.vip,



          ),







          newThisMonth: count(



            (contact) =>



              new Date(contact.joinedAt).getTime() > monthAgo,



          ),



        };



      },



      `${ENDPOINTS.contacts}/stats`,



    ),







  /**



   * Get contacts.



   *



   * Real mode:



   *   GET /fockis-mail/contacts



   *



   * Supported backend query parameters:



   *   q



   *   status



   *   audienceId



   *   tagId



   */



  contacts: (query: ContactQuery = {}) =>



    call<AudienceContact[]>(



      () => filterContacts(query),



      ENDPOINTS.contacts,



      {



        query: {



          q: query.search,



          status:



            query.status && query.status !== "all"



              ? query.status



              : undefined,



          audienceId:



            query.audienceId && query.audienceId !== "all"



              ? query.audienceId



              : undefined,



          tagId: query.tagId,



        },



      },



    ),







  /**



   * Get one contact.



   *



   * Real mode:



   *   GET /fockis-mail/contacts/:id



   */



  contact: (id: string) =>



    call<AudienceContact>(



      () => findOrThrow(mockContacts(), id, "Contact"),



      ENDPOINTS.contact(id),



    ),







  /**



   * Create a contact.



   *



   * Real mode:



   *   POST /fockis-mail/contacts



   */  addContact: (input: ContactInput) =>

    call<AudienceContact>(

      () => {

        const existing = mockContacts().some(

          (contact) =>

            contact.email.toLowerCase() === input.email.toLowerCase(),

        );



        if (existing) {

          throw new Error(

            `${input.email} is already in this audience.`,

          );

        }



        const now = new Date().toISOString();



        return upsert(mockContacts(), {

          ...input,



          id: uid("con"),



          businessId: activeBusinessId(),



          phone: input.phone || undefined,



          source: "manual",



          audienceIds: [db.settings.defaultAudienceId],



          joinedAt: now,



          lastActivityAt: now,



          revenue: 0,



          orderCount: 0,



          vip: false,



          customFields: {},



          activity: [

            {

              id: uid("act"),

              kind: "subscribed",

              label: "Added manually",

              at: now,

            },

          ],



          purchases: [],

        } as AudienceContact);

      },



      ENDPOINTS.contacts,



      {

        method: "POST",

        body: input,

      },

    ),



  /**



   * Update a contact.



   *



   * Real mode:



   *   PATCH /fockis-mail/contacts/:id



   */



  updateContact: (



    id: string,



    patch: Partial<AudienceContact>,



  ) =>



    call<AudienceContact>(



      () =>



        upsert(mockContacts(), {



          ...findOrThrow(mockContacts(), id, "Contact"),



          ...patch,



        }),



      ENDPOINTS.contact(id),



      {



        method: "PATCH",



        body: patch,



      },



    ),







  /**



   * Perform a bulk contact operation.



   *



   * Real mode:



   *   POST /fockis-mail/contacts/bulk



   */



  bulk: (



    ids: string[],



    action: BulkContactAction,



  ) =>



    call<{ affected: number }>(



      () => {



        let affected = 0;







        ids.forEach((id) => {



          const contact = mockContacts().find(



            (item) => item.id === id,



          );







          if (!contact) {



            return;



          }







          if (action.kind === "delete") {



            removeById(mockContacts(), id);



            affected += 1;



            return;



          }







          if (



            action.kind === "tag" &&



            !contact.tagIds.includes(action.tagId)



          ) {



            contact.tagIds.push(action.tagId);



            affected += 1;



            return;



          }







          if (action.kind === "untag") {



            const hadTag = contact.tagIds.includes(action.tagId);







            contact.tagIds = contact.tagIds.filter(



              (tagId: string) => tagId !== action.tagId,



            );







            if (hadTag) {



              affected += 1;



            }







            return;



          }







          if (action.kind === "status") {



            contact.status = action.status;



            affected += 1;



          }



        });







        return {



          affected,



        };



      },



      ENDPOINTS.contactsBulk,



      {



        method: "POST",



        body: {



          ids,



          action,



        },



      },



    ),







  /**



   * Import contacts from CSV.



   *



   * Real mode:



   *   POST /fockis-mail/contacts/import



   */  importCsv: (csv: string) =>

    call<{ imported: number; skipped: number }>(

      () => {

        const lines = csv

          .split(/\r?\n/)

          .map((line) => line.trim())

          .filter(Boolean);



        const header = (lines.shift() ?? "")

          .toLowerCase()

          .split(",")

          .map((item) => item.trim());



        const iEmail = header.indexOf("email");



        let imported = 0;

        let skipped = 0;



        lines.forEach((line) => {

          const columns = line

            .split(",")

            .map((column) => column.trim());



          const email =

            iEmail >= 0

              ? columns[iEmail] ?? ""

              : "";



          const validEmail =

            /^[^@\s]+@[^\s@]+\.[^\s@]+$/.test(email);



          const duplicate = mockContacts().some(

            (contact) =>

              contact.email.toLowerCase() ===

              email.toLowerCase(),

          );



          if (!validEmail || duplicate) {

            skipped += 1;

            return;

          }



          const now = new Date().toISOString();



          mockContacts().unshift({

            id: uid("con"),



            businessId: activeBusinessId(),



            firstName:

              columns[header.indexOf("first_name")] ?? "",



            lastName:

              columns[header.indexOf("last_name")] ?? "",



            email,



            location: "",



            status: "subscribed",



            tagIds: [],



            source: "import",



            audienceIds: [

              db.settings.defaultAudienceId,

            ],



            joinedAt: now,



            lastActivityAt: now,



            revenue: 0,



            orderCount: 0,



            vip: false,



            customFields: {},



            activity: [],



            purchases: [],

          } as AudienceContact);



          imported += 1;

        });



        return {

          imported,

          skipped,

        };

      },



      ENDPOINTS.contactsImport,



      {

        method: "POST",



        body: {

          csv,

        },

      },

    ),



  /* ---------------------------------------------------------------------- */



  /* Tags                                                                   */



  /* ---------------------------------------------------------------------- */







  tags: () =>



    call<Tag[]>(



      () => db.tags,



      ENDPOINTS.tags,



    ),







  createTag: (



    name: string,



    color: string,



  ) =>



    call<Tag>(



      () => {



        const duplicate =



          db.tags.some(



            (tag) =>



              tag.name.toLowerCase() ===



              name.toLowerCase(),



          );







        if (duplicate) {



          throw new Error(



            `A tag named "${name}" already exists.`,



          );



        }







        const now =



          new Date().toISOString();







        return upsert(db.tags, {



          id: uid("tag"),







          businessId:



            activeBusinessId(),







          name,







          color,







          contactCount: 0,







          createdAt: now,







          lastUsedAt: now,



        });



      },







      ENDPOINTS.tags,







      {



        method: "POST",







        body: {



          name,



          color,



        },



      },



    ),







  renameTag: (



    id: string,



    name: string,



  ) =>



    call<Tag>(



      () =>



        upsert(db.tags, {



          ...findOrThrow(



            db.tags,



            id,



            "Tag",



          ),







          name,



        }),







      ENDPOINTS.tag(id),







      {



        method: "PATCH",







        body: {



          name,



        },



      },



    ),







  deleteTag: (id: string) =>



    call<void>(



      () => {



        removeById(



          db.tags,



          id,



        );







        mockContacts().forEach(



          (contact) => {



            contact.tagIds =



              contact.tagIds.filter(



                (tagId: string) =>



                  tagId !== id,



              );



          },



        );



      },







      ENDPOINTS.tag(id),







      {



        method: "DELETE",



      },



    ),







  assignTagByEmail: (



    id: string,



    emails: string[],



  ) =>



    call<{ matched: number }>(



      () => {



        const tag =



          findOrThrow(



            db.tags,



            id,



            "Tag",



          );







        let matched = 0;







        mockContacts().forEach(



          (contact) => {



            if (



              emails.includes(



                contact.email,



              ) &&



              !contact.tagIds.includes(



                id,



              )



            ) {



              contact.tagIds.push(id);







              matched += 1;



            }



          },



        );







        tag.contactCount +=



          matched;







        tag.lastUsedAt =



          new Date().toISOString();







        return {



          matched,



        };



      },







      `${ENDPOINTS.tag(id)}/assign`,







      {



        method: "POST",







        body: {



          emails,



        },



      },



    ),



};