// web/src/create/services/templatesApi.ts

import createApi from './createApi';

export interface Template {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  category?: string;
  slug?: string;
  preview?: unknown;
  [key: string]: unknown;
}

export interface CreateTemplatePayload {
  title: string;
  name?: string;
  category?: string;
  description?: string;
  preview?: unknown;
  elements?: unknown[];
  metadata?: Record<string, unknown>;
}

export const templatesApi = {
  list(params?: {
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const query = new URLSearchParams();

    if (params?.category && params.category !== 'all') {
      query.set('category', params.category);
    }

    if (params?.page) {
      query.set('page', String(params.page));
    }

    if (params?.limit) {
      query.set('limit', String(params.limit));
    }

    if (params?.search) {
      query.set('search', params.search);
    }

    const suffix = query.toString()
      ? `?${query.toString()}`
      : '';

    return createApi.get<Template[]>(
      `/templates${suffix}`,
    );
  },

  get(id: string) {
    return createApi.get<Template>(
      `/templates/${id}`,
    );
  },

  create(payload: CreateTemplatePayload) {
    return createApi.post<Template>(
      '/templates',
      payload,
    );
  },

  update(
    id: string,
    payload: Partial<CreateTemplatePayload>,
  ) {
    return createApi.put<Template>(
      `/templates/${id}`,
      payload,
    );
  },

  apply(
    id: string,
    payload?: Record<string, unknown>,
  ) {
    return createApi.post(
      `/templates/${id}/apply`,
      payload || {},
    );
  },
};

export default templatesApi;