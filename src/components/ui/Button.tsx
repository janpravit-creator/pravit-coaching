import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Der schwarze Pill-Knopf aus den Vorlagen ist die eine dominante Aktion je
 * Bildschirm. Alles andere ist bewusst zurückhaltender, damit er trägt.
 *
 * Die Typen kommen von `HTMLMotionProps<'button'>` statt von
 * `ButtonHTMLAttributes`: framer-motion belegt `onDrag`, `onAnimationStart`
 * und einige weitere Ereignisse mit eigenen Signaturen, die sich mit den
 * DOM-Typen sonst beißen.
 */

type MotionButtonProps = HTMLMotionProps<'button'>;

const TAP = { scale: 0.97 };

interface PrimaryButtonProps extends MotionButtonProps {
  children: ReactNode;
  /** Steht rechts neben der Beschriftung – „Weiter ›", „Erstellen ✓". */
  icon?: ReactNode;
  /** Füllt die volle Breite statt sich an den Inhalt zu schmiegen. */
  block?: boolean;
  tone?: 'schwarz' | 'positiv' | 'negativ';
}

const TONES = {
  schwarz: 'bg-action text-[var(--c-action-text)]',
  positiv: 'bg-positive text-white',
  negativ: 'bg-negative text-white',
} as const;

export function PrimaryButton({
  children,
  icon,
  block = false,
  tone = 'schwarz',
  className,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : TAP}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2.5 rounded-[18px] px-6 py-4',
        'text-[17px] font-bold tracking-tight shadow-action',
        'transition-opacity disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none',
        TONES[tone],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {icon && <span className="shrink-0">{icon}</span>}
    </motion.button>
  );
}

interface SecondaryButtonProps extends MotionButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  block?: boolean;
}

export function SecondaryButton({
  children,
  icon,
  block = false,
  className,
  ...props
}: SecondaryButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={TAP}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-4',
        'bg-surface-muted text-[17px] font-bold tracking-tight text-text',
        'transition-opacity disabled:opacity-35',
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
}

interface IconButtonProps extends MotionButtonProps {
  children: ReactNode;
  label: string;
  variant?: 'flaeche' | 'blank';
}

export function IconButton({
  children,
  label,
  variant = 'flaeche',
  className,
  ...props
}: IconButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={TAP}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        'transition-colors disabled:opacity-35',
        variant === 'flaeche' ? 'bg-surface-muted text-text' : 'text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/** Textknopf ohne Fläche – für nachgeordnete Aktionen in Listen und Sheets. */
export function TextButton({
  children,
  className,
  tone = 'neutral',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'neutral' | 'negativ';
}) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-lg px-2 py-1.5 text-[15px] font-semibold transition-opacity active:opacity-60',
        tone === 'negativ' ? 'text-negative' : 'text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Der schwebende Aktionsknopf unten rechts – die Position, an der er in den
 * Vorlagen immer sitzt. Berücksichtigt die Home-Indicator-Zone.
 */
export function FloatingAction({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <PrimaryButton
        className="pointer-events-auto"
        icon={icon}
        onClick={onClick}
        disabled={disabled ?? false}
      >
        {children}
      </PrimaryButton>
    </div>
  );
}
