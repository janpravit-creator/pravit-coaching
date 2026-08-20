import { addDoc, deleteDoc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ohneUndefined, paths, toRecord, toRecords } from '../firestore';
import type {
  CalorieTarget,
  Client,
  MealPlan,
  Supplement,
  TrainingPlan,
  Zahlung,
} from '../types';

/** Zugriff auf die Kundenstammdaten. */

export async function listClients(): Promise<Client[]> {
  const snap = await getDocs(paths.clients());
  return toRecords<Client>(snap).sort((a, b) =>
    `${a.vn ?? ''}${a.nn ?? ''}`.localeCompare(`${b.vn ?? ''}${b.nn ?? ''}`, 'de'),
  );
}

export async function getClient(clientId: string): Promise<Client | null> {
  return toRecord<Client>(await getDoc(paths.client(clientId)));
}

/**
 * Legt das Kundendokument an. Die Kennung ist die Firebase-Konto-Kennung –
 * dadurch findet die App nach dem Anmelden ohne Umweg das richtige Profil.
 */
export async function createClient(uid: string, data: Omit<Client, 'id'>): Promise<void> {
  await setDoc(paths.client(uid), ohneUndefined({ ...data, uid }));
}

export async function updateClient(clientId: string, patch: Partial<Client>): Promise<void> {
  const { id: _id, ...rest } = patch;
  await updateDoc(paths.client(clientId), ohneUndefined(rest));
}

export async function deleteClient(clientId: string): Promise<void> {
  await deleteDoc(paths.client(clientId));
}

/* ------------------------------------------------------------------ *
 * Pläne
 * ------------------------------------------------------------------ */

/**
 * Speichert die Trainingspläne und legt den bisherigen Stand im Verlauf ab.
 *
 * Die Archivierung passiert *vor* dem Überschreiben – so bleibt nachvollziehbar,
 * womit ein Kunde in welchem Zeitraum trainiert hat.
 */
export async function saveTrainingPlans(
  clientId: string,
  plans: TrainingPlan[],
  vorher: TrainingPlan[] | undefined,
): Promise<void> {
  if (vorher?.length) {
    await addDoc(paths.planHistory(clientId), {
      plans: vorher,
      archivedAt: new Date().toISOString(),
    });
  }
  await updateClient(clientId, { plans });
}

export async function saveMealPlans(
  clientId: string,
  mealPlans: MealPlan[],
  vorher: MealPlan[] | undefined,
): Promise<void> {
  if (vorher?.length) {
    await addDoc(paths.mealHistory(clientId), {
      mealPlans: vorher,
      archivedAt: new Date().toISOString(),
    });
  }
  await updateClient(clientId, { mealPlans });
}

export async function saveSupplements(
  clientId: string,
  supplements: Supplement[],
): Promise<void> {
  await updateClient(clientId, { supplements });
}

export async function saveCoachNotes(clientId: string, coachNotes: string): Promise<void> {
  await updateClient(clientId, { coachNotes });
}

export async function saveCalorieTarget(
  clientId: string,
  calorieTarget: CalorieTarget | null,
): Promise<void> {
  await updateClient(clientId, { calorieTarget });
}

export async function saveZahlungen(clientId: string, zahlungen: Zahlung[]): Promise<void> {
  await updateClient(clientId, { zahlungen });
}

/* ------------------------------------------------------------------ *
 * Plan-Verlauf
 * ------------------------------------------------------------------ */

export async function listPlanHistory(clientId: string) {
  const snap = await getDocs(paths.planHistory(clientId));
  return toRecords<{ id: string; plans?: TrainingPlan[]; archivedAt?: string }>(snap).sort(
    (a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''),
  );
}

export async function listMealHistory(clientId: string) {
  const snap = await getDocs(paths.mealHistory(clientId));
  return toRecords<{ id: string; mealPlans?: MealPlan[]; archivedAt?: string }>(snap).sort(
    (a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''),
  );
}
