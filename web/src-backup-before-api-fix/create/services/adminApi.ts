import createApi from './createApi';

export const adminApi = {
  getStats() {
    return createApi.get<any>(
      '/admin/stats',
    );
  },

  getDocuments(params?: {
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();

    if (params?.page !== undefined) {
      query.set(
        'page',
        String(params.page),
      );
    }

    if (params?.limit !== undefined) {
      query.set(
        'limit',
        String(params.limit),
      );
    }

    const queryString = query.toString();

    const suffix = queryString
      ? `?${queryString}`
      : '';

    return createApi.get<any>(
      `/admin/documents${suffix}`,
    );
  },

  getTemplates(params?: {
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();

    if (params?.page !== undefined) {
      query.set(
        'page',
        String(params.page),
      );
    }

    if (params?.limit !== undefined) {
      query.set(
        'limit',
        String(params.limit),
      );
    }

    const queryString = query.toString();

    const suffix = queryString
      ? `?${queryString}`
      : '';

    return createApi.get<any>(
      `/admin/templates${suffix}`,
    );
  },
};

export default adminApi;