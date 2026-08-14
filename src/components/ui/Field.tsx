import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { IconSearch, IconX } from '../icons';

/**
 * Eingabefelder. Alle mit mindestens 16 px Schriftgröße – darunter zoomt
 * iOS Safari beim Fokussieren automatisch hinein und verschiebt das Layout.
 */

export function SearchField({
  value,
  onChange,
  placeholder = 'Suchen',
  trailing,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex-1">
        <IconSearch
          size={20}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-2xl bg-surface-muted py-3.5 pr-10 pl-12',
            'text-[16px] font-medium placeholder:text-subtle',
            'outline-none focus:ring-2 focus:ring-line-strong',
          )}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Suche löschen"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-subtle"
          >
            <IconX size={18} />
          </button>
        )}
      </div>
      {trailing}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  hint?: string;
  onChange: (value: string) => void;
  suffix?: string;
}

export function TextField({ label, hint, onChange, suffix, className, ...props }: TextFieldProps) {
  return (
    <label className="block py-2">
      {label && <span className="mb-1.5 block text-[14px] font-semibold text-muted">{label}</span>}
      <div className="relative">
        <input
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full rounded-[var(--radius-field)] bg-surface-muted px-4 py-3.5',
            'text-[16px] font-medium placeholder:text-subtle',
            'outline-none focus:ring-2 focus:ring-line-strong',
            suffix && 'pr-12',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[15px] font-semibold text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  onChange: (value: string) => void;
}

export function TextArea({ label, onChange, className, rows = 4, ...props }: TextAreaProps) {
  return (
    <label className="block py-2">
      {label && <span className="mb-1.5 block text-[14px] font-semibold text-muted">{label}</span>}
      <textarea
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full resize-none rounded-[var(--radius-field)] bg-surface-muted px-4 py-3.5',
          'text-[16px] leading-relaxed font-medium placeholder:text-subtle',
          'outline-none focus:ring-2 focus:ring-line-strong',
          className,
        )}
        {...props}
      />
    </label>
  );
}

/** Auswahl aus wenigen Möglichkeiten als Kachelraster statt als Klappliste. */
export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  label,
}: {
  options: Array<{ value: T; label: string; description?: string }>;
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  label?: string;
}) {
  return (
    <div className="py-2">
      {label && <div className="mb-2 text-[14px] font-semibold text-muted">{label}</div>}
      <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-[var(--radius-field)] bg-surface-muted px-3 py-3 text-left text-text transition-shadow',
                active && 'ring-2 ring-text',
              )}
            >
              <div className="text-[15px] font-bold tracking-tight">{option.label}</div>
              {option.description && (
                <div className="mt-0.5 text-[12px] leading-snug text-muted">
                  {option.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
