import { IconPlus, IconTrash } from '@/components/icons';
import { IconButton, TextButton } from '@/components/ui/Button';
import { SortableList } from '@/components/ui/Sortable';
import type { Supplement } from '@/db/types';
import { cn } from '@/lib/cn';

/**
 * Supplement-Plan.
 *
 * Der Einnahmezeitpunkt ist freier Text, wird aber mit den Mahlzeiten des
 * Ernährungsplans vorgeschlagen – so heißt es beim Kunden „zum Frühstück"
 * statt „morgens", wenn es dieselbe Mahlzeit meint.
 */
export function SupplementEditor({
  supplements,
  onChange,
  mahlzeitenNamen,
}: {
  supplements: Supplement[];
  onChange: (supplements: Supplement[]) => void;
  mahlzeitenNamen: string[];
}) {
  const setze = (index: number, patch: Partial<Supplement>) =>
    onChange(supplements.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div>
      {supplements.length === 0 && (
        <p className="mb-2 text-[15px] text-muted">
          Noch kein Supplement eingetragen.
        </p>
      )}

      <SortableList
        items={supplements.map((supp, index) => ({ supp, index }))}
        getId={({ index }) => `supp-${index}`}
        onReorder={(neu) => onChange(neu.map(({ supp }) => supp))}
        renderItem={({ supp, index }, handle, isDragging) => (
          <div
            className={cn(
              'flex items-start gap-1 rounded-2xl bg-surface-muted px-1.5 py-1',
              isDragging && 'shadow-card',
              index > 0 && 'mt-1.5',
            )}
          >
            <div className="pt-2">{handle}</div>

            <div className="min-w-0 flex-1 py-1">
              <input
                value={supp.name}
                onChange={(e) => setze(index, { name: e.target.value })}
                placeholder="Supplement"
                aria-label={`Supplement ${index + 1}`}
                className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-subtle"
              />
              <div className="mt-1 flex gap-1.5">
                <input
                  value={supp.dose ?? ''}
                  onChange={(e) => setze(index, { dose: e.target.value })}
                  placeholder="Dosierung"
                  aria-label={`Dosierung für Supplement ${index + 1}`}
                  className="min-w-0 flex-1 rounded-lg bg-surface px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
                <input
                  value={supp.time ?? ''}
                  list="mahlzeiten-vorschlaege"
                  onChange={(e) => setze(index, { time: e.target.value })}
                  placeholder="Wann?"
                  aria-label={`Einnahmezeitpunkt für Supplement ${index + 1}`}
                  className="min-w-0 flex-1 rounded-lg bg-surface px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
              </div>
            </div>

            <IconButton
              label={`Supplement ${index + 1} entfernen`}
              variant="blank"
              className="mt-1"
              onClick={() => onChange(supplements.filter((_, i) => i !== index))}
            >
              <IconTrash size={16} />
            </IconButton>
          </div>
        )}
      />

      <datalist id="mahlzeiten-vorschlaege">
        {mahlzeitenNamen.map((name) => (
          <option key={name} value={name} />
        ))}
        <option value="morgens" />
        <option value="abends" />
        <option value="vor dem Training" />
        <option value="nach dem Training" />
      </datalist>

      <div className="mt-2">
        <TextButton onClick={() => onChange([...supplements, { name: '', dose: '', time: '' }])}>
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Supplement hinzufügen
          </span>
        </TextButton>
      </div>
    </div>
  );
}
