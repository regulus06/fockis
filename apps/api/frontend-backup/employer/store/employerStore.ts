import { create } from 'zustand';
import type { EmployerProfile } from '../types';

interface EmployerState {
  profile: EmployerProfile | null;
  setProfile: (profile: EmployerProfile | null) => void;
}
export const useEmployerStore = create<EmployerState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
