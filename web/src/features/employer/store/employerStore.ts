import { create } from 'zustand';
import { employerApi } from '../services/employerApi';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import type { EmployerCompany, EmployerMe } from '../types';

interface EmployerState {
  me: EmployerMe | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  setCompany: (company: EmployerCompany | null) => void;
  setMe: (me: EmployerMe) => void;
}

/** Current employer account, company and role — shared by the layout and pages. */
export const useEmployerStore = create<EmployerState>((set, get) => ({
  me: null,
  loading: false,
  error: null,
  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const me = await employerApi.me();
      set({ me, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error, 'Unable to load your Employer Center.'), loading: false });
    }
  },
  setCompany: (company) => {
    const me = get().me;
    if (me) set({ me: { ...me, company } });
  },
  setMe: (me) => set({ me }),
}));
