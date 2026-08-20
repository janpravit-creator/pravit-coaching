import {
  CartesianGrid,
  Line,
  LineChart as RcLineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dateShort } from '@/lib/format';

/**
 * Verlaufskurve, etwa der geschätzte e1RM einer Übung über die Zeit.
 *
 * Eine Serie, eine Achse. Bewusst *keine* zweite y-Achse für einen zweiten
 * Messwert – zwei Skalen in einem Bild suggerieren Zusammenhänge, die die
 * Daten nicht hergeben. Wer Gewicht und Volumen vergleichen will, schaltet um.
 */

export interface LinePoint {
  t: number;
  value: number;
}

export function ProgressLineChart({
  data,
  unit = 'kg',
  height = 200,
  /** Optionaler Zielbereich als ruhiges Band im Hintergrund. */
  band,
}: {
  data: LinePoint[];
  unit?: string;
  height?: number;
  band?: { from: number; to: number };
}) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[15px] text-muted"
        style={{ height }}
      >
        Zu wenige Daten für einen Verlauf
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RcLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        {/* Gitter und Achsen bleiben zurückhaltend – die Linie ist die Aussage. */}
        <CartesianGrid stroke="var(--c-line)" strokeDasharray="0" vertical={false} />

        {band && (
          <ReferenceArea
            y1={band.from}
            y2={band.to}
            fill="var(--c-ramp-1)"
            fillOpacity={0.55}
            stroke="none"
          />
        )}

        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value: number) => dateShort(value)}
          tick={{ fontSize: 11, fill: 'var(--c-text-muted)' }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--c-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={46}
          domain={['dataMin - 5', 'dataMax + 5']}
        />

        <Tooltip
          cursor={{ stroke: 'var(--c-line-strong)', strokeWidth: 1 }}
          contentStyle={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-line)',
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: 'var(--sh-raised)',
            color: 'var(--c-text)',
          }}
          labelFormatter={(value) => dateShort(Number(value))}
          formatter={(value) => [
            `${Number(value ?? 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${unit}`,
            '',
          ]}
        />

        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--c-ramp-5)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--c-ramp-5)', strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--c-surface)' }}
          isAnimationActive={false}
        />
      </RcLineChart>
    </ResponsiveContainer>
  );
}

/** Winziger Verlauf ohne Achsen – für Kacheln und Listenzeilen. */
export function Sparkline({
  data,
  width = 72,
  height = 26,
  tone = 'neutral',
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: 'neutral' | 'positiv' | 'negativ';
}) {
  if (data.length < 2) return <span className="inline-block" style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 2) + 1;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const stroke =
    tone === 'positiv'
      ? 'var(--c-positive)'
      : tone === 'negativ'
        ? 'var(--c-negative)'
        : 'var(--c-ramp-5)';

  return (
    <svg width={width} height={height} aria-hidden="true" className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
