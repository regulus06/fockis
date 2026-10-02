// web/src/create/services/ocrApi.ts

import createApi from './createApi';

export const ocrApi = {
  process(
    payload: FormData | Record<string, unknown>,
  ) {
    return createApi.post(
      '/ocr',
      payload,
    );
  },

  handwriting(
    payload: FormData | Record<string, unknown>,
  ) {
    return createApi.post(
      '/ocr/handwriting',
      payload,
    );
  },

  document(
    payload: FormData | Record<string, unknown>,
  ) {
    return createApi.post(
      '/ocr/document',
      payload,
    );
  },
};

export default ocrApi;