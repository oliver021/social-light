import { useCallback, useState } from 'react';

export type ToastSeverity = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  severity: ToastSeverity;
  /** Changes on every toast so an identical message re-opens the snackbar. */
  key: number;
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

  const closeToast = useCallback(() => setToast(null), []);

  return { toast, showToast, closeToast };
}
