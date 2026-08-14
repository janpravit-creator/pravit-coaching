import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Rad-Auswahl nach dem Vorbild des Zeitraum-Bildschirms aus den Screenshots:
 * der gewählte Eintrag steht scharf in der Mitte, die Nachbarn verblassen.
 *
 * Umgesetzt als Scroll-Container mit Fangpunkten statt als 3D-Rad. Das folgt
 * dem Finger exakt so, wie man es vom System kennt, und funktioniert mit
 * Trägheits-Scrollen und Tastatur gleichermaßen.
 */

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // ungerade, damit es eine echte Mitte gibt

export interface WheelOption<T> {
  value: T;
  label: string;
}

interface WheelPickerProps<T> {
  options: WheelOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function WheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: WheelPickerProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [centered, setCentered] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  // Verhindert, dass das Programm-Scrollen gleich wieder onChange auslöst.
  const silent = useRef(false);

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const node = ref.current;
    if (!node) return;
    silent.current = true;
    node.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
    // Nach dem Scrollen wieder scharf schalten.
    window.setTimeout(() => {
      silent.current = false;
    }, smooth ? 350 : 60);
  }, []);

  // Auswahl von außen übernehmen.
  useEffect(() => {
    const index = options.findIndex((o) => o.value === value);
    if (index >= 0 && index !== centered) {
      setCentered(index);
      scrollToIndex(index, false);
    }
    // Nur auf Änderungen des Werts reagieren, nicht auf jedes Scrollen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    scrollToIndex(centered, false);
    // Einmalig beim Aufbau die richtige Position einnehmen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const node = ref.current;
    if (!node) return;
    const index = Math.round(node.scrollTop / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), options.length - 1);
    if (clamped === centered) return;

    setCentered(clamped);
    if (silent.current) return;
    const option = options[clamped];
    if (option) onChange(option.value);
  };

  const pad = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;

  return (
    <div className="flex-1">
      {label && (
        <div className="mb-2 text-center text-[13px] font-semibold text-muted">{label}</div>
      )}
      <div className="relative" style={{ height: VISIBLE * ITEM_HEIGHT }}>
        {/* Markierung der Mitte – dieselbe ruhige Fläche wie in der Vorlage */}
        <div
          className="pointer-events-none absolute inset-x-1 rounded-xl bg-surface-muted"
          style={{ top: pad, height: ITEM_HEIGHT }}
        />

        <div
          ref={ref}
          onScroll={handleScroll}
          className="no-scrollbar relative h-full snap-y snap-mandatory overflow-y-auto"
          style={{ scrollPaddingTop: pad }}
          role="listbox"
          aria-label={label}
          tabIndex={0}
        >
          <div style={{ height: pad }} />
          {options.map((option, index) => {
            const distance = Math.abs(index - centered);
            return (
              <button
                type="button"
                key={String(option.value)}
                role="option"
                aria-selected={index === centered}
                onClick={() => {
                  setCentered(index);
                  scrollToIndex(index, true);
                  onChange(option.value);
                }}
                className={cn(
                  'flex w-full snap-center items-center justify-center',
                  'text-[19px] font-bold tracking-tight transition-all duration-150',
                  distance === 0 ? 'text-text' : distance === 1 ? 'text-subtle' : 'text-subtle',
                )}
                style={{
                  height: ITEM_HEIGHT,
                  // Nachbarn verblassen, entfernte Einträge fast unsichtbar.
                  opacity: distance === 0 ? 1 : distance === 1 ? 0.45 : 0.2,
                }}
              >
                {option.label}
              </button>
            );
          })}
          <div style={{ height: pad }} />
        </div>

        {/* Weiche Kanten oben und unten */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[var(--c-surface)] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--c-surface)] to-transparent" />
      </div>
    </div>
  );
}

/** Erzeugt eine Zahlenreihe für das Rad, z. B. Minuten von 0 bis 120. */
export function numberOptions(
  from: number,
  to: number,
  step = 1,
  suffix = '',
): WheelOption<number>[] {
  const options: WheelOption<number>[] = [];
  for (let value = from; value <= to; value += step) {
    options.push({ value, label: `${value}${suffix}` });
  }
  return options;
}
