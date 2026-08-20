import type { LogbookEntry, LoggedExercise, LoggedSet } from '@/db/types';
import { parseDatum, sortiereNeuesteZuerst } from './dates';
import { zahl } from './nutrition';

/**
 * Auswertung des Trainings-Logbuchs.
 *
 * Gewichte und Wiederholungen liegen als Zeichenketten vor und sind oft leer –
 * ein angefangener Satz ohne Eingabe ist der Normalfall, kein Fehler. Alles
 * hier zählt deshalb nur, was tatsächlich ausgefüllt ist.
 */

export function istBefuellt(set: LoggedSet): boolean {
  return zahl(set.kg) > 0 && zahl(set.reps) > 0;
}

/** Bewegtes Gewicht eines Satzes. */
export function satzVolumen(set: LoggedSet): number {
  return istBefuellt(set) ? zahl(set.kg) * zahl(set.reps) : 0;
}

/** Volumen einer Übung. Aufwärmsätze zählen nicht mit. */
export function uebungsVolumen(ex: LoggedExercise): number {
  return (ex.sets ?? []).reduce((sum, s) => sum + satzVolumen(s), 0);
}

export function trainingsVolumen(entry: LogbookEntry): number {
  return (entry.exercises ?? []).reduce((sum, ex) => sum + uebungsVolumen(ex), 0);
}

export function anzahlSaetze(entry: LogbookEntry): number {
  return (entry.exercises ?? []).reduce(
    (sum, ex) => sum + (ex.sets ?? []).filter(istBefuellt).length,
    0,
  );
}

/**
 * Geschätztes Einwiederholungsmaximum nach Epley.
 * Jenseits von zwölf Wiederholungen wird die Formel unzuverlässig und deckelt.
 */
export function e1RM(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + Math.min(reps, 12) / 30);
}

export function bestesE1RM(ex: LoggedExercise): number {
  return (ex.sets ?? []).reduce(
    (best, s) => (istBefuellt(s) ? Math.max(best, e1RM(zahl(s.kg), zahl(s.reps))) : best),
    0,
  );
}

export function topGewicht(ex: LoggedExercise): number {
  return (ex.sets ?? []).reduce((best, s) => (istBefuellt(s) ? Math.max(best, zahl(s.kg)) : best), 0);
}

/* ------------------------------------------------------------------ *
 * Verlauf einer einzelnen Übung
 * ------------------------------------------------------------------ */

export type UebungsKennzahl = 'e1rm' | 'gewicht' | 'volumen';

export const KENNZAHL_LABEL: Record<UebungsKennzahl, string> = {
  e1rm: 'Geschätztes 1RM',
  gewicht: 'Bestes Gewicht',
  volumen: 'Volumen',
};

/** Vergleicht Übungsnamen unabhängig von Schreibweise und Leerzeichen. */
export function uebungsSchluessel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Alle Übungsnamen, die im Logbuch vorkommen – alphabetisch. */
export function vorkommendeUebungen(entries: LogbookEntry[]): string[] {
  const gesehen = new Map<string, string>();
  for (const entry of entries) {
    for (const ex of entry.exercises ?? []) {
      const key = uebungsSchluessel(ex.name ?? '');
      if (key && !gesehen.has(key)) gesehen.set(key, ex.name);
    }
  }
  return [...gesehen.values()].sort((a, b) => a.localeCompare(b, 'de'));
}

export interface VerlaufPunkt {
  t: number;
  value: number;
}

export function uebungsVerlauf(
  entries: LogbookEntry[],
  uebungsName: string,
  kennzahl: UebungsKennzahl,
): VerlaufPunkt[] {
  const key = uebungsSchluessel(uebungsName);
  const punkte: VerlaufPunkt[] = [];

  for (const entry of entries) {
    const t = parseDatum(entry.datum) ?? parseDatum(entry.createdAt);
    if (t === null) continue;

    for (const ex of entry.exercises ?? []) {
      if (uebungsSchluessel(ex.name ?? '') !== key) continue;
      const value =
        kennzahl === 'e1rm'
          ? Math.round(bestesE1RM(ex) * 10) / 10
          : kennzahl === 'gewicht'
            ? topGewicht(ex)
            : Math.round(uebungsVolumen(ex));
      if (value > 0) punkte.push({ t, value });
    }
  }

  return punkte.sort((a, b) => a.t - b.t);
}

/**
 * Die zuletzt erfassten Sätze einer Übung.
 *
 * Speist den „letztes Training"-Hinweis beim Eintragen: Man sieht, was beim
 * letzten Mal stand, statt es aus dem Kopf zusammenzusuchen.
 */
export function letzteSaetze(
  entries: LogbookEntry[],
  uebungsName: string,
): { datum: string | undefined; sets: LoggedSet[] } | null {
  const key = uebungsSchluessel(uebungsName);

  for (const entry of sortiereNeuesteZuerst(entries)) {
    for (const ex of entry.exercises ?? []) {
      if (uebungsSchluessel(ex.name ?? '') !== key) continue;
      const befuellt = (ex.sets ?? []).filter(istBefuellt);
      if (befuellt.length > 0) return { datum: entry.datum, sets: befuellt };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Gewichtsverlauf aus den Check-ins
 * ------------------------------------------------------------------ */

/** Fortschritt zum Zielgewicht in Prozent. */
export function zielFortschritt(
  startKg: number,
  aktuellKg: number,
  zielKg: number,
): number | null {
  if (!startKg || !zielKg || startKg === zielKg) return null;
  const anteil = Math.abs(aktuellKg - startKg) / Math.abs(zielKg - startKg);
  return Math.min(100, Math.max(0, Math.round(anteil * 100)));
}
