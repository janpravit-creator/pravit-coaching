import { addDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { ohneUndefined, paths, toRecords } from '../firestore';
import type { LogbookEntry } from '../types';
import { sortiereNeuesteZuerst } from '@/domain/dates';

/** Trainings-Logbuch eines Kunden. */

export async function listLogbook(clientId: string): Promise<LogbookEntry[]> {
  const snap = await getDocs(paths.logbook(clientId));
  return sortiereNeuesteZuerst(toRecords<LogbookEntry>(snap));
}

export async function createLogEntry(
  clientId: string,
  data: Omit<LogbookEntry, 'id'>,
): Promise<void> {
  await addDoc(
    paths.logbook(clientId),
    ohneUndefined({ ...data, createdAt: new Date().toISOString() }),
  );
}

export async function updateLogEntry(
  clientId: string,
  entryId: string,
  patch: Partial<LogbookEntry>,
): Promise<void> {
  const { id: _id, ...rest } = patch;
  await updateDoc(paths.logbookEntry(clientId, entryId), ohneUndefined(rest));
}

export async function deleteLogEntry(clientId: string, entryId: string): Promise<void> {
  await deleteDoc(paths.logbookEntry(clientId, entryId));
}
