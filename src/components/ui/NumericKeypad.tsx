import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { IconArrowRight } from '../icons';
import { PrimaryButton } from './Button';

/**
 * Ziffernblock nach dem Vorbild des Betrags-Bildschirms aus den Screenshots.
 *
 * Große, randlose Tasten statt eines Textfelds: auf dem Handy trifft man sie
 * mit der Daumenspitze, und es öffnet sich keine Systemtastatur, die den
 * halben Bildschirm verdeckt.
 */

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  /** Komma-Taste anzeigen – bei Wiederholungen unerwünscht. */
  allowDecimal?: boolean;
  maxLength?: number;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function NumericKeypad({
  value,
  onChange,
  allowDecimal = true,
  maxLength = 7,
}: KeypadProps) {
  const press = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ',') {
      // Nur ein Komma, und nie als erstes Zeichen.
      if (value.includes(',') || value === '') return;
      onChange(`${value},`);
      return;
    }
    if (value.length >= maxLength) return;
    // Führende Nullen vermeiden: „0" + „5" ergibt „5", nicht „05".
    if (value === '0') {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-1">
      {DIGITS.map((digit) => (
        <Key key={digit} onPress={() => press(digit)}>
          {digit}
        </Key>
      ))}
      <Key onPress={() => press(',')} disabled={!allowDecimal}>
        {allowDecimal ? ',' : ''}
      </Key>
      <Key onPress={() => press('0')}>0</Key>
      <Key onPress={() => press('⌫')} aria-label="Löschen">
        ←
      </Key>
    </div>
  );
}

function Key({
  children,
  onPress,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.9, backgroundColor: 'var(--c-surface-muted)' }}
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      className={cn(
        'flex h-16 items-center justify-center rounded-2xl',
        'text-[28px] font-semibold tracking-tight select-none',
        disabled && 'pointer-events-none opacity-0',
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/**
 * Vollständiger Eingabe-Bildschirm: große Anzeige oben, Block unten,
 * schwarzer Bestätigen-Knopf – die Komposition aus der Vorlage.
 */
export function NumberEntry({
  label,
  hint,
  value,
  onChange,
  onConfirm,
  unit,
  allowDecimal = true,
  confirmLabel = 'Weiter',
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  unit?: string;
  allowDecimal?: boolean;
  confirmLabel?: string;
}) {
  const empty = value === '';

  return (
    <div className="flex h-full flex-col">
      <div className="px-1">
        <h3 className="text-[24px] font-extrabold tracking-tight">{label}</h3>
        {hint && <p className="mt-1 text-[15px] text-muted">{hint}</p>}
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className={cn('flex items-baseline gap-2', empty && 'text-subtle')}>
          <span className="tnum text-[56px] leading-none font-bold tracking-tight">
            {empty ? '0' : value}
          </span>
          {unit && <span className="text-[32px] font-bold text-muted">{unit}</span>}
        </div>
      </div>

      <NumericKeypad value={value} onChange={onChange} allowDecimal={allowDecimal} />

      <div className="mt-4 flex justify-end">
        <PrimaryButton onClick={onConfirm} disabled={empty} icon={<IconArrowRight size={20} />}>
          {confirmLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** „12,5" → 12.5. Deutsche Kommaschreibweise in eine Zahl übersetzen. */
export function parseGerman(value: string): number | null {
  if (value.trim() === '') return null;
  const normalized = Number(value.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : null;
}

/** 12.5 → „12,5". Ohne unnötige Nachkommastellen. */
export function formatGerman(value: number | null): string {
  if (value === null) return '';
  return String(value).replace('.', ',');
}
