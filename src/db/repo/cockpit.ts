import { getDoc, setDoc } from 'firebase/firestore';
import { ohneUndefined, paths } from '../firestore';
import type { Nebeneinnahmen } from '@/domain/cockpit';

/**
 * Die Angaben, die das Cockpit nicht selbst errechnen kann.
 *
 * Online-Einnahmen ergeben sich aus den Kunden. Anstellung und Präsenz-
 * Training kennt die App nicht — die trägt der Coach je Monat ein.
 */
export interface CockpitDaten {
  /** Nebeneinnahmen je Monat, Schlüssel `YYYY-MM`. */
  nebeneinnahmen?: Record<string, Nebeneinnahmen>;
  /** Abgehakte Meilenstein-Aufgaben als `abschnitt:index`. */
  erledigt?: string[];
}

export async function ladeCockpit(): Promise<CockpitDaten> {
  const snap = await getDoc(paths.einstellung('cockpit'));
  return snap.exists() ? (snap.data() as CockpitDaten) : {};
}

export async function speichereCockpit(daten: CockpitDaten): Promise<void> {
  await setDoc(paths.einstellung("cockpit"), ohneUndefined({ ...daten }), { merge: true });
}
