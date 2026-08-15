import { useState } from 'react';
import { IconChevronDown, IconCopy, IconPlus, IconSearch, IconTrash } from '@/components/icons';
import { IconButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider, StatTile } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { SortableList } from '@/components/ui/Sortable';
import type { Meal, MealFood, MealPlan } from '@/db/types';
import { makrosEinerMahlzeit, makrosEinesPlans, zahl } from '@/domain/nutrition';
import {
  alsMahlzeitFelder,
  anzahlBerechenbar,
  hatNaehrwerte,
  makrosAusLebensmitteln,
  makrosEinesLebensmittels,
  mengeAusText,
} from '@/domain/lebensmittel';
import { FoodSearchSheet } from './FoodSearchSheet';
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

                  <MahlzeitSummen
                    meal={meal}
                    onChange={(patch) => setzeMahlzeit(index, { ...meal, ...patch })}
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
  const [sucheFuer, setSucheFuer] = useState<number | 'neu' | null>(null);

  const setze = (index: number, patch: Partial<MealFood>) =>
    onChange(foods.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  /**
   * Die Menge wird als freier Text getippt („150g", „2 Stück"). Damit sofort
   * mitgerechnet werden kann, wandert die Zahl daraus bei jedem Tastendruck
   * ins Feld `grams` – sonst müsste man das Lebensmittel neu suchen, nur weil
   * sich die Menge geändert hat.
   */
  const setzeMenge = (index: number, amount: string) => {
    const zahlDarin = mengeAusText(amount);
    setze(index, { amount, grams: zahlDarin === null ? '' : String(zahlDarin) });
  };

  return (
    <div className="py-2">
      <div className="mb-1.5 text-[14px] font-semibold text-muted">Lebensmittel</div>

      <SortableList
        items={foods.map((food, index) => ({ food, index }))}
        getId={({ index }) => `essen-${index}`}
        onReorder={(neu) => onChange(neu.map(({ food }) => food))}
        renderItem={({ food, index }, handle, isDragging) => {
          const eigene = makrosEinesLebensmittels(food);
          const rechenbar = hatNaehrwerte(food);
          const stueck = food.basis === 'stueck';

          return (
            <div
              className={cn(
                'flex items-start gap-1 rounded-2xl bg-surface px-1.5 py-1',
                isDragging && 'shadow-card',
                index > 0 && 'mt-1.5',
              )}
            >
              <div className="pt-2">{handle}</div>

              <div className="min-w-0 flex-1 py-1">
                <div className="flex items-center gap-1">
                  <input
                    value={food.name}
                    list="lebensmittel-vorschlaege"
                    onChange={(e) => setze(index, { name: e.target.value })}
                    placeholder="Lebensmittel"
                    aria-label={`Lebensmittel ${index + 1}`}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-subtle"
                  />
                  <IconButton
                    label={`Nährwerte für Lebensmittel ${index + 1} suchen`}
                    variant="blank"
                    onClick={() => setSucheFuer(index)}
                  >
                    <IconSearch size={16} />
                  </IconButton>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    value={food.amount ?? ''}
                    onChange={(e) => setzeMenge(index, e.target.value)}
                    placeholder={stueck ? 'z. B. 2 Stück' : 'z. B. 150g'}
                    aria-label={`Menge für Lebensmittel ${index + 1}`}
                    className="w-28 min-w-0 rounded-lg bg-surface-muted px-2 py-1.5 text-[14px] outline-none placeholder:text-subtle"
                  />

                  {rechenbar ? (
                    <span className="tnum min-w-0 flex-1 truncate text-[13px] text-muted">
                      {Math.round(eigene.kcal)} kcal · P {Math.round(eigene.prot)} · F{' '}
                      {Math.round(eigene.fat)} · KH {Math.round(eigene.carbs)}
                    </span>
                  ) : (
                    <button
                      onClick={() => setSucheFuer(index)}
                      className="min-w-0 flex-1 truncate text-left text-[13px] text-subtle underline decoration-dotted underline-offset-2"
                    >
                      Keine Nährwerte — suchen
                    </button>
                  )}
                </div>

                {rechenbar && (
                  <div className="mt-1 text-[11px] text-subtle">
                    {Math.round(zahl(food.kcalPer100))} kcal{' '}
                    {stueck ? 'je Stück' : 'je 100 g'}
                  </div>
                )}
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
          );
        }}
      />

      <datalist id="lebensmittel-vorschlaege">
        {namen.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="mt-2 flex flex-wrap gap-3">
        <TextButton onClick={() => setSucheFuer('neu')}>
          <span className="inline-flex items-center gap-1.5">
            <IconSearch size={16} />
            Lebensmittel suchen
          </span>
        </TextButton>
        <TextButton onClick={() => onChange([...foods, { name: '', amount: '' }])}>
          <span className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Leere Zeile
          </span>
        </TextButton>
      </div>

      {sucheFuer !== null && (
        <FoodSearchSheet
          startwert={typeof sucheFuer === 'number' ? (foods[sucheFuer]?.name ?? '') : ''}
          onUebernehmen={(neu) => {
            if (sucheFuer === 'neu') onChange([...foods, neu]);
            else onChange(foods.map((f, i) => (i === sucheFuer ? { ...f, ...neu } : f)));
          }}
          onClose={() => setSucheFuer(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Summen einer Mahlzeit
 * ------------------------------------------------------------------ */

/**
 * Die Summenfelder der Mahlzeit – und der Knopf, der sie aus den
 * Lebensmitteln füllt.
 *
 * Die Felder bleiben von Hand änderbar: Nicht jede Mahlzeit lässt sich aus
 * Lebensmitteln herleiten, und ein gesetzter Wert soll nicht stillschweigend
 * überschrieben werden. Deshalb rechnet die App nur vor und übernimmt erst auf
 * Knopfdruck.
 */
function MahlzeitSummen({
  meal,
  onChange,
}: {
  meal: Meal;
  onChange: (patch: Partial<Meal>) => void;
}) {
  const foods = meal.foods ?? [];
  const ausLebensmitteln = makrosAusLebensmitteln(foods);
  const berechenbar = anzahlBerechenbar(foods);

  const gesetzt =
    zahl(meal.kcal) > 0 || zahl(meal.prot) > 0 || zahl(meal.fat) > 0 || zahl(meal.carbs) > 0;
  const weichtAb = gesetzt && Math.abs(zahl(meal.kcal) - ausLebensmitteln.kcal) >= 1;

  return (
    <div className="mt-3 rounded-2xl bg-surface px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold text-muted">Summe der Mahlzeit</span>
        {berechenbar > 0 && (
          <span className="tnum text-[13px] text-subtle">
            aus {berechenbar} Lebensmittel{berechenbar === 1 ? '' : 'n'}:{' '}
            {Math.round(ausLebensmitteln.kcal)} kcal
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <SummenFeld label="kcal" value={meal.kcal} onChange={(kcal) => onChange({ kcal })} />
        <SummenFeld label="P" value={meal.prot} onChange={(prot) => onChange({ prot })} />
        <SummenFeld label="F" value={meal.fat} onChange={(fat) => onChange({ fat })} />
        <SummenFeld label="KH" value={meal.carbs} onChange={(carbs) => onChange({ carbs })} />
      </div>

      {berechenbar > 0 && (
        <div className="mt-2.5">
          <SecondaryButton
            block
            onClick={() => onChange(alsMahlzeitFelder(ausLebensmitteln))}
          >
            Σ Nährwerte berechnen
          </SecondaryButton>
          {weichtAb && (
            <p className="mt-1.5 px-1 text-[12px] text-muted">
              Die eingetragene Summe weicht von den Lebensmitteln ab. Der Knopf überschreibt sie.
            </p>
          )}
        </div>
      )}

      {berechenbar === 0 && foods.length > 0 && (
        <p className="mt-2 px-1 text-[12px] text-muted">
          Noch kein Lebensmittel mit hinterlegten Nährwerten. Über das Lupen-Symbol suchen, dann
          lässt sich die Summe berechnen.
        </p>
      )}
    </div>
  );
}

function SummenFeld({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-center text-[11px] font-semibold text-subtle">{label}</span>
      <input
        value={value ?? ''}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="tnum w-full rounded-lg bg-surface-muted px-2 py-1.5 text-center text-[14px] outline-none"
      />
    </label>
  );
}
