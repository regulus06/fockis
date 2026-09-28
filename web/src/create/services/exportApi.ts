// web/src/create/services/exportApi.ts

import createApi from './createApi';

export const exportApi = {
  exportDocument(
    documentId: string,
    payload: Record<string, unknown> = {},
  ) {
    return createApi.post(
      `/export/${documentId}`,
      payload,
    );
  },

  download(
    documentId: string,
    format: string,
  ) {
    return createApi.get(
      `/export/${documentId}/download?format=${encodeURIComponent(format)}`,
    );
  },
};

export default exportApi;