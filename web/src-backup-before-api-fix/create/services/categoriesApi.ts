// web/src/create/services/categoriesApi.ts

import createApi from './createApi';

export interface CreateCategory {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  [key: string]: unknown;
}

export const categoriesApi = {
  list() {
    return createApi.get<CreateCategory[]>(
      '/categories',
    );
  },

  get(id: string) {
    return createApi.get<CreateCategory>(
      `/categories/${id}`,
    );
  },

  create(payload: {
    name: string;
    slug?: string;
    description?: string;
  }) {
    return createApi.post<CreateCategory>(
      '/categories',
      payload,
    );
  },

  update(
    id: string,
    payload: Partial<{
      name: string;
      slug: string;
      description: string;
    }>,
  ) {
    return createApi.put<CreateCategory>(
      `/categories/${id}`,
      payload,
    );
  },

  delete(id: string) {
    return createApi.delete(
      `/categories/${id}`,
    );
  },
};

export default categoriesApi;