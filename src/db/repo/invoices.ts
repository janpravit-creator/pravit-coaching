import { getDocs, setDoc } from 'firebase/firestore';
import { formatiereNummer, naechsterZaehler } from '@/domain/rechnung';
import { ohneUndefined, paths, toRecords } from '../firestore';
import type { Invoice } from '../types';

/**
 * Vergebene Rechnungsnummern.
 *
 * Jede Rechnung wird gespeichert, sobald sie erzeugt wurde — das ist die
 * Voraussetzung dafür, dass die Nummern nach § 14 UStG lückenlos und
 * nachvollziehbar sind. Ohne diese Ablage könnte niemand prüfen, welche
 * Nummern vergeben wurden.
 */

export async function listInvoices(): Promise<Invoice[]> {
  const snap = await getDocs(paths.invoices());
  // Nach Nummer sortiert; die Nummer ist auf vier Stellen aufgefüllt, deshalb
  // stimmt die Textsortierung mit der numerischen überein.
  return toRecords<Invoice>(snap).sort((a, b) => (a.nummer ?? '').localeCompare(b.nummer ?? ''));
}

/**
 * Die Kennung einer Rechnung: ein Kunde bekommt je Monat genau eine.
 *
 * Dadurch ist `ensureInvoice` von sich aus idempotent — zweimaliges Öffnen
 * erzeugt keinen zweiten Beleg über dieselbe Leistung.
 */
export function invoiceId(clientId: string, monat: string): string {
  return `${clientId}_${monat}`;
}

export interface RechnungAnlegen {
  clientId: string;
  clientName: string;
  /** Der Monat, für den die Rechnung gilt (Abrechnungsmonat). */
  monat: string;
  /** Alle abgerechneten Monate – bei Rückstand mehrere. */
  monate: string[];
  betrag: number;
  paket?: string;
  datum: string;
  faelligAm: string;
}

/**
 * Gibt die Rechnung dieses Kunden für diesen Monat zurück und legt sie an,
 * falls es sie noch nicht gibt.
 *
 * Die Nummer wird nur beim ersten Mal vergeben. Kommt es dabei zu einem
 * Wettlauf (zwei Geräte gleichzeitig), gewinnt der spätere Schreibvorgang —
 * bei einem Coach mit einem Gerät ist das kein realistischer Fall, und ein
 * verlorener Wettlauf erzeugt keine doppelte Nummer, sondern überschreibt
 * dieselbe Kennung.
 */
export async function ensureInvoice(daten: RechnungAnlegen): Promise<Invoice> {
  const alle = await listInvoices();
  const id = invoiceId(daten.clientId, daten.monat);

  const vorhanden = alle.find((r) => r.id === id);
  if (vorhanden?.nummer) return vorhanden;

  const jahr = Number(daten.datum.slice(0, 4)) || new Date().getFullYear();
  const nummer = formatiereNummer(
    jahr,
    naechsterZaehler(alle.map((r) => r.nummer ?? ''), jahr),
  );

  const rechnung: Invoice = {
    id,
    nummer,
    clientId: daten.clientId,
    clientName: daten.clientName,
    monat: daten.monat,
    monate: daten.monate,
    betrag: daten.betrag,
    paket: daten.paket,
    datum: daten.datum,
    faelligAm: daten.faelligAm,
    createdAt: new Date().toISOString(),
  };

  const { id: _id, ...rest } = rechnung;
  await setDoc(paths.invoice(id), ohneUndefined(rest));
  return rechnung;
}
