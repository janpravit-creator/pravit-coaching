import { cn } from '@/lib/cn';

/**
 * Waagerechte Balken mit Zielband – Wochensätze je Muskelgruppe.
 *
 * Das graue Band zeigt den angestrebten Bereich (voreingestellt 10–20 harte
 * Sätze pro Woche). So sieht man nicht nur, wie viel trainiert wurde, sondern
 * ob es im sinnvollen Rahmen lag. Jede Zeile ist beschriftet; die Farbe
 * kodiert die Erfüllung, nicht die Identität.
 */

export interface VolumeRow {
  key: string;
  label: string;
  value: number;
}

export function VolumeBars({
  rows,
  targetMin,
  targetMax,
  unit = 'Sätze',
  onSelect,
}: {
  rows: VolumeRow[];
  targetMin: number;
  targetMax: number;
  unit?: string;
  onSelect?: (key: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-[15px] text-muted">Noch keine Sätze erfasst</div>
    );
  }

  // Skala so wählen, dass das Zielband immer sichtbar ist.
  const max = Math.max(targetMax * 1.25, ...rows.map((r) => r.value)) || 1;
  const bandFrom = (targetMin / max) * 100;
  const bandTo = (targetMax / max) * 100;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[12px] text-muted">
        <span className="h-2.5 w-6 rounded-sm bg-surface-sunken" aria-hidden="true" />
        Zielbereich {targetMin}–{targetMax} {unit} pro Woche
      </div>

      <ul>
        {rows.map((row) => {
          const percent = Math.min(100, (row.value / max) * 100);
          const below = row.value < targetMin;
          const above = row.value > targetMax;

          return (
            <li key={row.key}>
              <button
                onClick={onSelect ? () => onSelect(row.key) : undefined}
                className={cn('w-full py-2 text-left', !onSelect && 'cursor-default')}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-bold tracking-tight">
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      'tnum shrink-0 text-[14px] font-bold',
                      below ? 'text-muted' : above ? 'text-warning' : 'text-positive',
                    )}
                  >
                    {formatSets(row.value)}
                  </span>
                </div>

                <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-muted">
                  {/* Zielband liegt unter dem Balken und bleibt zurückhaltend. */}
                  <div
                    className="absolute inset-y-0 bg-surface-sunken"
                    style={{ left: `${bandFrom}%`, width: `${Math.max(0, bandTo - bandFrom)}%` }}
                    aria-hidden="true"
                  />
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500',
                      below ? 'bg-line-strong' : above ? 'bg-warning' : 'bg-positive',
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
