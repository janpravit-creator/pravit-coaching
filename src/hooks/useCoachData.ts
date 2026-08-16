import { useCallback } from 'react';
import { listCheckins } from '@/db/repo/checkins';
import { getClient, listClients } from '@/db/repo/clients';
import { listCustomFoods, listExercises, listTemplates } from '@/db/repo/library';
import { listReferrals } from '@/db/repo/referrals';
import { listLogbook } from '@/db/repo/logbook';
import { listNotifications } from '@/db/repo/notifications';
import type { Checkin, Client } from '@/db/types';
import { useAsync } from './useAsync';

/**
 * Abfragen des Coach-Bereichs.
 *
 * Kundenliste, Check-in-Liste, To-Dos und „Mehr" brauchen dieselbe Grundlage:
 * alle Kunden mit ihren Check-ins. Vorher lud jeder dieser Bereiche sie
 * getrennt – bei dreißig Kunden also einunddreißig Abfragen pro Reiterwechsel.
 * Der kleine Zwischenspeicher unten teilt das Ergebnis für eine Minute.
 */

/* ------------------------------------------------------------------ *
 * Zwischenspeicher
 * ------------------------------------------------------------------ */

const HALTBARKEIT_MS = 60_000;

interface Eintrag<T> {
  wert: Promise<T>;
  zeit: number;
}

const speicher = new Map<string, Eintrag<unknown>>();

/**
 * Liefert das gespeicherte Ergebnis, solange es frisch ist.
 *
 * Gespeichert wird das Versprechen, nicht der Wert: Starten zwei Bereiche
 * gleichzeitig, teilen sie sich dieselbe Abfrage, statt zwei loszuschicken.
 * Ein Fehlschlag räumt den Eintrag ab, damit der nächste Versuch wirklich neu
 * lädt statt den Fehler zu wiederholen.
 */
function zwischengespeichert<T>(schluessel: string, laden: () => Promise<T>): Promise<T> {
  const vorhanden = speicher.get(schluessel);
  if (vorhanden && Date.now() - vorhanden.zeit < HALTBARKEIT_MS) {
    return vorhanden.wert as Promise<T>;
  }

  const wert = laden().catch((fehler: unknown) => {
    speicher.delete(schluessel);
    throw fehler;
  });
  speicher.set(schluessel, { wert, zeit: Date.now() });
  return wert;
}

/** Verwirft den Zwischenspeicher, damit `neuLaden` wirklich neu lädt. */
export function verwerfeCoachCache(): void {
  speicher.clear();
}

/* ------------------------------------------------------------------ *
 * Abfragen
 * ------------------------------------------------------------------ */

/**
 * Legt `neuLaden` so um, dass es zuerst den Zwischenspeicher verwirft.
 *
 * Ohne das würde ein „neu laden" nach dem Speichern den alten Stand aus dem
 * Speicher zurückgeben – der ärgerlichste Fehler, den ein Zwischenspeicher
 * machen kann.
 */
function mitCacheReset<T>(zustand: ReturnType<typeof useAsync<T>>) {
  return {
    ...zustand,
    neuLaden: () => {
      verwerfeCoachCache();
      zustand.neuLaden();
    },
  };
}

export function useKunden() {
  return mitCacheReset(
    useAsync(
      useCallback(() => zwischengespeichert('kunden', () => listClients()), []),
      [],
    ),
  );
}

/** Ein Kunde mit seinen Check-ins und Logbucheinträgen – für die Detailseite. */
export function useKundeDetail(clientId: string | undefined) {
  const laden = useCallback(async () => {
    if (!clientId) return null;
    // Bewusst ohne Zwischenspeicher: Hier wird geschrieben, und nach dem
    // Speichern muss der nächste Blick den neuen Stand zeigen.
    const [client, checkins, logbuch] = await Promise.all([
      getClient(clientId),
      listCheckins(clientId),
      listLogbook(clientId),
    ]);
    return client ? { client, checkins, logbuch } : null;
  }, [clientId]);

  // Eine Änderung am Kunden verändert auch die Übersichtslisten.
  return mitCacheReset(useAsync(laden, [clientId]));
}

export interface KundeMitCheckins {
  client: Client;
  checkins: Checkin[];
}

/**
 * Alle Kunden samt Check-ins.
 *
 * Die Abfragen laufen nebeneinander statt hintereinander. Fällt eine einzelne
 * aus – etwa an einer Firestore-Regel –, gilt der Kunde als „ohne Check-ins",
 * statt die ganze Seite scheitern zu lassen.
 */
export function useKundenMitCheckins() {
  const laden = useCallback(
    () =>
      zwischengespeichert('kunden-mit-checkins', async (): Promise<KundeMitCheckins[]> => {
        const clients = await listClients();
        return Promise.all(
          clients.map(async (client) => ({
            client,
            checkins: await listCheckins(client.id).catch(() => [] as Checkin[]),
          })),
        );
      }),
    [],
  );

  return mitCacheReset(useAsync(laden, []));
}

export function useVorlagen() {
  return mitCacheReset(
    useAsync(
      useCallback(() => zwischengespeichert('vorlagen', () => listTemplates()), []),
      [],
    ),
  );
}

export function useUebungen() {
  return mitCacheReset(
    useAsync(
      useCallback(() => zwischengespeichert('uebungen', () => listExercises()), []),
      [],
    ),
  );
}

export function useLebensmittel() {
  return mitCacheReset(
    useAsync(
      useCallback(() => zwischengespeichert('lebensmittel', () => listCustomFoods()), []),
      [],
    ),
  );
}

export function useEmpfehlungen() {
  return mitCacheReset(
    useAsync(
      useCallback(() => zwischengespeichert('empfehlungen', () => listReferrals()), []),
      [],
    ),
  );
}

export function useHinweise() {
  return mitCacheReset(
    useAsync(
      useCallback(() => zwischengespeichert('hinweise', () => listNotifications()), []),
      [],
    ),
  );
}
