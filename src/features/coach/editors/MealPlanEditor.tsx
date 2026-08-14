import { useState } from 'react';
import { IconChevronDown, IconCopy, IconPlus, IconTrash } from '@/components/icons';
import { IconButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider, StatTile } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { SortableList } from '@/components/ui/Sortable';
import type { Meal, MealFood, MealPlan } from '@/db/types';
import { makrosEinerMahlzeit, makrosEinesPlans } from '@/domain/nutrition';
import { cn } from '@/lib/cn';

/**
 * Ernährungsplan-Editor.
 *
 * Makros werden fortlaufend mitgerechnet und angezeigt – vorher musste man
 * dafür speichern und nachsehen. Trägt eine Mahlzeit eigene Summen, gelten
 * die; sonst zählt der Editor die Lebensmittel zusammen.
 */

export function MealPlanEditor({
  mealPlans,
  onChange,
  onVorlage,
  lebensmittelNamen,
}: {
  mealPlans: MealPlan[];
  onChange: (plans: MealPlan[]) => void;
  onVorlage: () => void;
  lebensmittelNamen: string[];
}) {
  const [offen, setOffen] = useState<number | null>(mealPlans.length === 1 ? 0 : null);

  const setzePlan = (index: number, plan: MealPlan) =>
    onChange(mealPlans.map((p, i) => (i === index ? plan : p)));

  return (
    <div className="space-y-2.5">
      {mealPlans.map((plan, planIndex) => {
        const auf = offen === planIndex;
        const makros = makrosEinesPlans(plan);

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
                  {(plan.meals ?? []).length} Mahlzeiten · {Math.round(makros.kcal)} kcal
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

                <div className="my-3 grid grid-cols-4 gap-2">
                  <StatTile value={Math.round(makros.kcal)} label="kcal" />
                  <StatTile value={`${Math.round(makros.prot)} g`} label="Protein" />
                  <StatTile value={`${Math.round(makros.fat)} g`} label="Fett" />
                  <StatTile value={`${Math.round(makros.carbs)} g`} label="Carbs" />
                </div>

                <MahlzeitenEditor
                  meals={plan.meals ?? []}
                  onChange={(meals) => setzePlan(planIndex, { ...plan, meals })}
                  lebensmittelNamen={lebensmittelNamen}
                />

                <div className="mt-4 flex items-center justify-between gap-2">
                  <TextButton
                    onClick={() => {
                      const kopie: MealPlan = JSON.parse(
                        JSON.stringify({ ...plan, name: `${plan.name} (Kopie)` }),
                      );
                      onChange([
                        ...mealPlans.slice(0, planIndex + 1),
                        kopie,
                        ...mealPlans.slice(planIndex + 1),
                      ]);
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <IconCopy size={16} />
                      Duplizieren
                    </span>
                  </TextButton>
                  <TextButton
                    tone="negativ"
                    onClick={() => {
                      onChange(mealPlans.filter((_, i) => i !== planIndex));
                      setOffen(null);
                    }}
                  >
                    Plan entfernen
                  </TextButton>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <SecondaryButton
          onClick={() => {
            onChange([...mealPlans, { name: `Plan ${mealPlans.length + 1}`, meals: [] }]);
            setOffen(mealPlans.length);
          }}
          icon={<IconPlus size={19} />}
        >
          Neuer Plan
        </SecondaryButton>
        <SecondaryButton onClick={onVorlage}>Aus Vorlage</SecondaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Mahlzeiten
 * ------------------------------------------------------------------ */

function MahlzeitenEditor({
  meals,
  onChange,
  lebensmittelNamen,
}: {
  meals: Meal[];
  onChange: (meals: Meal[]) => void;
  lebensmittelNamen: string[];
}) {
  const [offen, setOffen] = useState<number | null>(0);

  const setzeMahlzeit = (index: number, meal: Meal) =>
    onChange(meals.map((m, i) => (i === index ? meal : m)));

  return (
    <div>
      <SortableList
        items={meals.map((meal, index) => ({ meal, index }))}
        getId={({ index }) => `mahlzeit-${index}`}
        onReorder={(neu) => {
          onChange(neu.map(({ meal }) => meal));
          setOffen(null);
        }}
        renderItem={({ meal, index }, handle, isDragging) => {
          const auf = offen === index;
          const m = makrosEinerMahlzeit(meal);
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
                      {meal.name || `Mahlzeit ${index + 1}`}
                    </span>
                    <span className="tnum text-[13px] text-muted">
                      {(meal.foods ?? []).length} Lebensmittel · {Math.round(m.kcal)} kcal
                    </span>
                  </span>
                  <IconChevronDown
                    size={18}
                    className={cn('shrink-0 text-subtle transition-transform', auf && 'rotate-180')}
                  />
                </button>
                <IconButton
                  label="Mahlzeit entfernen"
                  variant="blank"
                  onClick={() => {
                    onChange(meals.filter((_, i) => i !== index));
                    setOffen(null);
                  }}
                >
                  <IconTrash size={17} />
                </IconButton>
              </div>

              {auf && (
                <div className="px-2 pb-3">
                  <TextField
                    label="Name"
                    value={meal.name ?? ''}
                    onChange={(name) => setzeMahlzeit(index, { ...meal, name })}
                    placeholder="z. B. Frühstück"
                  />

                  <LebensmittelEditor
                    foods={meal.foods ?? []}
                    onChange={(foods) => setzeMahlzeit(index, { ...meal, foods })}
                    namen={lebensmittelNamen}
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
            onChange([...meals, { name: `Mahlzeit ${meals.length + 1}`, foods: [] }]);
            setOffen(meals.length);
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Mahlzeit hinzufügen
          </span>
        </TextButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Lebensmittel
 * ------------------------------------------------------------------ */

function LebensmittelEditor({
  foods,
  onChange,
  namen,
}: {
  foods: MealFood[];
  onChange: (foods: MealFood[]) => void;
  namen: string[];
}) {
  const setze = (index: number, patch: Partial<MealFood>) =>
    onChange(foods.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  return (
    <div className="py-2">
      <div className="mb-1.5 text-[14px] font-semibold text-muted">Lebensmittel</div>

      <SortableList
        items={foods.map((food, index) => ({ food, index }))}
        getId={({ index }) => `essen-${index}`}
        onReorder={(neu) => onChange(neu.map(({ food }) => food))}
        renderItem={({ food, index }, handle, isDragging) => (
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
                value={food.name}
                list="lebensmittel-vorschlaege"
                onChange={(e) => setze(index, { name: e.target.value })}
                placeholder="Lebensmittel"
                aria-label={`Lebensmittel ${index + 1}`}
                className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-subtle"
              />
              <div className="mt-1 grid grid-cols-5 gap-1.5">
                <input
                  value={food.amount ?? ''}
                  onChange={(e) => setze(index, { amount: e.target.value })}
                  placeholder="Menge"
                  aria-label={`Menge für Lebensmittel ${index + 1}`}
                  className="col-span-2 min-w-0 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
                <input
                  value={food.kcal ?? ''}
                  inputMode="numeric"
                  onChange={(e) => setze(index, { kcal: e.target.value })}
                  placeholder="kcal"
                  aria-label={`Kalorien für Lebensmittel ${index + 1}`}
                  className="min-w-0 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
                <input
                  value={food.prot ?? ''}
                  inputMode="numeric"
                  onChange={(e) => setze(index, { prot: e.target.value })}
                  placeholder="P"
                  aria-label={`Protein für Lebensmittel ${index + 1}`}
                  className="min-w-0 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
                <input
                  value={food.carbs ?? ''}
                  inputMode="numeric"
                  onChange={(e) => setze(index, { carbs: e.target.value })}
                  placeholder="KH"
                  aria-label={`Kohlenhydrate für Lebensmittel ${index + 1}`}
                  className="min-w-0 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                />
              </div>
            </div>

            <IconButton
              label={`Lebensmittel ${index + 1} entfernen`}
              variant="blank"
              className="mt-1"
              onClick={() => onChange(foods.filter((_, i) => i !== index))}
            >
              <IconTrash size={16} />
            </IconButton>
          </div>
        )}
      />

      <datalist id="lebensmittel-vorschlaege">
        {namen.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="mt-2">
        <TextButton onClick={() => onChange([...foods, { name: '', amount: '' }])}>
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Lebensmittel hinzufügen
          </span>
        </TextButton>
      </div>
    </div>
  );
}
