import { addDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { ohneUndefined, paths, toRecords } from '../firestore';
import type { Checkin } from '../types';
import { erledigtPatch, feedbackPatch } from '@/domain/checkin';
import { sortiereNeuesteZuerst } from '@/domain/dates';
import { createNotification } from './notifications';

/**
 * Check-ins eines Kunden.
 *
 * Bewusst **ohne** `orderBy("datum")`: Firestore lässt bei einer Sortierabfrage
 * alle Dokumente stillschweigend weg, denen das Sortierfeld fehlt. Ein Check-in
 * ohne `datum` war damit unsichtbar – und der Kunde erschien als säumig,
 * obwohl er eingereicht hatte. Sortiert wird deshalb im Speicher.
 */
export async function listCheckins(clientId: string): Promise<Checkin[]> {
  const snap = await getDocs(paths.checkins(clientId));
  return sortiereNeuesteZuerst(toRecords<Checkin>(snap));
}

export async function createCheckin(
  clientId: string,
  data: Omit<Checkin, 'id'>,
  clientNameForNotification: string,
): Promise<void> {
  await addDoc(paths.checkins(clientId), ohneUndefined({ ...data, seenByCoach: false }));
  await createNotification({
    type: 'checkin',
    clientId,
    clientName: clientNameForNotification,
    ...(data.datum === undefined ? {} : { datum: data.datum }),
  });
}

export async function updateCheckin(
  clientId: string,
  checkinId: string,
  patch: Partial<Checkin>,
): Promise<void> {
  const { id: _id, ...rest } = patch;
  await updateDoc(paths.checkin(clientId, checkinId), ohneUndefined(rest));
}

export async function deleteCheckin(clientId: string, checkinId: string): Promise<void> {
  await deleteDoc(paths.checkin(clientId, checkinId));
}

/**
 * Hakt einen Check-in ab.
 *
 * Setzt `erledigt` **und** das alte `seenByCoach` – damit verschwindet die
 * To-Do-Meldung sofort, und eine womöglich noch offene alte Fassung der App
 * sieht denselben Stand.
 */
export async function markiereErledigt(clientId: string, checkinId: string): Promise<void> {
  await updateCheckin(clientId, checkinId, erledigtPatch());
}

export async function markiereAlleErledigt(
  clientId: string,
  checkins: Checkin[],
): Promise<void> {
  const patch = erledigtPatch();
  await Promise.all(
    checkins
      .filter((ci) => ci.erledigt !== true)
      .map((ci) => updateCheckin(clientId, ci.id, patch)),
  );
}

/** Speichert das Coach-Feedback und erledigt den Check-in in einem Zug. */
export async function speichereFeedback(
  clientId: string,
  checkinId: string,
  text: string,
): Promise<void> {
  await updateCheckin(clientId, checkinId, feedbackPatch(text));
}

/** Der Kunde hat das Feedback gelesen – räumt den Hinweis auf seiner Startseite weg. */
export async function markiereFeedbackGelesen(
  clientId: string,
  checkinIds: string[],
): Promise<void> {
  await Promise.all(
    checkinIds.map((id) => updateCheckin(clientId, id, { feedbackSeenByClient: true })),
  );
}
