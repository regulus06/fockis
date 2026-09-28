// web/src/create/services/workspacesApi.ts

import createApi from './createApi';

export const workspacesApi = {
  list() {
    return createApi.get('/workspaces');
  },

  get(id: string) {
    return createApi.get(`/workspaces/${id}`);
  },

  create(payload: {
    name: string;
    description?: string;
  }) {
    return createApi.post(
      '/workspaces',
      payload,
    );
  },

  update(
    id: string,
    payload: Record<string, unknown>,
  ) {
    return createApi.put(
      `/workspaces/${id}`,
      payload,
    );
  },

  delete(id: string) {
    return createApi.delete(
      `/workspaces/${id}`,
    );
  },
};

export default workspacesApi;