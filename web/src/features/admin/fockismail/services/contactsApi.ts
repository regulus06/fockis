// Contacts, explicitly scoped by business. Thin wrapper so callers can pass a
// businessId; in mock mode the per-business store is selected via storeFor().

import type { Contact } from "../types/mailchimp.types";
import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";
import { storeFor } from "./mockDb";

export const contactsApi = {
  getContacts: (businessId: string) =>
    call<Contact[]>(() => storeFor(businessId).contacts, ENDPOINTS.contacts, { query: { businessId } }),
  getContact: (businessId: string, id: string) =>
    call<Contact>(() => {
      const c = storeFor(businessId).contacts.find((x) => x.id === id);
      if (!c) throw new Error("Contact not found in this workspace.");
      return c;
    }, ENDPOINTS.contact(id), { query: { businessId } }),
};
