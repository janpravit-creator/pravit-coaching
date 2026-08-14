import { useState } from 'react';
import {
  IconChevronDown,
  IconCopy,
  IconPlus,
  IconTrash,
} from '@/components/icons';
import { IconButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { TextArea, TextField } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Layout';
import { SortableList } from '@/components/ui/Sortable';
import type { PlanDay, PlanExercise, TrainingPlan } from '@/db/types';
import { cn } from '@/lib/cn';

/**
 * Trainingsplan-Editor.
 *
 * Der Plan steht als ein Zustandsbaum und wird als Ganzes gespeichert – nicht
 * mehr aus DOM-Attributen zurückgelesen. Übungen und Tage lassen sich ziehen;
 * die Reihenfolge ist die Reihenfolge im Training, deshalb muss sie sich
 * schnell ändern lassen.
 *
 * Die Kennungen für das Ziehen sind Positionen (`t2-u3`) statt Namen: zwei
 * Übungen dürfen gleich heißen, und beim Umbenennen darf der Griff nicht
 * die Zeile wechseln.
 */

export function TrainingPlanEditor({
  plans,
  onChange,
  onVorlage,
  uebungsNamen,
}: {
  plans: TrainingPlan[];
  onChange: (plans: TrainingPlan[]) => void;
  onVorlage: () => void;
  uebungsNamen: string[];
}) {
  const [offen, setOffen] = useState<number | null>(plans.length === 1 ? 0 : null);

  const setzePlan = (index: number, plan: TrainingPlan) =>
    onChange(plans.map((p, i) => (i === index ? plan : p)));

  const hinzufuegen = () => {
    onChange([
      ...plans,
      { name: `Plan ${plans.length + 1}`, days: [{ name: 'Tag 1', exercises: [] }] },
    ]);
    setOffen(plans.length);
  };

  const entfernen = (index: number) => {
    onChange(plans.filter((_, i) => i !== index));
    setOffen(null);
  };

  const duplizieren = (index: number) => {
    const plan = plans[index];
    if (!plan) return;
    const kopie: TrainingPlan = JSON.parse(JSON.stringify({ ...plan, name: `${plan.name} (Kopie)` }));
    onChange([...plans.slice(0, index + 1), kopie, ...plans.slice(index + 1)]);
  };

  return (
    <div className="space-y-2.5">
      {plans.map((plan, planIndex) => {
        const auf = offen === planIndex;
        const anzahlUebungen = (plan.days ?? []).reduce(
          (s, d) => s + (d.exercises?.length ?? 0),
          0,
        );

        return (
          <Card key={planIndex} padded={false} className="px-5">
            <button
              onClick={() => setOffen(auf ? null : planIndex)}
              aria-expanded={auf}
              className="flex w-full items-center justify-between gap-3 py-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold tracking-tight">
                  {plan.name || 'Ohne Namen'}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {(plan.days ?? []).length} Tage · {anzahlUebungen} Übungen
                </span>
              </span>
              <IconChevronDown
                size={20}
                className={cn('shrink-0 text-subtle transition-transform', auf && 'rotate-180')}
              />
            </button>

            {auf && (
              <div className="pb-5">
                <Divider />
                <TextField
                  label="Name des Plans"
                  value={plan.name}
                  onChange={(name) => setzePlan(planIndex, { ...plan, name })}
                />

                <TageEditor
                  days={plan.days ?? []}
                  onChange={(days) => setzePlan(planIndex, { ...plan, days })}
                  uebungsNamen={uebungsNamen}
                />

                <div className="mt-4 flex items-center justify-between gap-2">
                  <TextButton onClick={() => duplizieren(planIndex)}>
                    <span className="inline-flex items-center gap-1.5">
                      <IconCopy size={16} />
                      Duplizieren
                    </span>
                  </TextButton>
                  <TextButton tone="negativ" onClick={() => entfernen(planIndex)}>
                    Plan entfernen
                  </TextButton>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <SecondaryButton onClick={hinzufuegen} icon={<IconPlus size={19} />}>
          Neuer Plan
        </SecondaryButton>
        <SecondaryButton onClick={onVorlage}>Aus Vorlage</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tage
 * ------------------------------------------------------------------ */

function TageEditor({
  days,
  onChange,
  uebungsNamen,
}: {
  days: PlanDay[];
  onChange: (days: PlanDay[]) => void;
  uebungsNamen: string[];
}) {
  const [offen, setOffen] = useState<number | null>(0);

  const setzeTag = (index: number, day: PlanDay) =>
    onChange(days.map((d, i) => (i === index ? day : d)));

  return (
    <div className="mt-2">
      <SortableList
        items={days.map((day, index) => ({ day, index }))}
        getId={({ index }) => `tag-${index}`}
        onReorder={(neu) => {
          onChange(neu.map(({ day }) => day));
          setOffen(null);
        }}
        renderItem={({ day, index }, handle, isDragging) => {
          const auf = offen === index;
          return (
            <div
              className={cn(
                'rounded-2xl bg-surface-muted px-2 py-1',
                isDragging && 'shadow-card',
                index > 0 && 'mt-2',
              )}
            >
              <div className="flex items-center gap-1">
                {handle}
                <button
                  onClick={() => setOffen(auf ? null : index)}
                  aria-expanded={auf}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-bold tracking-tight">
                      {day.name || `Tag ${index + 1}`}
                    </span>
                    <span className="text-[13px] text-muted">
                      {(day.exercises ?? []).length} Übungen
                    </span>
                  </span>
                  <IconChevronDown
                    size={18}
                    className={cn('shrink-0 text-subtle transition-transform', auf && 'rotate-180')}
                  />
                </button>
                <IconButton
                  label={`${day.name} entfernen`}
                  variant="blank"
                  onClick={() => {
                    onChange(days.filter((_, i) => i !== index));
                    setOffen(null);
                  }}
                >
                  <IconTrash size={17} />
                </IconButton>
              </div>

              {auf && (
                <div className="px-2 pb-3">
                  <TextField
                    label="Name des Tages"
                    value={day.name}
                    onChange={(name) => setzeTag(index, { ...day, name })}
                    placeholder="z. B. Push"
                  />

                  <UebungenEditor
                    exercises={day.exercises ?? []}
                    onChange={(exercises) => setzeTag(index, { ...day, exercises })}
                    uebungsNamen={uebungsNamen}
                  />

                  <TextArea
                    label="Notiz zum Tag"
                    rows={2}
                    value={day.note ?? ''}
                    onChange={(note) => setzeTag(index, { ...day, note })}
                    placeholder="Optional – Hinweise für den Kunden"
                  />
                </div>
              )}
            </div>
          );
        }}
      />

      <div className="mt-3">
        <TextButton
          onClick={() => {
            onChange([...days, { name: `Tag ${days.length + 1}`, exercises: [] }]);
            setOffen(days.length);
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Tag hinzufügen
          </span>
        </TextButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Übungen
 * ------------------------------------------------------------------ */

function UebungenEditor({
  exercises,
  onChange,
  uebungsNamen,
}: {
  exercises: PlanExercise[];
  onChange: (exercises: PlanExercise[]) => void;
  uebungsNamen: string[];
}) {
  const setze = (index: number, patch: Partial<PlanExercise>) =>
    onChange(exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));

  return (
    <div className="py-2">
      <div className="mb-1.5 text-[14px] font-semibold text-muted">Übungen</div>

      {exercises.length === 0 && (
        <p className="rounded-2xl bg-surface px-4 py-3 text-[14px] text-muted">
          Noch keine Übung. Der Kunde sieht diesen Tag dann leer.
        </p>
      )}

      <SortableList
        items={exercises.map((ex, index) => ({ ex, index }))}
        getId={({ index }) => `uebung-${index}`}
        onReorder={(neu) => onChange(neu.map(({ ex }) => ex))}
        renderItem={({ ex, index }, handle, isDragging) => (
          <div
            className={cn(
              'flex items-start gap-1 rounded-2xl bg-surface px-1.5 py-1',
              isDragging && 'shadow-card',
              index > 0 && 'mt-1.5',
            )}
          >
            <div className="pt-2">{handle}</div>

            <div className="min-w-0 flex-1 py-1">
              <input
                value={ex.name}
                list="uebungs-vorschlaege"
                onChange={(e) => setze(index, { name: e.target.value })}
                placeholder="Übungsname"
                aria-label={`Übung ${index + 1}`}
                className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-subtle"
              />
              <div className="mt-1 flex gap-2">
                <input
                  value={ex.sets ?? ''}
                  inputMode="numeric"
                  onChange={(e) => setze(index, { sets: e.target.value })}
                  placeholder="Sätze"
                  aria-label={`Sätze für Übung ${index + 1}`}
                  className="w-16 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
                <input
                  value={ex.reps ?? ex.repRange ?? ''}
                  onChange={(e) =>
                    // Beide Felder tragen denselben Wert – die alte App las mal
                    // das eine, mal das andere.
                    setze(index, { reps: e.target.value, repRange: e.target.value })
                  }
                  placeholder="Wdh, z. B. 8-12"
                  aria-label={`Wiederholungen für Übung ${index + 1}`}
                  className="min-w-0 flex-1 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
              </div>
            </div>

            <IconButton
              label={`Übung ${index + 1} entfernen`}
              variant="blank"
              className="mt-1"
              onClick={() => onChange(exercises.filter((_, i) => i !== index))}
            >
              <IconTrash size={16} />
            </IconButton>
          </div>
        )}
      />

      {/* Vorschläge aus der Übungsdatenbank – dieselbe Liste wie im Wiki */}
      <datalist id="uebungs-vorschlaege">
        {uebungsNamen.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="mt-2 flex items-center justify-between gap-2">
        <TextButton
          onClick={() => onChange([...exercises, { name: '', sets: '3', reps: '8-12', repRange: '8-12' }])}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Übung hinzufügen
          </span>
        </TextButton>
        {exercises.length > 0 && <Pill>{exercises.length}</Pill>}
      </div>
    </div>
  );
}
