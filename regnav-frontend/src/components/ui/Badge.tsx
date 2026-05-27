import React from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
  title?: string;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'status-success',
  warning: 'status-warning',
  danger: 'status-danger',
  info: 'status-info',
  neutral: 'status-neutral',
  accent: 'status-accent',
};

/**
 * Pill-shaped status badge that picks colors from the theme tokens. Use
 * this everywhere instead of hand-rolling `bg-*-900 text-*-300 border-*-700`
 * combos that break in light mode.
 */
export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  className = '',
  children,
  title,
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TONE_CLASS[tone]} ${className}`}
    title={title}
  >
    {children}
  </span>
);
