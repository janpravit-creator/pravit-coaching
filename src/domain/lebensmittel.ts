import type { MealFood, NaehrwertBasis } from '@/db/types';
import { LEERE_MAKROS, zahl, type Makros } from './nutrition';

/**
 * Rechnen mit Lebensmitteln: aus Bezugswerten und Menge die tatsächlichen
 * Nährwerte machen.
 *
 * Ohne React und ohne Netz, damit sich jede Regel für sich prüfen lässt.
 */

/**
 * Zieht die Zahl aus einer frei getippten Menge.
 *
 * „150g" → 150 · „2 Stück" → 2 · „1,5 EL" → 1.5 · „eine Handvoll" → null
 *
 * Das Komma wird zum Punkt, weil hier deutsch getippt wird. `null` statt `0`
 * bei Unlesbarem: Eine Menge, die niemand deuten kann, ist etwas anderes als
 * die Menge null – und nur so lässt sich später „Menge fehlt" von „Menge ist
 * null" unterscheiden.
 */
export function mengeAusText(text: string | undefined | null): number | null {
  if (!text) return null;
  const treffer = String(text).replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!treffer) return null;
  const wert = Number(treffer[0]);
  return Number.isFinite(wert) ? wert : null;
}

/** Die Menge, mit der gerechnet wird: `grams`, ersatzweise aus `amount`. */
export function mengeEinesLebensmittels(food: MealFood): number {
  const ausFeld = zahl(food.grams);
  if (ausFeld > 0) return ausFeld;
  return mengeAusText(food.amount) ?? 0;
}

/** Ob für dieses Lebensmittel überhaupt Nährwerte hinterlegt sind. */
export function hatNaehrwerte(food: MealFood): boolean {
  return (
    zahl(food.kcalPer100) > 0 ||
    zahl(food.protPer100) > 0 ||
    zahl(food.fatPer100) > 0 ||
    zahl(food.carbsPer100) > 0
  );
}

/**
 * Was ein Lebensmittel tatsächlich beiträgt.
 *
 * Bei Basis `100g` skalieren die Bezugswerte mit Menge/100, bei `stueck`
 * gelten sie je Stück und werden nur mit der Anzahl multipliziert – **nicht**
 * zusätzlich durch 100 geteilt. Genau diese Unterscheidung ist der Grund,
 * warum `basis` mitgespeichert wird.
 */
export function makrosEinesLebensmittels(food: MealFood): Makros {
  const menge = mengeEinesLebensmittels(food);
  if (menge <= 0 || !hatNaehrwerte(food)) return { ...LEERE_MAKROS };

  const faktor = (food.basis ?? '100g') === 'stueck' ? menge : menge / 100;

  return {
    kcal: zahl(food.kcalPer100) * faktor,
    prot: zahl(food.protPer100) * faktor,
    fat: zahl(food.fatPer100) * faktor,
    carbs: zahl(food.carbsPer100) * faktor,
  };
}

/** Summe über alle Lebensmittel, die Nährwerte tragen. */
export function makrosAusLebensmitteln(foods: MealFood[]): Makros {
  return foods.reduce<Makros>((summe, food) => {
    const m = makrosEinesLebensmittels(food);
    return {
      kcal: summe.kcal + m.kcal,
      prot: summe.prot + m.prot,
      fat: summe.fat + m.fat,
      carbs: summe.carbs + m.carbs,
    };
  }, { ...LEERE_MAKROS });
}

/** Wie viele Lebensmittel einer Mahlzeit sich überhaupt berechnen lassen. */
export function anzahlBerechenbar(foods: MealFood[]): number {
  return foods.filter((f) => hatNaehrwerte(f) && mengeEinesLebensmittels(f) > 0).length;
}

/** Gerundete Werte für die Mahlzeit-Felder. */
export function alsMahlzeitFelder(makros: Makros): {
  kcal: string;
  prot: string;
  fat: string;
  carbs: string;
} {
  return {
    kcal: String(Math.round(makros.kcal)),
    prot: String(Math.round(makros.prot)),
    fat: String(Math.round(makros.fat)),
    carbs: String(Math.round(makros.carbs)),
  };
}

/** Ein Treffer aus der Lebensmittelsuche, quellenunabhängig. */
export interface Lebensmitteltreffer {
  name: string;
  /** Herkunft, z. B. „Eigene Datenbank" oder ein Markenname. */
  herkunft: string;
  basis: NaehrwertBasis;
  kcal: number;
  prot: number;
  fat: number;
  carbs: number;
}

/** Übernimmt einen Suchtreffer als Lebensmittel einer Mahlzeit. */
export function ausTreffer(treffer: Lebensmitteltreffer, menge: number): MealFood {
  const einheit = treffer.basis === 'stueck' ? (menge === 1 ? 'Stück' : 'Stück') : 'g';
  return {
    name: treffer.name,
    amount: `${menge}${treffer.basis === 'stueck' ? ' ' : ''}${einheit}`,
    grams: String(menge),
    basis: treffer.basis,
    kcalPer100: String(treffer.kcal),
    protPer100: String(treffer.prot),
    fatPer100: String(treffer.fat),
    carbsPer100: String(treffer.carbs),
  };
}
