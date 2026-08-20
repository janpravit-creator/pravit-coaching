import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconChevronRight } from '../icons';

/**
 * Flächen und Listenzeilen – die weiße Karte mit großem Radius und sehr
 * weichem Schatten ist das Grundelement der Vorlagen.
 */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] bg-surface shadow-card',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Antippbare Karte mit dezentem Druck-Feedback. */
export function TapCard({
  children,
  onClick,
  className,
  padded = true,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  padded?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        'w-full rounded-[var(--radius-card)] bg-surface text-left shadow-card',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/**
 * Abschnitt mit Überschrift. Die optionale Aktion rechts erscheint wie in der
 * Vorlage als Pfeil hinter dem Titel („IPOs ›", „Aktien ›").
 */
export function Section({
  title,
  action,
  onAction,
  children,
  className,
}: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mb-7', className)}>
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          {onAction ? (
            <button
              onClick={onAction}
              className="flex items-center gap-1 text-[19px] font-extrabold tracking-tight"
            >
              {title}
              <IconChevronRight size={18} className="text-subtle" />
            </button>
          ) : (
            <h2 className="text-[19px] font-extrabold tracking-tight">{title}</h2>
          )}
          {action && onAction && (
            <button onClick={onAction} className="text-[15px] font-semibold text-muted">
              {action}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Listenzeile wie im „Aktien"-Block der Vorlage: Symbol, Name, rechts ein
 * Wert – optional grün oder rot.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  chevron = false,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-[17px] font-bold tracking-tight">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[14px] text-muted">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
      {chevron && <IconChevronRight size={18} className="shrink-0 text-subtle" />}
    </>
  );

  if (!onClick) {
    return <div className={cn('flex items-center gap-3.5 px-1 py-3.5', className)}>{content}</div>;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.99, opacity: 0.7 }}
      onClick={onClick}
      className={cn('flex w-full items-center gap-3.5 px-1 py-3.5 text-left', className)}
    >
      {content}
    </motion.button>
  );
}

/** Trennlinie zwischen Listenzeilen, eingerückt wie in der Vorlage. */
export function Divider({ inset = false }: { inset?: boolean }) {
  return <div className={cn('h-px bg-line', inset && 'ml-14')} />;
}

/**
 * Prozentwert mit Dreieck – exakt die Darstellung aus der Aktienliste.
 * Grün nach oben, rot nach unten, grau bei null.
 */
export function DeltaBadge({
  value,
  suffix = '%',
  size = 'normal',
}: {
  value: number | null;
  suffix?: string;
  size?: 'normal' | 'klein';
}) {
  if (value === null) {
    return <span className="text-[15px] font-bold text-subtle">–</span>;
  }

  const positive = value > 0;
  const neutral = Math.abs(value) < 0.005;

  return (
    <span
      className={cn(
        'tnum font-bold whitespace-nowrap',
        size === 'klein' ? 'text-[13px]' : 'text-[16px]',
        neutral ? 'text-muted' : positive ? 'text-positive' : 'text-negative',
      )}
    >
      {!neutral && (positive ? '▲ ' : '▼ ')}
      {formatSigned(value)}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}

function formatSigned(value: number): string {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  return rounded.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Kennzahl-Kachel für Übersichten: große Zahl, kleine Beschriftung darunter. */
export function StatTile({
  value,
  label,
  tone = 'neutral',
  className,
}: {
  value: ReactNode;
  label: string;
  tone?: 'neutral' | 'positiv' | 'negativ';
  className?: string;
}) {
  return (
    <div className={cn('rounded-[var(--radius-tile)] bg-surface-muted px-4 py-3.5', className)}>
      <div
        className={cn(
          'tnum text-[22px] leading-none font-extrabold tracking-tight',
          tone === 'positiv' && 'text-positive',
          tone === 'negativ' && 'text-negative',
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[13px] font-medium text-muted">{label}</div>
    </div>
  );
}
