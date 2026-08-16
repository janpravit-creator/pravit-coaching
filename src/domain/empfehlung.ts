import type { Client, Referral } from '@/db/types';
import { preisEinesKunden } from './pakete';

/**
 * Empfehlungsprogramm (Konzept Kap. 11).
 *
 * Bedingung                              Vorteil für den Werber
 * ─────────────────────────────────────  ──────────────────────────────
 * Geworbener bucht 3 Monate              1 Monat 50 % Rabatt
 * Geworbener bucht 6 Monate              1 Monat gratis
 * 3 erfolgreiche Empfehlungen            1 Monat Premium-Upgrade gratis
 *
 * „Bucht drei Monate" heißt hier: **drei bezahlte Monate**, nicht drei Monate
 * seit Anmeldung. Sonst entstünde ein Anspruch aus einem Kunden, der nie
 * gezahlt hat — und der Werber bekäme einen Rabatt für einen Ausfall.
 *
 * Die Stufen bauen aufeinander auf: Wer sechs Monate erreicht, hat die
 * Drei-Monats-Stufe durchlaufen. Angerechnet wird trotzdem nur einmal, und
 * zwar die höhere — sonst gäbe es anderthalb Monate geschenkt statt einem.
 */

export type Stufe = 'halb' | 'gratis';

export const STUFEN: Array<{ stufe: Stufe; abMonaten: number; anteil: number; label: string }> = [
  { stufe: 'gratis', abMonaten: 6, anteil: 1, label: '1 Monat gratis' },
  { stufe: 'halb', abMonaten: 3, anteil: 0.5, label: '1 Monat 50 % Rabatt' },
];

/** Ab so vielen erfolgreichen Empfehlungen gibt es ein Premium-Upgrade. */
export const UPGRADE_AB = 3;

/** Zahl der tatsächlich bezahlten Monate eines Kunden. */
export function bezahlteMonate(client: Client): number {
  return (client.zahlungen ?? []).filter((z) => z.bezahlt).length;
}

/**
 * Die erreichte Stufe eines geworbenen Kunden – `null`, solange er unter drei
 * bezahlten Monaten liegt.
 */
export function stufeFuer(monate: number): Stufe | null {
  return STUFEN.find((s) => monate >= s.abMonaten)?.stufe ?? null;
}

export function stufenLabel(stufe: Stufe): string {
  return STUFEN.find((s) => s.stufe === stufe)?.label ?? String(stufe);
}

/**
 * Der Gutschriftbetrag für den Werber: ein Anteil seines eigenen Monatspreises.
 *
 * Bezugsgröße ist bewusst der Preis des **Werbers**, nicht des Geworbenen —
 * der Rabatt wird schließlich auf seiner Rechnung gewährt.
 */
export function gutschriftBetrag(werber: Client, stufe: Stufe): number {
  const anteil = STUFEN.find((s) => s.stufe === stufe)?.anteil ?? 0;
  return Math.round(preisEinesKunden(werber) * anteil * 100) / 100;
}

/**
 * Ein Empfehlungscode aus dem Namen und der Kennung.
 *
 * Der Name macht ihn aussprechbar (man nennt ihn im Gespräch weiter), die
 * vier Zeichen aus der Kennung machen ihn eindeutig. Gleiche Eingabe ergibt
 * immer denselben Code — er lässt sich also jederzeit neu herleiten, ohne
 * gespeichert zu sein.
 */
export function empfehlungsCode(name: string, id: string): string {
  const stamm = name
    .trim()
    .toUpperCase()
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .replace(/ß/g, 'SS')
    .replace(/[^A-Z]/g, '')
    .slice(0, 6);

  let hash = 0;
  for (const zeichen of id) hash = (hash * 31 + zeichen.charCodeAt(0)) % 1_679_616;
  const schwanz = hash.toString(36).toUpperCase().padStart(4, '0').slice(-4);

  return `${stamm || 'PRAVIT'}-${schwanz}`;
}

export interface EmpfehlungsStand {
  /** Empfehlungen, deren Geworbener die Drei-Monats-Marke erreicht hat. */
  erfolgreiche: number;
  /** Eingelöste und noch offene Empfehlungen zusammen. */
  gesamt: number;
  /** Summe der noch nicht gewährten Gutschriften in Euro. */
  offenerBetrag: number;
  /** Anspruch auf ein Premium-Upgrade (3 erfolgreiche Empfehlungen). */
  upgradeVerdient: boolean;
  /** Wie viele erfolgreiche Empfehlungen noch bis zum Upgrade fehlen. */
  bisUpgrade: number;
}

export interface OffeneGutschrift {
  referralId: string;
  geworbenerName: string;
  stufe: Stufe;
  betrag: number;
}

/**
 * Welche Gutschriften einem Werber zustehen, die noch nicht gewährt wurden.
 *
 * `gewaehrt` auf der Empfehlung merkt sich, was schon verrechnet ist —
 * ansonsten stünde derselbe Anspruch jeden Monat erneut in der Liste.
 */
export function offeneGutschriften(
  werber: Client,
  referrals: Referral[],
  clients: Client[],
): OffeneGutschrift[] {
  const nachId = new Map(clients.map((c) => [c.id, c]));

  return referrals
    .filter((r) => r.werberId === werber.id && !r.gewaehrt && r.geworbenerId)
    .flatMap((r) => {
      const geworbener = r.geworbenerId ? nachId.get(r.geworbenerId) : undefined;
      if (!geworbener) return [];
      const stufe = stufeFuer(bezahlteMonate(geworbener));
      if (!stufe) return [];
      return [
        {
          referralId: r.id,
          geworbenerName: r.geworbenerName ?? 'Unbekannt',
          stufe,
          betrag: gutschriftBetrag(werber, stufe),
        },
      ];
    });
}

export function empfehlungsStand(
  werber: Client,
  referrals: Referral[],
  clients: Client[],
): EmpfehlungsStand {
  const nachId = new Map(clients.map((c) => [c.id, c]));
  const eigene = referrals.filter((r) => r.werberId === werber.id);

  const erfolgreiche = eigene.filter((r) => {
    const geworbener = r.geworbenerId ? nachId.get(r.geworbenerId) : undefined;
    return geworbener ? stufeFuer(bezahlteMonate(geworbener)) !== null : false;
  }).length;

  const offen = offeneGutschriften(werber, referrals, clients);

  return {
    erfolgreiche,
    gesamt: eigene.length,
    offenerBetrag: Math.round(offen.reduce((s, g) => s + g.betrag, 0) * 100) / 100,
    upgradeVerdient: erfolgreiche >= UPGRADE_AB,
    bisUpgrade: Math.max(0, UPGRADE_AB - erfolgreiche),
  };
}
