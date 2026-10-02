// web/src/create/services/assetsApi.ts

import createApi from './createApi';

export const assetsApi = {
  list() {
    return createApi.get('/assets');
  },

  get(id: string) {
    return createApi.get(`/assets/${id}`);
  },

  upload(file: File, metadata?: Record<string, unknown>) {
    const form = new FormData();

    form.append('file', file);

    if (metadata) {
      form.append(
        'metadata',
        JSON.stringify(metadata),
      );
    }

    return createApi.post(
      '/assets',
      form,
    );
  },

  delete(id: string) {
    return createApi.delete(
      `/assets/${id}`,
    );
  },
};

export default assetsApi;