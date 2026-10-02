// web/src/create/services/pdfApi.ts

import createApi from './createApi';

export const pdfApi = {
  create(payload: Record<string, unknown>) {
    return createApi.post(
      '/pdf',
      payload,
    );
  },

  convert(
    payload: FormData | Record<string, unknown>,
  ) {
    return createApi.post(
      '/pdf/convert',
      payload,
    );
  },

  merge(
    payload: FormData | Record<string, unknown>,
  ) {
    return createApi.post(
      '/pdf/merge',
      payload,
    );
  },

  split(
    payload: FormData | Record<string, unknown>,
  ) {
    return createApi.post(
      '/pdf/split',
      payload,
    );
  },
};

export default pdfApi;