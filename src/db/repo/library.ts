import { deleteDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ohneUndefined, paths, toRecords } from '../firestore';
import type { CustomFood, LibraryExercise, Template, TemplateType } from '../types';

/**
 * Die Bibliotheken des Coaches: Übungen, eigene Lebensmittel und Plan-Vorlagen.
 */

/* ------------------------------------------------------------------ *
 * Übungen
 * ------------------------------------------------------------------ */

/**
 * Erzeugt aus einem Übungsnamen eine stabile Kennung.
 *
 * Dadurch legt derselbe Name nie zwei Einträge an – auch nicht, wenn er in
 * einem Plan mit anderer Groß-/Kleinschreibung auftaucht.
 */
export function uebungsSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listExercises(): Promise<LibraryExercise[]> {
  const snap = await getDocs(paths.exercises());
  return toRecords<LibraryExercise>(snap).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export async function upsertExercise(
  data: Omit<LibraryExercise, 'id'> & { id?: string },
): Promise<string> {
  const id = data.id ?? uebungsSlug(data.name);
  const { id: _id, ...rest } = data;
  await setDoc(
    paths.exercise(id),
    ohneUndefined({ ...rest, createdAt: data.createdAt ?? new Date().toISOString() }),
    { merge: true },
  );
  return id;
}

/** Legt Übungen an, die in einem Plan vorkommen, aber noch nicht bekannt sind. */
export async function ergaenzeUebungenAusPlan(
  namen: string[],
  bekannt: Set<string>,
): Promise<string[]> {
  const neu = namen
    .map((name) => ({ name: name.trim(), slug: uebungsSlug(name) }))
    .filter((n) => n.slug && !bekannt.has(n.slug));

  const eindeutig = new Map(neu.map((n) => [n.slug, n]));
  await Promise.all(
    [...eindeutig.values()].map((n) => upsertExercise({ id: n.slug, name: n.name })),
  );
  return [...eindeutig.values()].map((n) => n.name);
}

export async function updateExercise(
  id: string,
  patch: Partial<LibraryExercise>,
): Promise<void> {
  const { id: _id, ...rest } = patch;
  await updateDoc(paths.exercise(id), ohneUndefined(rest));
}

export async function deleteExercise(id: string): Promise<void> {
  await deleteDoc(paths.exercise(id));
}

/* ------------------------------------------------------------------ *
 * Eigene Lebensmittel
 * ------------------------------------------------------------------ */

export async function listCustomFoods(): Promise<CustomFood[]> {
  const snap = await getDocs(paths.customFoods());
  return toRecords<CustomFood>(snap).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export async function upsertCustomFood(
  data: Omit<CustomFood, 'id'> & { id?: string },
): Promise<string> {
  const id = data.id ?? uebungsSlug(data.name);
  const { id: _id, ...rest } = data;
  await setDoc(
    paths.customFood(id),
    ohneUndefined({ ...rest, createdAt: data.createdAt ?? new Date().toISOString() }),
    { merge: true },
  );
  return id;
}

export async function updateCustomFood(id: string, patch: Partial<CustomFood>): Promise<void> {
  const { id: _id, ...rest } = patch;
  await updateDoc(paths.customFood(id), ohneUndefined(rest));
}

export async function deleteCustomFood(id: string): Promise<void> {
  await deleteDoc(paths.customFood(id));
}

/* ------------------------------------------------------------------ *
 * Plan-Vorlagen
 * ------------------------------------------------------------------ */

/** Ordnet eine Vorlage einer Art zu. Alles außer `ernaehrung` ist Training. */
export function vorlagenArt(t: Pick<Template, 'type'>): TemplateType {
  return t.type === 'ernaehrung' ? 'ernaehrung' : 'training';
}

/**
 * Vorlagen laden.
 *
 * Der Vergleich läuft über `vorlagenArt`, nicht über `type` selbst: Frühe
 * Vorlagen wurden ohne `type` gespeichert und wären bei einem strengen
 * Vergleich stillschweigend aus der Liste gefallen.
 */
export async function listTemplates(type?: TemplateType): Promise<Template[]> {
  const snap = await getDocs(paths.templates());
  const alle = toRecords<Template>(snap);
  const gefiltert = type ? alle.filter((t) => vorlagenArt(t) === type) : alle;
  return gefiltert.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'de'));
}

export async function saveTemplate(
  data: Omit<Template, 'id'> & { id?: string },
): Promise<string> {
  const id = data.id ?? `tpl_${Date.now()}`;
  const { id: _id, ...rest } = data;
  await setDoc(
    paths.template(id),
    ohneUndefined({ ...rest, createdAt: data.createdAt ?? new Date().toISOString() }),
    { merge: true },
  );
  return id;
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(paths.template(id));
}
