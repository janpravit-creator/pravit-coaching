import type { Client } from '@/db/types';
import { paketName, preisEinesKunden } from './pakete';

/**
 * Rechnungsstellung.
 *
 * § 14 UStG verlangt eine **fortlaufende** Nummer: einmalig vergeben und
 * lückenlos aufsteigend. Die frühere Fassung bildete die Nummer aus einem
 * Hash über Kunde und Monat — eindeutig zwar, aber nicht fortlaufend, und
 * damit für eine Betriebsprüfung wertlos, weil sich weder Reihenfolge noch
 * Vollständigkeit nachvollziehen lässt.
 *
 * Deshalb zählt jetzt ein Zähler je Jahr hoch, und jede vergebene Nummer wird
 * gespeichert. Wird dieselbe Rechnung erneut geöffnet, kommt die bereits
 * vergebene Nummer zurück statt einer neuen — sonst entstünden zwei Belege
 * über dieselbe Leistung.
 */

export interface Rechnungsposten {
  bezeichnung: string;
  zeitraum: string;
  betrag: number;
}

export interface Rechnungsdaten {
  nummer: string;
  /** Rechnungsdatum als ISO `YYYY-MM-DD`. */
  datum: string;
  faelligAm: string;
  posten: Rechnungsposten[];
  summe: number;
}

/** `PRV-2026-0001` – vierstellig, damit die Sortierung als Text stimmt. */
export function formatiereNummer(jahr: number, zaehler: number): string {
  return `PRV-${jahr}-${String(zaehler).padStart(4, '0')}`;
}

/**
 * Liest den Zählerstand aus einer bereits vergebenen Nummer.
 * Gibt 0 zurück, wenn die Nummer nicht dem Muster entspricht.
 */
export function zaehlerAus(nummer: string, jahr: number): number {
  const treffer = new RegExp(`^PRV-${jahr}-(\\d+)$`).exec(nummer.trim());
  if (!treffer?.[1]) return 0;
  const wert = Number(treffer[1]);
  return Number.isFinite(wert) ? wert : 0;
}

/**
 * Der nächste freie Zählerstand eines Jahres.
 *
 * Bewusst „höchste vergebene Nummer + 1" statt „Anzahl + 1": Wird eine
 * Rechnung gelöscht, entstünde sonst eine Nummer, die es schon einmal gab.
 */
export function naechsterZaehler(vergebeneNummern: string[], jahr: number): number {
  const hoechster = vergebeneNummern.reduce((max, n) => Math.max(max, zaehlerAus(n, jahr)), 0);
  return hoechster + 1;
}

/** Addiert Tage auf ein ISO-Datum, ohne über die Zeitzone zu stolpern. */
export function plusTage(iso: string, tage: number): string {
  const [j, m, t] = iso.split('-').map(Number);
  if (!j || !m || !t) return iso;
  const d = new Date(Date.UTC(j, m - 1, t));
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/**
 * Baut die Positionen einer Monatsrechnung.
 *
 * Mehrere Monate ergeben mehrere Positionen — so lässt sich ein Rückstand in
 * einem Beleg abrechnen, statt drei einzelne zu erzeugen.
 */
export function postenFuer(
  client: Client,
  monate: string[],
  monatLabel: (monat: string) => string,
): Rechnungsposten[] {
  const betrag = preisEinesKunden(client);
  return monate.map((monat) => ({
    bezeichnung: `Coaching – ${paketName(client.paket)}`,
    zeitraum: monatLabel(monat),
    betrag,
  }));
}

export function summe(posten: Rechnungsposten[]): number {
  return posten.reduce((s, p) => s + p.betrag, 0);
}

/** Betrag in deutscher Schreibweise mit zwei Nachkommastellen. */
export function euro(betrag: number): string {
  return `${betrag.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
