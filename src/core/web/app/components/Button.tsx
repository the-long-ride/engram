// Shared button primitive for the React control panel.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'danger-solid' | 'save' | 'cancel';
export function Button({ variant = 'outline', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children?: ReactNode }) {
  const cls = variant === 'danger-solid' ? 'btn btn-danger-solid' : 'btn btn-' + variant;
  return <button className={(cls + ' ' + className).trim()} {...props}>{children}</button>;
}
