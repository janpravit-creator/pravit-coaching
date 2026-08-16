import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconChevronLeft } from '../icons';
import { IconButton } from './Button';

/**
 * Seitengerüst. Der Inhalt scrollt, Kopf- und Fußbereich bleiben stehen,
 * und unten bleibt Platz für die Tab-Leiste und den Home-Indicator.
 */

export function Screen({
  children,
  className,
  /** Zusätzlicher Freiraum unten, wenn ein schwebender Knopf im Weg wäre. */
  actionSpace = false,
}: {
  children: ReactNode;
  className?: string;
  actionSpace?: boolean;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-2xl px-5',
        actionSpace ? 'pb-[calc(env(safe-area-inset-bottom)+11rem)]' : 'pb-[calc(env(safe-area-inset-bottom)+6.5rem)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  trailing,
  large = true,
}: {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
  large?: boolean;
}) {
  return (
    <header className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
        {onBack ? (
          <IconButton label="Zurück" variant="blank" onClick={onBack} className="-ml-2.5">
            <IconChevronLeft size={26} />
          </IconButton>
        ) : (
          <span />
        )}
        {trailing}
      </div>

      <h1
        className={cn(
          'font-extrabold tracking-tight',
          large ? 'text-[34px] leading-[1.1]' : 'text-[24px]',
        )}
      >
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-[15px] leading-snug text-muted">{subtitle}</p>}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-subtle">
          {icon}
        </div>
      )}
      <h3 className="text-[19px] font-extrabold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Waagerechter Fortschrittsbalken – im Training über der Übungskarte. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const percent = Math.min(100, Math.max(0, value * 100));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken', className)}>
      <div
        className="h-full rounded-full bg-text transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Kleiner farbiger Hinweis – etwa die Progressions-Empfehlung. */
export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'positiv' | 'negativ' | 'warnung' | 'info';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-surface-muted text-muted',
    positiv: 'bg-positive-soft text-positive',
    negativ: 'bg-negative-soft text-negative',
    warnung: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
        'text-[13px] font-bold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
