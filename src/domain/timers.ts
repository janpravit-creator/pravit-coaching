/**
 * Zeitmessung des Trainings.
 *
 * Die Uhr zählt nicht hoch, sie rechnet: Gespeichert wird nur ein absoluter
 * Startzeitpunkt, die Anzeige ergibt sich bei jedem Bild neu aus `Date.now()`.
 * Deshalb stimmt sie auch dann noch, wenn die App zwischendurch geschlossen
 * war – es gibt keinen Zähler, der stehenbleiben könnte.
 */

export interface WorkoutTiming {
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  endedAt: number | null;
}

export function startTiming(now = Date.now()): WorkoutTiming {
  return { startedAt: now, pausedAt: null, pausedTotalMs: 0, endedAt: null };
}

/** Verstrichene Netto-Zeit ohne die Pausen. */
export function elapsedMs(timing: WorkoutTiming, now = Date.now()): number {
  const end = timing.endedAt ?? timing.pausedAt ?? now;
  return Math.max(0, end - timing.startedAt - timing.pausedTotalMs);
}

export function pauseTiming(timing: WorkoutTiming, now = Date.now()): WorkoutTiming {
  if (timing.pausedAt !== null || timing.endedAt !== null) return timing;
  return { ...timing, pausedAt: now };
}

export function resumeTiming(timing: WorkoutTiming, now = Date.now()): WorkoutTiming {
  if (timing.pausedAt === null) return timing;
  return {
    ...timing,
    pausedTotalMs: timing.pausedTotalMs + (now - timing.pausedAt),
    pausedAt: null,
  };
}

export function stopTiming(timing: WorkoutTiming, now = Date.now()): WorkoutTiming {
  const resumed = resumeTiming(timing, now);
  return { ...resumed, endedAt: now };
}

/** `M:SS`, ab einer Stunde `H:MM:SS`. */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Kompakte Dauer für Listen: „48 Min" oder „1 Std 12 Min". */
export function formatDurationLong(sec: number): string {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.round((sec % 3600) / 60);
  if (hours === 0) return `${minutes} Min`;
  if (minutes === 0) return `${hours} Std`;
  return `${hours} Std ${minutes} Min`;
}
