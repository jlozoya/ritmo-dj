import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function FieldInput({
  icon: Icon,
  children,
  className = '',
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field-input ${className}`}>
      <Icon className="field-input-icon" size={17} aria-hidden="true" />
      {children}
    </div>
  );
}
