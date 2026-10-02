// web/src/create/services/scannerApi.ts

import createApi from './createApi';

export type ScanType =
  | 'document'
  | 'receipt'
  | 'id'
  | 'photo'
  | 'handwriting';

export interface ScanPayload {
  file: File;
  type?: ScanType;
  name?: string;
  language?: string;
}

export const scannerApi = {
  async scan(payload: ScanPayload | FormData) {
    let formData: FormData;

    if (payload instanceof FormData) {
      formData = payload;

      // Make sure type exists for backend validation.
      if (!formData.get('type')) {
        formData.set('type', 'document');
      }
    } else {
      formData = new FormData();

      formData.append('file', payload.file);
      formData.append('type', payload.type ?? 'document');

      if (payload.name) {
        formData.append('name', payload.name);
      }

      if (payload.language) {
        formData.append('language', payload.language);
      }
    }

    return createApi.post('/scanner/scan', formData);
  },

  process(payload: Record<string, unknown>) {
    return createApi.post('/scanner/process', payload);
  },

  passportPhoto(payload: FormData | Record<string, unknown>) {
    return createApi.post(
      '/scanner/passport-photo',
      payload,
    );
  },

  removeBackground(payload: FormData | Record<string, unknown>) {
    return createApi.post(
      '/scanner/remove-background',
      payload,
    );
  },
};

export default scannerApi;