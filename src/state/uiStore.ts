import { create } from 'zustand';

/**
 * Kurzlebiger Oberflächen-Zustand: Hinweise am unteren Rand.
 *
 * Gehört bewusst nicht in die Datenbank – nach einem Neuladen soll kein alter
 * Hinweis wieder auftauchen.
 */

export interface Toast {
  id: string;
  message: string;
  tone: 'neutral' | 'positiv' | 'negativ';
  /** Aktion rechts im Hinweis, üblicherweise „Rückgängig". */
  action?: { label: string; run: () => void };
  durationMs: number;
}

interface UiState {
  toasts: Toast[];
  showToast: (input: Omit<Partial<Toast>, 'id'> & { message: string }) => string;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],

  showToast: (input) => {
    const id = crypto.randomUUID();
    const toast: Toast = {
      id,
      message: input.message,
      tone: input.tone ?? 'neutral',
      // Mit Aktion länger stehen lassen – „Rückgängig" braucht Bedenkzeit.
      durationMs: input.durationMs ?? (input.action ? 6000 : 3000),
      ...(input.action ? { action: input.action } : {}),
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.durationMs);

    return id;
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Bequemer Zugriff außerhalb von Komponenten. */
export const toast = {
  info: (message: string) => useUiStore.getState().showToast({ message }),
  success: (message: string) => useUiStore.getState().showToast({ message, tone: 'positiv' }),
  error: (message: string) => useUiStore.getState().showToast({ message, tone: 'negativ' }),
  undo: (message: string, run: () => void) =>
    useUiStore.getState().showToast({ message, action: { label: 'Rückgängig', run } }),
};
