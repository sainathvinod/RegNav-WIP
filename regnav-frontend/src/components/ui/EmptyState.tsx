import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty-state block. Use whenever a list, table or page has no
 * content to render. Keep the icon meaningful (or omit it) — never use a
 * giant emoji-only block.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}
    style={{ color: 'var(--muted)' }}
  >
    {icon && (
      <div className="mb-3" style={{ color: 'var(--muted)' }}>
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
      {title}
    </h3>
    {description && (
      <p className="text-sm max-w-md mx-auto">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
