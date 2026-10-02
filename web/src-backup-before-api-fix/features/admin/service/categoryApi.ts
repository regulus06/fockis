import { api } from "../../../api/api";

export interface Category {
  _id: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  productCount: number;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  status: "active" | "inactive";
}

const categoryApi = {
  async getAll(): Promise<Category[]> {
    const res = await api.get("/admin/categories");
    return res.data;
  },

  async create(data: CategoryPayload) {
    const res = await api.post("/admin/categories", data);
    return res.data;
  },

  async update(id: string, data: CategoryPayload) {
    const res = await api.patch(`/admin/categories/${id}`, data);
    return res.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/admin/categories/${id}`);
    return res.data;
  },
};

export default categoryApi;