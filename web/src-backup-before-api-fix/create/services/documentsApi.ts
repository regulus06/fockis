// web/src/create/services/documentsApi.ts

import createApi from './createApi';

export interface CreateDocumentPayload {
  title?: string;
  name?: string;
  type?: string;
  category?: string;
  templateId?: string;
  workspaceId?: string;
  elements?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface CreateDocument {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  type?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export const documentsApi = {
  list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    workspaceId?: string;
  }) {
    const query = new URLSearchParams();

    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.workspaceId) {
      query.set('workspaceId', params.workspaceId);
    }

    const suffix = query.toString() ? `?${query}` : '';

    return createApi.get<CreateDocument[]>(
      `/documents${suffix}`,
    );
  },

  get(id: string) {
    return createApi.get<CreateDocument>(
      `/documents/${id}`,
    );
  },

  create(payload: CreateDocumentPayload) {
    return createApi.post<CreateDocument>(
      '/documents',
      payload,
    );
  },

  update(
    id: string,
    payload: Partial<CreateDocumentPayload>,
  ) {
    return createApi.put<CreateDocument>(
      `/documents/${id}`,
      payload,
    );
  },

  autosave(
    id: string,
    payload: Record<string, unknown>,
  ) {
    return createApi.patch<CreateDocument>(
      `/documents/${id}/autosave`,
      payload,
    );
  },

  duplicate(id: string) {
    return createApi.post<CreateDocument>(
      `/documents/${id}/duplicate`,
    );
  },

  delete(id: string) {
    return createApi.delete(
      `/documents/${id}`,
    );
  },
};

export default documentsApi;