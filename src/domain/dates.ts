/**
 * Datumsauswertung.
 *
 * In den Bestandsdaten steckt `datum` als Zeichenkette – meist `YYYY-MM-DD`
 * aus einem Datumsfeld, in älteren Datensätzen aber auch deutsch als
 * `TT.MM.JJJJ`, und manchmal gar nicht. `new Date("14.08.2026")` liefert in
 * den meisten Browsern `Invalid Date`; jeder Vergleich damit ist stillschweigend
 * falsch. Deshalb wird hier ausdrücklich ausgewertet statt geraten.
 */

/** Wandelt ein gespeichertes Datum in einen Zeitstempel. `null`, wenn unlesbar. */
export function parseDatum(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text === '') return null;

  // Vollständiger Zeitstempel (`createdAt`): mit Uhrzeit auswerten, sonst
  // fielen zwei Einträge desselben Tages auf denselben Wert und ließen sich
  // nicht mehr nach Uhrzeit unterscheiden.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:/.test(text)) {
    const exakt = Date.parse(text);
    if (!Number.isNaN(exakt)) return exakt;
  }

  // Reines Tagesdatum `YYYY-MM-DD` – bewusst als UTC-Mitternacht, damit die
  // Zeitzone des Geräts die Tagesgrenze nicht verschiebt.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  // TT.MM.JJJJ
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (de) return Date.UTC(Number(de[3]), Number(de[2]) - 1, Number(de[1]));

  const fallback = Date.parse(text);
  return Number.isNaN(fallback) ? null : fallback;
}

/** Tagesdatum von heute als `YYYY-MM-DD` in der lokalen Zeitzone. */
export function heute(now: Date = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Aktueller Monat als `YYYY-MM`. */
export function dieserMonat(now: Date = new Date()): string {
  return heute(now).slice(0, 7);
}

/** Volle Tage zwischen zwei Zeitpunkten. */
export function tageZwischen(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / 86_400_000);
}

/**
 * Vergleichsfunktion: neueste zuerst.
 *
 * Gibt bei Gleichstand ausdrücklich `0` zurück. Die bisherige Fassung
 * (`b.datum > a.datum ? 1 : -1`) konnte das nicht und lieferte bei gleichem
 * Datum eine zufällige Reihenfolge – daher war „der neueste Eintrag" nicht
 * verlässlich der neueste.
 */
export function neuesteZuerst<T extends { datum?: unknown; createdAt?: unknown }>(
  a: T,
  b: T,
): number {
  const av = parseDatum(a.datum) ?? parseDatum(a.createdAt) ?? -Infinity;
  const bv = parseDatum(b.datum) ?? parseDatum(b.createdAt) ?? -Infinity;
  if (av === bv) {
    // Bei gleichem Tag entscheidet der genaue Anlegezeitpunkt.
    const ac = parseDatum(a.createdAt) ?? 0;
    const bc = parseDatum(b.createdAt) ?? 0;
    return bc - ac;
  }
  return bv - av;
}

/** Sortiert eine Liste, ohne das Original zu verändern. */
export function sortiereNeuesteZuerst<T extends { datum?: unknown; createdAt?: unknown }>(
  list: T[],
): T[] {
  return [...list].sort(neuesteZuerst);
}
