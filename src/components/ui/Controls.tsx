import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { IconMinus, IconPlus } from '../icons';

/* ------------------------------------------------------------------ *
 * Segmentierte Umschaltung – „Mai Jun Jul Aug" aus der Vorlage
 * ------------------------------------------------------------------ */

export interface TabOption<T> {
  value: T;
  label: string;
}

export function SegmentedTabs<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const layoutId = useId();

  return (
    <div className={cn('scroll-x flex gap-1', className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative shrink-0 px-3.5 py-2 text-[17px] font-bold tracking-tight transition-colors',
              active ? 'text-text' : 'text-subtle',
            )}
          >
            {option.label}
            {active && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full bg-text"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Variante mit Pillen-Hintergrund für Umschalter innerhalb von Karten. */
export function PillTabs<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const layoutId = useId();

  return (
    <div className={cn('flex gap-1 rounded-full bg-surface-muted p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 rounded-full px-3 py-2 text-[14px] font-bold whitespace-nowrap transition-colors',
              active ? 'text-text' : 'text-muted',
            )}
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-surface shadow-card"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Schalter
 * ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-positive' : 'bg-line-strong',
        disabled && 'opacity-40',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 38 }}
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-semibold tracking-tight">{label}</div>
        {description && <div className="mt-0.5 text-[14px] leading-snug text-muted">{description}</div>}
      </div>
      {control}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Schieberegler
 * ------------------------------------------------------------------ */

/**
 * Skalen-Regler für Intensität, Fokus, Hydration und die übrigen Bewertungen.
 * Basiert auf dem nativen Element – das folgt dem Finger zuverlässiger als
 * jede Nachbildung und bleibt mit Tastatur bedienbar.
 */
export function Slider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  label,
  valueLabel,
  hint,
  tone = 'neutral',
}: {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  valueLabel?: string;
  hint?: string;
  tone?: 'neutral' | 'positiv';
}) {
  const current = value ?? Math.round((min + max) / 2);
  const percent = ((current - min) / (max - min)) * 100;

  return (
    <div className="py-2">
      {label && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-[16px] font-semibold tracking-tight">{label}</span>
          <span
            className={cn(
              'tnum text-[16px] font-bold',
              value === null ? 'text-subtle' : tone === 'positiv' ? 'text-positive' : 'text-text',
            )}
          >
            {value === null ? '–' : (valueLabel ?? current)}
          </span>
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lb-slider w-full"
        style={{ ['--fill' as string]: `${percent}%` }}
      />

      {hint && <div className="mt-1.5 text-[13px] text-muted">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Zahlen-Schrittschalter
 * ------------------------------------------------------------------ */

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  suffix,
  format,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  format?: (value: number) => string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100));

  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      {label && <span className="text-[16px] font-semibold tracking-tight">{label}</span>}
      <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label="Weniger"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted disabled:opacity-30"
        >
          <IconMinus size={18} />
        </motion.button>

        <span className="tnum min-w-[3.5rem] text-center text-[17px] font-bold">
          {format ? format(value) : value}
          {suffix && <span className="ml-0.5 text-[14px] font-semibold text-muted">{suffix}</span>}
        </span>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label="Mehr"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted disabled:opacity-30"
        >
          <IconPlus size={18} />
        </motion.button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chips – die horizontale Reihe aus dem „Beliebt"-Block der Vorlage
 * ------------------------------------------------------------------ */

export function Chip({
  children,
  active = false,
  onClick,
  leading,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3',
        'text-[15px] font-bold tracking-tight whitespace-nowrap transition-colors',
        active ? 'bg-action text-[var(--c-action-text)]' : 'bg-surface text-text shadow-card',
        className,
      )}
    >
      {leading}
      {children}
    </motion.button>
  );
}

export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('scroll-x -mx-5 flex gap-2.5 px-5 pb-1', className)}>{children}</div>
  );
}
