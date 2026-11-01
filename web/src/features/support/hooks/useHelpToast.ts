import { create } from "zustand";

export type HelpToastTone = "success" | "error" | "info";

interface HelpToast {
  id: number;
  message: string;
  tone: HelpToastTone;
}

interface HelpToastState {
  toasts: HelpToast[];
  notify: (message: string, tone?: HelpToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useHelpToastStore = create<HelpToastState>((set, get) => ({
  toasts: [],
  notify: (message, tone = "success") => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, tone }] }));
    window.setTimeout(() => get().dismiss(id), 4500);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** const notify = useHelpToast(); notify("Sent"); */
export const useHelpToast = () => useHelpToastStore((state) => state.notify);
