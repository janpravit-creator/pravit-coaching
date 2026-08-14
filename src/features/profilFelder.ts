import type { Client } from '@/db/types';

/**
 * Die Felder des Kundenprofils an einer Stelle.
 *
 * Coach und Kunde bearbeiten dasselbe Dokument, nur mit unterschiedlicher
 * Berechtigung – zwei getrennte Feldlisten wären zwei Gelegenheiten, dass ein
 * Feld beim Bearbeiten stillschweigend verlorengeht.
 */

export interface ProfilFeld {
  key: keyof Client;
  label: string;
  /** Mehrzeilig – für Freitext wie Allergien oder Motivation. */
  lang?: boolean;
  /** Der Kunde darf dieses Feld selbst ändern. */
  fuerKunden?: boolean;
}

export const PROFIL_FELDER: ProfilFeld[] = [
  { key: 'vn', label: 'Vorname', fuerKunden: true },
  { key: 'nn', label: 'Nachname', fuerKunden: true },
  { key: 'tel', label: 'Telefon', fuerKunden: true },
  { key: 'geb', label: 'Geburtsdatum', fuerKunden: true },
  { key: 'age', label: 'Alter', fuerKunden: true },
  { key: 'sex', label: 'Geschlecht', fuerKunden: true },
  { key: 'cm', label: 'Größe in cm', fuerKunden: true },
  { key: 'kg', label: 'Startgewicht in kg', fuerKunden: true },
  { key: 'zielgewicht', label: 'Zielgewicht in kg', fuerKunden: true },
  { key: 'ziel', label: 'Ziel', fuerKunden: true },
  { key: 'job', label: 'Beruf', fuerKunden: true },
  { key: 'exp', label: 'Trainingserfahrung', fuerKunden: true },
  { key: 'freq', label: 'Trainingsfrequenz', fuerKunden: true },
  { key: 'diet', label: 'Ernährungsform', fuerKunden: true },
  { key: 'allergie', label: 'Allergien', lang: true, fuerKunden: true },
  { key: 'abneigung', label: 'Abneigungen', lang: true, fuerKunden: true },
  { key: 'verletzung', label: 'Verletzungen', lang: true, fuerKunden: true },
  { key: 'medi', label: 'Medikamente', lang: true, fuerKunden: true },
  { key: 'motiv', label: 'Motivation', lang: true, fuerKunden: true },
  { key: 'erwart', label: 'Erwartungen', lang: true, fuerKunden: true },
];

/** Was der Kunde an seinem eigenen Profil ändern darf – Paket und Preis nicht. */
export const KUNDEN_FELDER = PROFIL_FELDER.filter((f) => f.fuerKunden);

/** Startwerte für ein Formular: alles als Zeichenkette, wie es in der Datenbank steht. */
export function profilWerte(client: Client, felder: ProfilFeld[]): Record<string, string> {
  return Object.fromEntries(felder.map(({ key }) => [key, String(client[key] ?? '')]));
}
