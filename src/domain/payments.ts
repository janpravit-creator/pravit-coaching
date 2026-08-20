import type { Client } from '@/db/types';
import { dieserMonat } from './dates';
import { preisEinesKunden } from './pakete';

/**
 * Zahlungen und Einnahmen.
 *
 * Ein Kunde trägt seine Zahlungen als Liste `zahlungen[]` mit `{monat, bezahlt}`.
 * Kunden mit dem Paket `individuell` haben keinen festen Preis und bleiben in
 * der Soll-Rechnung außen vor.
 */

export function hatFestenPreis(client: Client): boolean {
  return Boolean(client.paket) && client.paket !== 'individuell';
}

export function istBezahlt(client: Client, monat: string): boolean {
  return (client.zahlungen ?? []).some((z) => z.monat === monat && z.bezahlt);
}

export interface MonatsLage {
  monat: string;
  soll: number;
  ist: number;
  offen: number;
  bezahlteKunden: number;
  offeneKunden: number;
}

export function monatsLage(
  clients: Client[],
  monat: string = dieserMonat(),
): MonatsLage {
  let soll = 0;
  let ist = 0;
  let bezahlteKunden = 0;
  let offeneKunden = 0;

  for (const client of clients) {
    if (client.aktiv === false || !hatFestenPreis(client)) continue;
    const preis = preisEinesKunden(client);
    soll += preis;
    if (istBezahlt(client, monat)) {
      ist += preis;
      bezahlteKunden += 1;
    } else {
      offeneKunden += 1;
    }
  }

  return { monat, soll, ist, offen: soll - ist, bezahlteKunden, offeneKunden };
}

/** Setzt den Bezahlt-Status eines Monats, ohne andere Monate anzurühren. */
export function setzeZahlung(
  client: Client,
  monat: string,
  bezahlt: boolean,
  now: Date = new Date(),
): Client['zahlungen'] {
  const zahlungen = [...(client.zahlungen ?? [])];
  const eintrag = { monat, bezahlt, updatedAt: now.toISOString() };
  const index = zahlungen.findIndex((z) => z.monat === monat);
  if (index >= 0) zahlungen[index] = eintrag;
  else zahlungen.push(eintrag);
  return zahlungen;
}

/** Tatsächliche Einnahmen je Monat, älteste zuerst. */
export function einnahmenJeMonat(clients: Client[]): Array<{ monat: string; betrag: number }> {
  const summen = new Map<string, number>();

  for (const client of clients) {
    for (const z of client.zahlungen ?? []) {
      if (!z.bezahlt || !z.monat) continue;
      summen.set(z.monat, (summen.get(z.monat) ?? 0) + preisEinesKunden(client));
    }
  }

  return [...summen.entries()]
    .map(([monat, betrag]) => ({ monat, betrag }))
    .sort((a, b) => a.monat.localeCompare(b.monat));
}

/** Wiederkehrender Monatsumsatz aus allen aktiven Kunden mit festem Paket. */
export function wiederkehrenderUmsatz(clients: Client[]): number {
  return clients
    .filter((c) => c.aktiv !== false && hatFestenPreis(c))
    .reduce((sum, c) => sum + preisEinesKunden(c), 0);
}

/** Monatsbezeichnung für die Anzeige: `2026-08` → `August 2026`. */
export function monatLabel(monat: string): string {
  const [jahr, m] = monat.split('-');
  const namen = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];
  const index = Number(m) - 1;
  return `${namen[index] ?? m} ${jahr}`;
}
