import { useCallback, useState } from 'react';

export type ToastSeverity = 'success' | 'error' | 'info';

/** A button on a toast, e.g. "Undo". The toast closes after the action runs. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  message: string;
  severity: ToastSeverity;
  /** Changes on every toast so an identical message re-opens the snackbar. */
  key: number;
  action?: ToastAction;
  /** Overrides the default hide delay (used by undo toasts). */
  autoHideMs?: number;
}

/**
 * One transient message for feedback the user must not miss: a failed save, a failed
 * send, or a confirmed save. Rendered once by the app provider.
 */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'error') => {
    setToast({ message, severity, key: Date.now() + Math.random() });
  }, []);

  // A message with one action (e.g. "Post hidden" + "Undo"). Informational, so it is not an error.
  const showActionToast = useCallback((message: string, action: ToastAction, autoHideMs = 6000) => {
    setToast({ message, severity: 'info', key: Date.now() + Math.random(), action, autoHideMs });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  return { toast, showToast, showActionToast, closeToast };
}
