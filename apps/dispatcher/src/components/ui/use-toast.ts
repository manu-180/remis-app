import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  undoFn?: () => void;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (item) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }));
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function add(message: string, variant: ToastVariant, opts?: { undo?: () => void; duration?: number }) {
  const item: Omit<ToastItem, 'id'> = {
    message,
    variant,
    duration: opts?.duration ?? 4000,
    ...(opts?.undo ? { undoFn: opts.undo } : {}),
  };
  return useToastStore.getState().add(item);
}

export const toast = {
  success: (message: string, opts?: { undo?: () => void }) => add(message, 'success', opts),
  error:   (message: string) => add(message, 'error'),
  info:    (message: string) => add(message, 'info'),
  loading: (message: string) => add(message, 'loading', { duration: Infinity }),
  dismiss: (id: string) => useToastStore.getState().remove(id),
};
