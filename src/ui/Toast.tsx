import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast viewport */}
      <div
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`
              pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-card shadow-modal
              border text-sm font-medium transition-all duration-200 animate-in slide-in-from-bottom-5
              ${item.type === 'success' ? 'bg-ink text-paper border-ink' : ''}
              ${item.type === 'error' ? 'bg-accent text-paper border-accent' : ''}
              ${item.type === 'info' ? 'bg-paper text-ink border-ink-20' : ''}
            `}
            role="status"
          >
            <div className="flex items-center gap-2.5">
              {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-sky shrink-0" />}
              {item.type === 'error' && <AlertCircle className="w-5 h-5 text-sand shrink-0" />}
              {item.type === 'info' && <Info className="w-5 h-5 text-ink shrink-0" />}
              <span>{item.message}</span>
            </div>
            <button
              onClick={() => removeToast(item.id)}
              className="p-1 rounded hover:opacity-80 transition-opacity touch-target shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export const Toast: React.FC<{
  message: string;
  type?: ToastType;
  onClose?: () => void;
}> = ({ message, type = 'info', onClose }) => {
  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 rounded-card shadow-card
        border text-sm font-medium
        ${type === 'success' ? 'bg-ink text-paper border-ink' : ''}
        ${type === 'error' ? 'bg-accent text-paper border-accent' : ''}
        ${type === 'info' ? 'bg-paper text-ink border-ink-20' : ''}
      `}
      role="status"
    >
      <div className="flex items-center gap-2.5">
        {type === 'success' && <CheckCircle2 className="w-5 h-5 text-sky shrink-0" />}
        {type === 'error' && <AlertCircle className="w-5 h-5 text-sand shrink-0" />}
        {type === 'info' && <Info className="w-5 h-5 text-ink shrink-0" />}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded hover:opacity-80 transition-opacity touch-target shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
