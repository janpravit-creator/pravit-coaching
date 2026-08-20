import { deleteDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ohneUndefined, paths, toRecords } from '../firestore';
import type { Referral } from '../types';

/** Empfehlungen: wer hat wen geworben, und was steht dem Werber zu. */

export async function listReferrals(): Promise<Referral[]> {
  const snap = await getDocs(paths.referrals());
  return toRecords<Referral>(snap).sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );
}

export async function upsertReferral(
  data: Omit<Referral, 'id'> & { id?: string },
): Promise<string> {
  const id = data.id ?? `${data.werberId ?? 'x'}_${data.geworbenerId ?? Date.now()}`;
  const { id: _id, ...rest } = data;
  await setDoc(
    paths.referral(id),
    ohneUndefined({ ...rest, createdAt: data.createdAt ?? new Date().toISOString() }),
    { merge: true },
  );
  return id;
}

/**
 * Vermerkt, dass die Gutschrift verrechnet wurde.
 *
 * Ohne diese Markierung stünde derselbe Anspruch jeden Monat erneut offen —
 * `offeneGutschriften()` filtert genau darauf.
 */
export async function gutschriftGewaehrt(
  id: string,
  art: string,
  betrag: number,
): Promise<void> {
  await updateDoc(paths.referral(id), {
    gewaehrt: new Date().toISOString().slice(0, 10),
    gewaehrtArt: art,
    gewaehrtBetrag: betrag,
  });
}

export async function deleteReferral(id: string): Promise<void> {
  await deleteDoc(paths.referral(id));
}
