import { useEffect, useState } from 'react';

/**
 * Löst regelmäßig ein Neuzeichnen aus und liefert die aktuelle Zeit.
 *
 * Wichtig: Der Hook *zählt nichts*. Er sorgt nur dafür, dass Komponenten neu
 * rendern; die angezeigten Werte errechnen sich jedes Mal frisch aus den
 * gespeicherten Zeitstempeln. Deshalb ist es gleichgültig, ob der Takt
 * zwischendurch aussetzt, weil der Browser den Tab pausiert hat.
 */
export function useTicker(intervalMs = 250, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let last = 0;

    // requestAnimationFrame statt setInterval: der Browser drosselt es im
    // Hintergrund von selbst und drängt sich nicht in den Vordergrund.
    const loop = (time: number) => {
      if (time - last >= intervalMs) {
        last = time;
        setNow(Date.now());
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [intervalMs, active]);

  return now;
}
