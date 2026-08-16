import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Gemeinsame Bausteine für den Datenbankzugriff.
 *
 * Die Pfade stehen ausschließlich hier – in der alten Fassung waren
 * `collection(db, "clients", id, "checkins")` und Verwandte über 55 Stellen
 * verteilt, und ein Tippfehler fiel erst zur Laufzeit auf.
 */

export const paths = {
  clients: () => collection(db, 'clients'),
  client: (clientId: string) => doc(db, 'clients', clientId),

  checkins: (clientId: string) => collection(db, 'clients', clientId, 'checkins'),
  checkin: (clientId: string, checkinId: string) =>
    doc(db, 'clients', clientId, 'checkins', checkinId),

  logbook: (clientId: string) => collection(db, 'clients', clientId, 'logbook'),
  logbookEntry: (clientId: string, entryId: string) =>
    doc(db, 'clients', clientId, 'logbook', entryId),

  planHistory: (clientId: string) => collection(db, 'clients', clientId, 'planHistory'),
  mealHistory: (clientId: string) => collection(db, 'clients', clientId, 'mealHistory'),

  notifications: () => collection(db, 'notifications'),
  notification: (id: string) => doc(db, 'notifications', id),

  templates: () => collection(db, 'templates'),
  template: (id: string) => doc(db, 'templates', id),

  exercises: () => collection(db, 'exercises'),
  exercise: (id: string) => doc(db, 'exercises', id),

  customFoods: () => collection(db, 'customFoods'),
  customFood: (id: string) => doc(db, 'customFoods', id),

  invoices: () => collection(db, 'invoices'),
  invoice: (id: string) => doc(db, 'invoices', id),

  referrals: () => collection(db, 'referrals'),
  referral: (id: string) => doc(db, 'referrals', id),
} satisfies Record<string, (...args: never[]) => unknown>;

/** Wandelt einen Abfrage-Schnappschuss in typisierte Datensätze mit `id`. */
export function toRecords<T extends { id: string }>(snap: QuerySnapshot<DocumentData>): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export function toRecord<T extends { id: string }>(
  snap: DocumentSnapshot<DocumentData>,
): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/**
 * Entfernt `undefined`-Werte, bevor geschrieben wird.
 *
 * Firestore lehnt `undefined` ab und bricht den ganzen Schreibvorgang ab –
 * ein optionales Feld, das niemand ausgefüllt hat, würde sonst das Speichern
 * eines ganzen Kundenprofils verhindern.
 */
export function ohneUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

export type { CollectionReference };
