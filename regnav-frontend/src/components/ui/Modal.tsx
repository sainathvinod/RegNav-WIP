import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Set to false if the modal body manages its own scroll (e.g. embedded iframe). */
  scrollBody?: boolean;
  /** Disable backdrop click-to-dismiss for destructive flows. */
  dismissOnBackdrop?: boolean;
  children: React.ReactNode;
}

/**
 * Accessible modal shell:
 *   • Click backdrop to close (unless `dismissOnBackdrop={false}`).
 *   • Esc closes.
 *   • Locks body scroll while open.
 *   • Focus is returned to the trigger element on close.
 *   • Initial focus lands on the close button so keyboard users get a
 *     predictable starting point.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  footer,
  size = 'lg',
  scrollBody = true,
  dismissOnBackdrop = true,
  children,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);

    // Defer focus so the element is in the DOM before we focus it.
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = original;
      document.removeEventListener('keydown', handleKey);
      window.clearTimeout(id);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${SIZE_CLASS[size]} rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col max-h-[95vh]`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        {(title || true) && (
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2 id="modal-title" className="text-lg font-semibold pr-3">
              {title}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <div
          className={`px-5 py-4 flex-1 ${scrollBody ? 'overflow-y-auto' : 'overflow-hidden'}`}
        >
          {children}
        </div>

        {footer && (
          <div
            className="px-5 py-4 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2"
            style={{ borderColor: 'var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
