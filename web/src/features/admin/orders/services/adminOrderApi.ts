import { api } from '../../../../api/api';

const BASE_URL = '/marketplace/orders';

export const adminOrderApi = {
  updateStatus: async (id: string, status: string) => {
    const res = await api.patch(
      `${BASE_URL}/${id}/status`,
      { status }
    );

    return res.data;
  },
};