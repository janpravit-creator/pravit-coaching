import type { Client } from '@/db/types';
import { dieserMonat } from './dates';

/**
 * Pakete, Preisphasen und Bestandsschutz (Konzept Kap. 7).
 *
 * Die Preise steigen über die Zeit in drei Phasen — am Anfang fehlen
 * Bewertungen und Track Record, niedrigere Preise senken die Einstiegshürde.
 * Der Kern dieser Datei ist deshalb nicht die Preistabelle, sondern die
 * Regel darüber:
 *
 *   **Ein Kunde behält den Preis, zu dem er eingestiegen ist.**
 *
 * Technisch trägt jeder Kunde sein `paketPreis` als eigenes Feld. Der Wert
 * wird beim Anlegen einmal gesetzt und danach nie automatisch überschrieben —
 * eine Preiserhöhung gilt nur für Neukunden. `preisEinesKunden()` liest immer
 * dieses Feld und fällt nur dann auf die Tabelle zurück, wenn nichts
 * hinterlegt ist (Altbestand aus der Zeit vor den Paketen).
 */

export type Phase = 'start' | 'standard' | 'etabliert';

/**
 * Beginn der Preisphasen als `YYYY-MM`.
 *
 * Monat 1 ist Juni 2026, der Beginn der Betreuung. „Start" läuft Monat 1–6
 * (bis November 2026), „Standard" 7–18 (Dezember 2026 bis November 2027),
 * „Etabliert" ab 19 (ab Dezember 2027).
 *
 * Verschiebt sich der tatsächliche Start, ist das die eine Zeile, die
 * angepasst werden muss — alles andere rechnet sich daraus.
 */
export const PHASEN_START = '2026-06';

export interface PaketDefinition {
  name: string;
  inhalt: string;
  /** `null` bei „Individuell" – dort wird frei verhandelt. */
  preise: Record<Phase, number> | null;
  /** Altbestand: wird weiter angezeigt, aber nicht mehr zur Auswahl gestellt. */
  veraltet?: boolean;
}

export const PAKETE: Record<string, PaketDefinition> = {
  training: {
    name: 'Training',
    inhalt: 'Trainingsplan + wöchentlicher Check-in + App-Zugang',
    preise: { start: 79, standard: 89, etabliert: 99 },
  },
  ernaehrung: {
    name: 'Ernährung',
    inhalt: 'Ernährungsplan + wöchentlicher Check-in + App-Zugang',
    preise: { start: 79, standard: 89, etabliert: 99 },
  },
  komplett: {
    name: 'Komplett',
    inhalt: 'Training und Ernährung + prioritäres Feedback',
    preise: { start: 129, standard: 149, etabliert: 179 },
  },
  premium: {
    name: 'Premium',
    inhalt: 'Komplett-Paket + monatliches Treffen im Studio',
    preise: { start: 199, standard: 229, etabliert: 259 },
  },
  individuell: {
    name: 'Individuell',
    inhalt: 'Frei vereinbart',
    preise: null,
  },
  // Aus der Testphase. Bestandskunden tragen diesen Schlüssel weiter in
  // Firestore; er darf nicht verschwinden, sonst stünde bei ihnen „Kein Paket".
  lifestyle: {
    name: 'Lifestyle (Testphase)',
    inhalt: 'Früheres Komplettpaket',
    preise: null,
    veraltet: true,
  },
};

/** Die Pakete, die bei einer Neuanlage zur Auswahl stehen. */
export const WAEHLBARE_PAKETE = Object.entries(PAKETE)
  .filter(([, p]) => !p.veraltet)
  .map(([key]) => key);

export function paketName(key: string | undefined): string {
  if (!key) return 'Kein Paket';
  return PAKETE[key]?.name ?? key;
}

/** Abstand zweier `YYYY-MM` in Monaten. Negativ, wenn `bis` früher liegt. */
function monatsAbstand(von: string, bis: string): number {
  const [vj, vm] = von.split('-').map(Number);
  const [bj, bm] = bis.split('-').map(Number);
  if (!vj || !vm || !bj || !bm) return 0;
  return (bj - vj) * 12 + (bm - vm);
}

/**
 * Die Phase, in der sich das Geschäft gerade befindet.
 *
 * Zählung ab 1: Der Startmonat selbst ist Monat 1, nicht Monat 0 — sonst
 * verschöbe sich jede Phasengrenze um einen Monat.
 */
export function aktuellePhase(monat: string = dieserMonat()): Phase {
  const nummer = monatsAbstand(PHASEN_START, monat) + 1;
  if (nummer <= 6) return 'start';
  if (nummer <= 18) return 'standard';
  return 'etabliert';
}

export const PHASEN_LABEL: Record<Phase, string> = {
  start: 'Start (Monat 1–6)',
  standard: 'Standard (Monat 7–18)',
  etabliert: 'Etabliert (ab Monat 19)',
};

/** Der Listenpreis eines Pakets in einer Phase. `null` bei frei verhandelten. */
export function preisFuer(paket: string | undefined, phase: Phase): number | null {
  if (!paket) return null;
  return PAKETE[paket]?.preise?.[phase] ?? null;
}

/** Was ein Neukunde heute zahlen würde. */
export function aktuellerPreis(paket: string | undefined, monat: string = dieserMonat()): number | null {
  return preisFuer(paket, aktuellePhase(monat));
}

/**
 * Was dieser Kunde zahlt.
 *
 * Das hinterlegte `paketPreis` gewinnt immer — das ist der Bestandsschutz.
 * Nur wenn gar nichts hinterlegt ist, wird der heutige Listenpreis
 * angenommen.
 */
export function preisEinesKunden(client: Client, monat: string = dieserMonat()): number {
  if (typeof client.paketPreis === 'number' && client.paketPreis > 0) return client.paketPreis;
  return aktuellerPreis(client.paket, monat) ?? 0;
}

export interface Preislage {
  /** Was der Kunde zahlt. */
  preis: number;
  /** Was ein Neukunde heute zahlen würde – `null`, wenn frei verhandelt. */
  listenpreis: number | null;
  /** Der Kunde zahlt weniger als der aktuelle Listenpreis. */
  bestandsschutz: boolean;
  /** Differenz zum Listenpreis, 0 wenn keiner oder gleich. */
  ersparnis: number;
}

/**
 * Stellt Ist-Preis und heutigen Listenpreis nebeneinander — die Grundlage für
 * den Hinweis „zahlt 129 €, neu wären 149 €" in der Kundenakte.
 */
export function preislage(client: Client, monat: string = dieserMonat()): Preislage {
  const preis = preisEinesKunden(client, monat);
  const listenpreis = aktuellerPreis(client.paket, monat);
  const bestandsschutz = listenpreis !== null && preis > 0 && preis < listenpreis;
  return {
    preis,
    listenpreis,
    bestandsschutz,
    ersparnis: bestandsschutz && listenpreis !== null ? listenpreis - preis : 0,
  };
}

/**
 * Der erste Monat, für den noch nicht bezahlt wurde – ab dem Startmonat des
 * Kunden bis einschließlich heute. Gibt `null` zurück, wenn alles beglichen
 * ist.
 *
 * Bewusst nicht „Startdatum plus n Monate": Wer im März und Mai bezahlt hat,
 * im April aber nicht, schuldet den April — eine reine Fortschreibung würde
 * die Lücke übersehen.
 */
export function naechsteFaelligkeit(
  client: Client,
  monat: string = dieserMonat(),
): string | null {
  const start = (client.startDatum ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start)) return null;
  if (monatsAbstand(start, monat) < 0) return start;

  const bezahlt = new Set(
    (client.zahlungen ?? []).filter((z) => z.bezahlt).map((z) => z.monat),
  );

  let lauf = start;
  while (monatsAbstand(lauf, monat) >= 0) {
    if (!bezahlt.has(lauf)) return lauf;
    lauf = naechsterMonat(lauf);
  }
  return null;
}

function naechsterMonat(monat: string): string {
  const [j, m] = monat.split('-').map(Number);
  if (!j || !m) return monat;
  const naechstes = m === 12 ? `${j + 1}-01` : `${j}-${String(m + 1).padStart(2, '0')}`;
  return naechstes;
}

/** Wie viele Monate der Kunde schon dabei ist. Ab 1 gezählt. */
export function monateDabei(client: Client, monat: string = dieserMonat()): number | null {
  const start = (client.startDatum ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start)) return null;
  return Math.max(0, monatsAbstand(start, monat)) + 1;
}
