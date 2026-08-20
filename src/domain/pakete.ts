import type { Client } from '@/db/types';
import { dieserMonat } from './dates';

/**
 * Pakete, Preise und Bestandsschutz.
 *
 * Die Preise stehen **fest** und werden von Hand geändert — bewusst keine
 * Automatik, die zu einem Stichtag von selbst erhöht. Wann der Preis für
 * Neukunden steigt, entscheidet der Coach; dann wird `preis` unten angepasst
 * und gilt ab diesem Moment für alle Neuanlagen.
 *
 * Die Regel darüber bleibt davon unberührt:
 *
 *   **Ein Kunde behält den Preis, zu dem er eingestiegen ist.**
 *
 * Technisch trägt jeder Kunde sein `paketPreis` als eigenes Feld. Der Wert
 * wird beim Anlegen einmal gesetzt und danach nie automatisch überschrieben.
 * `preisEinesKunden()` liest immer dieses Feld und fällt nur dann auf die
 * Tabelle zurück, wenn nichts hinterlegt ist (Altbestand aus der Zeit vor den
 * Paketen).
 */

export interface PaketDefinition {
  name: string;
  inhalt: string;
  /** Monatspreis in Euro. `null` bei „Individuell" – dort wird frei vereinbart. */
  preis: number | null;
  /** Altbestand: wird weiter angezeigt, aber nicht mehr zur Auswahl gestellt. */
  veraltet?: boolean;
}

/**
 * Die aktuell gültigen Preise.
 *
 * Zum Erhöhen genau hier den Wert ändern — Bestandskunden merken davon nichts,
 * weil ihr Preis in `paketPreis` steht.
 */
export const PAKETE: Record<string, PaketDefinition> = {
  training: {
    name: 'Training',
    inhalt: 'Trainingsplan + wöchentlicher Check-in + App-Zugang',
    preis: 79,
  },
  ernaehrung: {
    name: 'Ernährung',
    inhalt: 'Ernährungsplan + wöchentlicher Check-in + App-Zugang',
    preis: 79,
  },
  komplett: {
    name: 'Komplett',
    inhalt: 'Training und Ernährung + prioritäres Feedback',
    preis: 129,
  },
  premium: {
    name: 'Premium',
    inhalt: 'Komplett-Paket + 4 Trainingseinheiten pro Monat (1× pro Woche)',
    preis: 199,
  },
  individuell: {
    name: 'Individuell',
    inhalt: 'Frei vereinbart',
    preis: null,
  },
  // Aus der Testphase. Bestandskunden tragen diesen Schlüssel weiter in
  // Firestore; er darf nicht verschwinden, sonst stünde bei ihnen „Kein Paket".
  lifestyle: {
    name: 'Lifestyle (Testphase)',
    inhalt: 'Früheres Komplettpaket',
    preis: null,
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

export function paketInhalt(key: string | undefined): string {
  if (!key) return '';
  return PAKETE[key]?.inhalt ?? '';
}

/** Was ein Neukunde heute zahlen würde. `null`, wenn frei vereinbart. */
export function aktuellerPreis(paket: string | undefined): number | null {
  if (!paket) return null;
  return PAKETE[paket]?.preis ?? null;
}

/**
 * Was dieser Kunde zahlt.
 *
 * Das hinterlegte `paketPreis` gewinnt immer — das ist der Bestandsschutz.
 * Nur wenn gar nichts hinterlegt ist, wird der heutige Listenpreis angenommen.
 */
export function preisEinesKunden(client: Client): number {
  if (typeof client.paketPreis === 'number' && client.paketPreis > 0) return client.paketPreis;
  return aktuellerPreis(client.paket) ?? 0;
}

export interface Preislage {
  /** Was der Kunde zahlt. */
  preis: number;
  /** Was ein Neukunde heute zahlen würde – `null`, wenn frei vereinbart. */
  listenpreis: number | null;
  /** Der Kunde zahlt weniger als der aktuelle Listenpreis. */
  bestandsschutz: boolean;
  /** Differenz zum Listenpreis, 0 wenn keiner oder gleich. */
  ersparnis: number;
}

/**
 * Stellt Ist-Preis und heutigen Listenpreis nebeneinander — die Grundlage für
 * den Hinweis „zahlt 129 €, neu wären 149 €" in der Kundenakte. Relevant wird
 * das, sobald die Preise oben von Hand angehoben werden.
 */
export function preislage(client: Client): Preislage {
  const preis = preisEinesKunden(client);
  const listenpreis = aktuellerPreis(client.paket);
  const bestandsschutz = listenpreis !== null && preis > 0 && preis < listenpreis;
  return {
    preis,
    listenpreis,
    bestandsschutz,
    ersparnis: bestandsschutz && listenpreis !== null ? listenpreis - preis : 0,
  };
}

/** Abstand zweier `YYYY-MM` in Monaten. Negativ, wenn `bis` früher liegt. */
function monatsAbstand(von: string, bis: string): number {
  const [vj, vm] = von.split('-').map(Number);
  const [bj, bm] = bis.split('-').map(Number);
  if (!vj || !vm || !bj || !bm) return 0;
  return (bj - vj) * 12 + (bm - vm);
}

function naechsterMonat(monat: string): string {
  const [j, m] = monat.split('-').map(Number);
  if (!j || !m) return monat;
  return m === 12 ? `${j + 1}-01` : `${j}-${String(m + 1).padStart(2, '0')}`;
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

/** Wie viele Monate der Kunde schon dabei ist. Ab 1 gezählt. */
export function monateDabei(client: Client, monat: string = dieserMonat()): number | null {
  const start = (client.startDatum ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start)) return null;
  return Math.max(0, monatsAbstand(start, monat)) + 1;
}

/** Offene Monate eines Kunden bis einschließlich heute. */
export function offeneMonate(client: Client, monat: string = dieserMonat()): string[] {
  const start = (client.startDatum ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start)) return [];

  const bezahlt = new Set(
    (client.zahlungen ?? []).filter((z) => z.bezahlt).map((z) => z.monat),
  );

  const offen: string[] = [];
  let lauf = start;
  while (monatsAbstand(lauf, monat) >= 0) {
    if (!bezahlt.has(lauf)) offen.push(lauf);
    lauf = naechsterMonat(lauf);
  }
  return offen;
}
