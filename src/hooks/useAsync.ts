import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lädt Daten und hält sie vor.
 *
 * Firestore-Abfragen sind hier einmalige Ladevorgänge statt dauerhafter
 * Beobachter: Der Coach-Bereich fragt viele Sammlungen gleichzeitig ab, und
 * offene Beobachter darauf kosten Verbindungen und Kontingent, ohne dass sich
 * die Daten von außen ändern würden. `neuLaden` holt nach einer Änderung frisch.
 */

export interface AsyncState<T> {
  daten: T | undefined;
  laedt: boolean;
  fehler: Error | null;
  neuLaden: () => void;
}

export function useAsync<T>(
  laden: () => Promise<T>,
  abhaengigkeiten: readonly unknown[] = [],
): AsyncState<T> {
  const [daten, setDaten] = useState<T | undefined>(undefined);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<Error | null>(null);
  const [runde, setRunde] = useState(0);

  // Verhindert, dass eine späte Antwort einen bereits verlassenen Bildschirm
  // beschreibt – React würde sonst vor einer Zustandsänderung an einer
  // ausgehängten Komponente warnen.
  const aktiv = useRef(true);
  useEffect(() => {
    aktiv.current = true;
    return () => {
      aktiv.current = false;
    };
  }, []);

  const ladenRef = useRef(laden);
  ladenRef.current = laden;

  useEffect(() => {
    setLaedt(true);
    setFehler(null);

    void ladenRef
      .current()
      .then((ergebnis) => {
        if (aktiv.current) setDaten(ergebnis);
      })
      .catch((e: unknown) => {
        if (aktiv.current) setFehler(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (aktiv.current) setLaedt(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...abhaengigkeiten, runde]);

  const neuLaden = useCallback(() => setRunde((r) => r + 1), []);

  return { daten, laedt, fehler, neuLaden };
}
