import type { Client } from '@/db/types';
import { hatFestenPreis } from './payments';
import { preisEinesKunden } from './pakete';

/**
 * Steuerung: Wo steht das Geschäft im Zwei-Jahres-Plan (Konzept Kap. 7 und 13).
 *
 * Die Online-Einnahmen rechnet die App selbst aus den Kunden aus. Anstellung
 * und Präsenz-Training kennt sie nicht — die trägt der Coach je Monat ein.
 * Beides zusammen ergibt erst das Bild, an dem sich das Netto-Ziel messen lässt.
 */

/** Zielnetto laut Konzept Kap. 7, Schritt 1. */
export const ZIEL_NETTO = 2000;

/**
 * Rücklage für Steuern und Krankenversicherung.
 *
 * Das Konzept nennt 25–30 %. Gerechnet wird mit dem oberen Wert: Wer zu wenig
 * zurücklegt, hat ein Problem — wer zu viel zurücklegt, hat Geld übrig.
 */
export const RUECKLAGE_ANTEIL = 0.3;

export interface Nebeneinnahmen {
  /** Brutto aus der Studio-Anstellung. */
  anstellung?: number;
  /** Präsenz-Personaltraining auf eigene Rechnung. */
  praesenz?: number;
}

export interface Einnahmenbild {
  online: number;
  anstellung: number;
  praesenz: number;
  gesamt: number;
  /** Was nach der Rücklage übrig bleibt. */
  nachRuecklage: number;
  ruecklage: number;
  /** Abstand zum Zielnetto – negativ, wenn es noch fehlt. */
  abstandZumZiel: number;
  zielErreicht: boolean;
}

/** Wiederkehrender Umsatz aus allen aktiven Kunden mit festem Paket. */
export function onlineEinnahmen(clients: Client[]): number {
  return clients
    .filter((c) => c.aktiv !== false && hatFestenPreis(c))
    .reduce((s, c) => s + preisEinesKunden(c), 0);
}

export function einnahmenbild(clients: Client[], neben: Nebeneinnahmen = {}): Einnahmenbild {
  const online = onlineEinnahmen(clients);
  const anstellung = zahl(neben.anstellung);
  const praesenz = zahl(neben.praesenz);
  const gesamt = online + anstellung + praesenz;

  // Auf die Anstellung führt der Arbeitgeber bereits ab; zurückzulegen ist
  // nur auf das, was selbstständig verdient wird.
  const ruecklage = Math.round((online + praesenz) * RUECKLAGE_ANTEIL);
  const nachRuecklage = gesamt - ruecklage;

  return {
    online,
    anstellung,
    praesenz,
    gesamt,
    ruecklage,
    nachRuecklage,
    abstandZumZiel: nachRuecklage - ZIEL_NETTO,
    zielErreicht: nachRuecklage >= ZIEL_NETTO,
  };
}

function zahl(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ------------------------------------------------------------------ *
 * Meilensteine (Kap. 13)
 * ------------------------------------------------------------------ */

export interface Meilenstein {
  id: string;
  label: string;
  /** Ab welchem Monat der Selbstständigkeit dieser Abschnitt gilt. */
  abMonat: number;
  /** Zielkorridor aktiver Kunden – wird automatisch geprüft. */
  zielKunden?: [number, number];
  /** Punkte, die nur der Coach abhaken kann. */
  aufgaben: string[];
}

export const MEILENSTEINE: Meilenstein[] = [
  {
    id: 't30',
    label: '30 Tage',
    abMonat: 1,
    aufgaben: [
      'B-Lizenz abschließen',
      'Freiberufler-Status beim Finanzamt klären',
      'PRAVIT auf Bezahlmodus umstellen',
      'Testkunden ansprechen',
    ],
  },
  {
    id: 't90',
    label: '90 Tage',
    abMonat: 3,
    zielKunden: [3, 5],
    aufgaben: ['Anstellung in 1–2 Studios', 'Social Media gestartet', 'Content-Rhythmus etabliert'],
  },
  {
    id: 'm6',
    label: '6 Monate',
    abMonat: 6,
    zielKunden: [8, 12],
    aufgaben: [
      'Erste Kundenerfolge als Content',
      'Google-Profil aktiv',
      'Empfehlungsprogramm läuft',
    ],
  },
  {
    id: 'm12',
    label: '12 Monate',
    abMonat: 12,
    zielKunden: [15, 20],
    aufgaben: [
      'Erste Preiserhöhung für Neukunden',
      'Studio-Stunden reduziert',
      'Shaping-Up-Kooperation geprüft',
    ],
  },
  {
    id: 'm18',
    label: '18 Monate',
    abMonat: 18,
    zielKunden: [20, 25],
    aufgaben: ['Kapazitätsgrenze eingeschätzt', 'Entscheidung über Skalierung getroffen'],
  },
  {
    id: 'm24',
    label: '24 Monate',
    abMonat: 24,
    zielKunden: [25, 30],
    aufgaben: ['Festanstellung ausgelaufen oder minimal', 'Volle Selbstständigkeit erreicht'],
  },
];

/** Der Abschnitt, in dem man sich gerade befindet. */
export function aktuellerMeilenstein(monat: number): Meilenstein {
  // Rückwärts suchen: der letzte, dessen Startmonat erreicht ist.
  for (let i = MEILENSTEINE.length - 1; i >= 0; i--) {
    const m = MEILENSTEINE[i];
    if (m && monat >= m.abMonat) return m;
  }
  return MEILENSTEINE[0]!;
}

export type Kundenstand = 'unter' | 'im_korridor' | 'darueber';

/** Wie der aktuelle Kundenstand zum Zielkorridor eines Abschnitts steht. */
export function kundenstand(
  aktiveKunden: number,
  ziel: [number, number] | undefined,
): Kundenstand | null {
  if (!ziel) return null;
  if (aktiveKunden < ziel[0]) return 'unter';
  if (aktiveKunden > ziel[1]) return 'darueber';
  return 'im_korridor';
}

/**
 * Anteil erledigter Punkte eines Abschnitts als Bruch 0–1.
 *
 * Der Kundenkorridor zählt als eigener Punkt, wenn es einen gibt — sonst
 * hinge der Fortschritt allein an Häkchen, obwohl die Kundenzahl die
 * eigentliche Messgröße ist.
 */
export function fortschritt(
  meilenstein: Meilenstein,
  erledigt: string[],
  aktiveKunden: number,
): number {
  const punkte = meilenstein.aufgaben.length + (meilenstein.zielKunden ? 1 : 0);
  if (punkte === 0) return 1;

  const abgehakt = meilenstein.aufgaben.filter((a) =>
    erledigt.includes(aufgabenId(meilenstein, a)),
  ).length;
  const korridor =
    meilenstein.zielKunden && kundenstand(aktiveKunden, meilenstein.zielKunden) !== 'unter'
      ? 1
      : 0;

  return (abgehakt + korridor) / punkte;
}

/** Stabile Kennung einer Aufgabe, damit Häkchen ein Umbenennen überstehen. */
export function aufgabenId(meilenstein: Meilenstein, aufgabe: string): string {
  const index = meilenstein.aufgaben.indexOf(aufgabe);
  return `${meilenstein.id}:${index}`;
}

export function aktiveKunden(clients: Client[]): number {
  return clients.filter((c) => c.aktiv !== false).length;
}
