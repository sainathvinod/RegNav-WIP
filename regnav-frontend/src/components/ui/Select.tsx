import React from 'react';
import { Option } from '../../lib/constants';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: Option[];
  placeholder?: string;
  /** Show an "All …" first option that submits an empty string. */
  allLabel?: string;
}

/**
 * Themed `<select>` matching the look of `.input`. Use everywhere a
 * dropdown is needed; falls through every other prop to the native
 * element so callers can attach name/value/onChange normally.
 */
export const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  allLabel,
  className = '',
  ...rest
}) => (
  <select className={`select ${className}`} {...rest}>
    {allLabel != null && <option value="">{allLabel}</option>}
    {placeholder != null && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
