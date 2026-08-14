import type { Meal, MealPlan } from '@/db/types';

/**
 * Ernährungsrechnungen: Makros eines Plans und der Kalorienrechner des Coaches.
 *
 * Alle Zahlenfelder liegen in der Datenbank als Zeichenketten vor – teils mit
 * Komma, teils mit Punkt, teils leer. Deshalb geht jeder Wert durch `zahl()`.
 */

/** Liest eine Zahl aus dem, was in der Datenbank steht. Unlesbares wird zu 0. */
export function zahl(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface Makros {
  kcal: number;
  prot: number;
  fat: number;
  carbs: number;
}

export const LEERE_MAKROS: Makros = { kcal: 0, prot: 0, fat: 0, carbs: 0 };

export function makrosEinerMahlzeit(meal: Meal): Makros {
  // Die Mahlzeit trägt ihre Summen selbst; nur wenn sie fehlen, wird aus den
  // Lebensmitteln gerechnet. So bleiben von Hand gesetzte Werte erhalten.
  const eigene: Makros = {
    kcal: zahl(meal.kcal),
    prot: zahl(meal.prot),
    fat: zahl(meal.fat),
    carbs: zahl(meal.carbs),
  };
  if (eigene.kcal > 0 || eigene.prot > 0 || eigene.fat > 0 || eigene.carbs > 0) return eigene;

  return (meal.foods ?? []).reduce<Makros>(
    (sum, food) => ({
      kcal: sum.kcal + zahl(food.kcal),
      prot: sum.prot + zahl(food.prot),
      fat: sum.fat + zahl(food.fat),
      carbs: sum.carbs + zahl(food.carbs),
    }),
    { ...LEERE_MAKROS },
  );
}

export function makrosEinesPlans(plan: MealPlan): Makros {
  return (plan.meals ?? []).reduce<Makros>((sum, meal) => {
    const m = makrosEinerMahlzeit(meal);
    return {
      kcal: sum.kcal + m.kcal,
      prot: sum.prot + m.prot,
      fat: sum.fat + m.fat,
      carbs: sum.carbs + m.carbs,
    };
  }, { ...LEERE_MAKROS });
}

/* ------------------------------------------------------------------ *
 * Kalorienrechner
 * ------------------------------------------------------------------ */

export interface KalorienEingabe {
  kg: number;
  cm: number;
  alter: number;
  /** „Weiblich" rechnet nach der weiblichen Formel, alles andere männlich. */
  geschlecht: string;
  /** Aktivitätsfaktor (PAL). */
  aktivitaet: number;
  /** Zu- oder Abschlag in Prozent, z. B. -15 für ein Defizit. */
  anpassungProzent: number;
  proteinProKg: number;
  fettProKg: number;
}

export interface KalorienErgebnis {
  bmr: number;
  tdee: number;
  targetKcal: number;
  protein: number;
  fat: number;
  carbs: number;
  activityFactor: number;
  adjustmentPct: number;
  proteinPerKg: number;
  fatPerKg: number;
  calculatedAt: string;
}

export const AKTIVITAET_STUFEN = [
  { wert: 1.2, label: 'Sitzend, kaum Bewegung' },
  { wert: 1.375, label: 'Leicht aktiv, 1–3× Sport' },
  { wert: 1.465, label: 'Mäßig aktiv, 3–4× Sport' },
  { wert: 1.55, label: 'Aktiv, 4–5× Sport' },
  { wert: 1.725, label: 'Sehr aktiv, 6–7× Sport' },
  { wert: 1.9, label: 'Körperliche Arbeit + Sport' },
] as const;

export const STANDARD_KALORIEN: Pick<
  KalorienEingabe,
  'aktivitaet' | 'anpassungProzent' | 'proteinProKg' | 'fettProKg'
> = {
  aktivitaet: 1.465,
  anpassungProzent: 0,
  proteinProKg: 2.75,
  fettProKg: 0.6,
};

/**
 * Grundumsatz nach Mifflin-St Jeor, Gesamtumsatz über den Aktivitätsfaktor.
 * Kohlenhydrate füllen auf, was nach Protein und Fett übrig bleibt.
 */
export function berechneKalorien(
  e: KalorienEingabe,
  now: Date = new Date(),
): KalorienErgebnis {
  const weiblich = e.geschlecht === 'Weiblich';
  const bmr = 10 * e.kg + 6.25 * e.cm - 5 * e.alter + (weiblich ? -161 : 5);
  const tdee = bmr * e.aktivitaet;
  const target = tdee * (1 + e.anpassungProzent / 100);

  const protG = e.proteinProKg * e.kg;
  const fatG = e.fettProKg * e.kg;
  // Kohlenhydrate können nicht negativ werden – bei starkem Defizit mit hohem
  // Protein- und Fettanteil bleibt sonst rechnerisch ein Minus stehen.
  const carbG = Math.max(0, target - protG * 4 - fatG * 9) / 4;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: Math.round(target),
    protein: Math.round(protG),
    fat: Math.round(fatG),
    carbs: Math.round(carbG),
    activityFactor: e.aktivitaet,
    adjustmentPct: e.anpassungProzent,
    proteinPerKg: e.proteinProKg,
    fatPerKg: e.fettProKg,
    calculatedAt: now.toISOString(),
  };
}
