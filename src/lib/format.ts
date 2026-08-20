import { format, formatDistanceToNowStrict, isThisYear, isToday, isYesterday } from 'date-fns';
import { de } from 'date-fns/locale';

/** Deutsche Zahlen- und Datumsformate an einer Stelle. */

export function num(value: number, digits = 0): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Gewicht ohne unnötige Nachkommastellen: 80 kg, aber 82,5 kg. */
export function kg(value: number | null, unit = 'kg'): string {
  if (value === null) return '–';
  const digits = Number.isInteger(value) ? 0 : Math.abs(value * 4 - Math.round(value * 4)) < 1e-9 ? 2 : 1;
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits })} ${unit}`;
}

/** Große Volumenangaben werden ab 10 Tonnen in Tonnen dargestellt. */
export function volume(kgValue: number): string {
  if (kgValue >= 10_000) return `${num(kgValue / 1000, 1)} t`;
  return `${num(Math.round(kgValue))} kg`;
}

/** Satzzahlen können halb sein (einseitige Übungen). */
export function sets(value: number): string {
  return Number.isInteger(value) ? String(value) : num(value, 1);
}

export function dateShort(ms: number): string {
  const date = new Date(ms);
  return format(date, isThisYear(date) ? 'd. MMM' : 'd. MMM yyyy', { locale: de });
}

export function dateLong(ms: number): string {
  return format(new Date(ms), 'EEEE, d. MMMM yyyy', { locale: de });
}

export function time(ms: number): string {
  return format(new Date(ms), 'HH:mm', { locale: de });
}

/** „Heute", „Gestern" oder das Datum – wie man im Alltag darüber spricht. */
export function dateRelative(ms: number): string {
  const date = new Date(ms);
  if (isToday(date)) return 'Heute';
  if (isYesterday(date)) return 'Gestern';
  return dateShort(ms);
}

export function sinceNow(ms: number): string {
  return `vor ${formatDistanceToNowStrict(new Date(ms), { locale: de })}`;
}

/** ISO-Tagesdatum `YYYY-MM-DD` in der lokalen Zeitzone. */
export function isoDay(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function monthLabel(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: de });
}

export function monthShort(date: Date): string {
  return format(date, 'MMM', { locale: de });
}

/** Kalenderwoche nach ISO – Grundlage der Wochenauswertung. */
export function isoWeek(date: Date): string {
  return format(date, "yyyy-'KW'II", { locale: de });
}

/**
 * ISO-Datum `2026-08-16` als deutsches `16.08.2026`.
 *
 * Reine Zeichenketten-Umformung ohne `Date`-Umweg – so kann keine Zeitzone
 * das Datum um einen Tag verschieben. Unlesbares kommt unverändert zurück,
 * damit nirgends „Invalid Date" steht.
 */
export function dateNumeric(iso: string | undefined | null): string {
  if (!iso) return '';
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!treffer) return iso;
  return `${treffer[3]}.${treffer[2]}.${treffer[1]}`;
}
