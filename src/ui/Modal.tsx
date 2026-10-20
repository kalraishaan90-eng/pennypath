import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Force desktop modal style even on mobile */
  alwaysCenter?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  alwaysCenter = false,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet Container */}
      <div
        className={`
          relative z-10 w-full bg-paper border border-ink-10 shadow-modal overflow-hidden
          ${alwaysCenter
            ? `rounded-card ${maxWidthClasses[maxWidth]} m-4 animate-in zoom-in-95`
            : `rounded-t-3xl sm:rounded-card ${maxWidthClasses[maxWidth]} max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 sm:zoom-in-95`
          }
        `}
      >
        {/* Mobile drag handle for bottom sheet feel */}
        {!alwaysCenter && (
          <div className="sm:hidden flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 bg-ink-20 rounded-full cursor-grab" />
          </div>
        )}

        {/* Top awning stripe accent */}
        <div className="h-1.5 awning-stripe-accent w-full" />

        {/* Header */}
        {(title || description) && (
          <div className="px-5 pt-4 pb-3 flex items-start justify-between border-b border-ink-10">
            <div>
              {title && (
                <h3 id="modal-title" className="font-fraunces text-xl font-semibold text-ink leading-snug">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-ink/70 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target p-1.5 -mr-1 text-ink/60 hover:text-ink rounded-full hover:bg-ink-10 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content body */}
        <div className="p-5 overflow-y-auto text-ink">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-sand-10 border-t border-ink-10 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
