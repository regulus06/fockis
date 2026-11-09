import { create } from 'zustand';
interface EmployerFiltersState {
  search: string;
  status: string;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  reset: () => void;
}
export const useEmployerFiltersStore = create<EmployerFiltersState>((set) => ({
  search: '',
  status: 'all',
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  reset: () => set({ search: '', status: 'all' }),
}));
