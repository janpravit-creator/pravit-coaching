import { useState } from 'react';
import { cn } from '@/lib/cn';
import { IconCalendar } from '../icons';
import { PrimaryButton } from './Button';
import { Sheet } from './Sheet';
import { WheelPicker, numberOptions } from './WheelPicker';

/**
 * Datumseingabe über ein Rad-Sheet statt über `<input type="date">`.
 *
 * Das native Datumsfeld hält sich auf iOS nicht an unsere abgerundete Box –
 * die System-Darstellung sprengt sie. Genau wie Zahlen über den Ziffernblock
 * statt die Systemtastatur kommen, kommt ein Datum jetzt über drei Räder
 * (Tag · Monat · Jahr) im selben Design wie der Rest der App.
 */

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const MONAT_OPTIONEN = MONATE.map((label, i) => ({ value: i + 1, label }));

/** Tage im Monat, schaltjahrsicher: Tag 0 des Folgemonats ist der letzte Tag. */
function tageImMonat(jahr: number, monat: number): number {
  return new Date(jahr, monat, 0).getDate();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function heutigesDatum(): { tag: number; monat: number; jahr: number } {
  const now = new Date();
  return { tag: now.getDate(), monat: now.getMonth() + 1, jahr: now.getFullYear() };
}

function ausIso(iso: string): { tag: number; monat: number; jahr: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m?.[1] || !m[2] || !m[3]) return heutigesDatum();
  return { jahr: Number(m[1]), monat: Number(m[2]), tag: Number(m[3]) };
}

export function DateField({
  label,
  hint,
  value,
  onChange,
  placeholder = 'TT.MM.JJJJ',
  yearFrom,
  yearTo,
  className,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  yearFrom?: number;
  yearTo?: number;
  className?: string;
}) {
  const [offen, setOffen] = useState(false);
  const jetzt = new Date().getFullYear();
  const jahrOptionen = numberOptions(yearFrom ?? jetzt - 100, yearTo ?? jetzt + 1);

  const { tag, monat, jahr } = value ? ausIso(value) : heutigesDatum();

  const setzeDatum = (naechster: { tag: number; monat: number; jahr: number }) => {
    // Ein unmögliches Datum wie der 30. Februar kann so nicht entstehen –
    // der Tag wird an den tatsächlich gewählten Monat angepasst.
    const maxTag = tageImMonat(naechster.jahr, naechster.monat);
    const geklammert = Math.min(naechster.tag, maxTag);
    onChange(`${naechster.jahr}-${pad(naechster.monat)}-${pad(geklammert)}`);
  };

  return (
    <label className="block py-2">
      {label && <span className="mb-1.5 block text-[14px] font-semibold text-muted">{label}</span>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOffen(true)}
          className={cn(
            'w-full rounded-[var(--radius-field)] bg-surface-muted px-4 py-3.5 text-left',
            'text-[16px] font-medium outline-none focus:ring-2 focus:ring-line-strong',
            value ? 'text-text' : 'text-subtle',
            className,
          )}
        >
          {value ? `${pad(tag)}.${pad(monat)}.${jahr}` : placeholder}
        </button>
        <IconCalendar
          size={20}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-subtle"
        />
      </div>
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}

      <Sheet
        open={offen}
        onClose={() => setOffen(false)}
        title={label ?? 'Datum'}
        footer={
          <PrimaryButton
            block
            onClick={() => {
              // Auch übernehmen, wenn niemand an einem Rad gedreht hat – sonst
              // zeigen die Räder ein Datum, das beim Schließen wieder
              // verworfen wird. Genau wie beim nativen Rad, das dies ersetzt.
              setzeDatum({ tag, monat, jahr });
              setOffen(false);
            }}
          >
            Fertig
          </PrimaryButton>
        }
      >
        <div className="flex gap-2">
          <WheelPicker
            label="Tag"
            options={numberOptions(1, tageImMonat(jahr, monat))}
            value={tag}
            onChange={(neuerTag) => setzeDatum({ tag: neuerTag, monat, jahr })}
          />
          <WheelPicker
            label="Monat"
            options={MONAT_OPTIONEN}
            value={monat}
            onChange={(neuerMonat) => setzeDatum({ tag, monat: neuerMonat, jahr })}
          />
          <WheelPicker
            label="Jahr"
            options={jahrOptionen}
            value={jahr}
            onChange={(neuesJahr) => setzeDatum({ tag, monat, jahr: neuesJahr })}
          />
        </div>
      </Sheet>
    </label>
  );
}
