import { addDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { ohneUndefined, paths, toRecords } from '../firestore';
import type { AppNotification } from '../types';
import { sortiereNeuesteZuerst } from '@/domain/dates';

/**
 * Hinweise für den Coach (neuer Check-in, neuer Kunde).
 *
 * Die Sammlung wuchs bisher unbegrenzt: Jeder Check-in legte einen Eintrag an,
 * gelöscht wurde nie, und beim Start des Coach-Bereichs wurde die gesamte
 * Sammlung geladen. `aufraeumen` entfernt gelesene Einträge, sobald sie ihren
 * Zweck erfüllt haben.
 */

export async function listNotifications(): Promise<AppNotification[]> {
  const snap = await getDocs(paths.notifications());
  return sortiereNeuesteZuerst(toRecords<AppNotification>(snap));
}

export async function createNotification(
  data: Omit<AppNotification, 'id' | 'createdAt' | 'seen'>,
): Promise<void> {
  await addDoc(
    paths.notifications(),
    ohneUndefined({ ...data, createdAt: new Date().toISOString(), seen: false }),
  );
}

export async function markiereAlleGelesen(notifications: AppNotification[]): Promise<void> {
  await Promise.all(
    notifications
      .filter((n) => !n.seen)
      .map((n) => updateDoc(paths.notification(n.id), { seen: true })),
  );
}

/**
 * Entfernt gelesene Hinweise, die älter als 30 Tage sind.
 *
 * Ein gelesener Hinweis von vor Wochen hat keinen Wert mehr, kostet aber bei
 * jedem Start des Coach-Bereichs Ladezeit.
 */
export async function aufraeumen(notifications: AppNotification[]): Promise<number> {
  const grenze = Date.now() - 30 * 86_400_000;
  const alt = notifications.filter(
    (n) => n.seen === true && (Date.parse(n.createdAt ?? '') || 0) < grenze,
  );
  await Promise.all(alt.map((n) => deleteDoc(paths.notification(n.id))));
  return alt.length;
}
