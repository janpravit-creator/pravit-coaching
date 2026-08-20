import { describe, expect, it } from 'vitest';
import type { MealFood } from '@/db/types';
import {
  alsMahlzeitFelder,
  anzahlBerechenbar,
  ausTreffer,
  hatNaehrwerte,
  makrosAusLebensmitteln,
  makrosEinesLebensmittels,
  mengeAusText,
  mengeEinesLebensmittels,
} from './lebensmittel';
import { makrosEinerMahlzeit } from './nutrition';

/** Haferflocken: 370 kcal, 13 P, 7 F, 59 KH je 100 g. */
const haferflocken: MealFood = {
  name: 'Zarte Haferflocken',
  amount: '110g',
  grams: '110',
  basis: '100g',
  kcalPer100: '370',
  protPer100: '13',
  fatPer100: '7',
  carbsPer100: '59',
};

describe('Menge aus freiem Text', () => {
  it('liest Gramm, Stück und Kommazahlen', () => {
    expect(mengeAusText('150g')).toBe(150);
    expect(mengeAusText('150 g')).toBe(150);
    expect(mengeAusText('2 Stück')).toBe(2);
    expect(mengeAusText('1,5 EL')).toBe(1.5);
    expect(mengeAusText('1.5')).toBe(1.5);
  });

  it('gibt null bei Unlesbarem – das ist etwas anderes als null Gramm', () => {
    expect(mengeAusText('eine Handvoll')).toBeNull();
    expect(mengeAusText('')).toBeNull();
    expect(mengeAusText(undefined)).toBeNull();
  });
});

describe('Menge eines Lebensmittels', () => {
  it('nimmt das Zahlenfeld, wenn es gefüllt ist', () => {
    expect(mengeEinesLebensmittels(haferflocken)).toBe(110);
  });

  it('fällt auf den freien Text zurück', () => {
    expect(mengeEinesLebensmittels({ ...haferflocken, grams: '' })).toBe(110);
    expect(mengeEinesLebensmittels({ name: 'X', amount: '75 g' })).toBe(75);
  });

  it('ist null, wenn beides fehlt', () => {
    expect(mengeEinesLebensmittels({ name: 'X' })).toBe(0);
  });
});

describe('Makros eines Lebensmittels', () => {
  it('skaliert Bezugswerte je 100 g mit der Menge', () => {
    const m = makrosEinesLebensmittels(haferflocken);
    expect(m.kcal).toBeCloseTo(407);
    expect(m.prot).toBeCloseTo(14.3);
    expect(m.fat).toBeCloseTo(7.7);
    expect(m.carbs).toBeCloseTo(64.9);
  });

  it('multipliziert bei Stück-Basis nur mit der Anzahl', () => {
    // Ein Ei: 78 kcal je Stück. Zwei Eier sind 156 – nicht 1,56.
    const ei: MealFood = {
      name: 'Ei',
      amount: '2 Stück',
      grams: '2',
      basis: 'stueck',
      kcalPer100: '78',
      protPer100: '6',
      fatPer100: '5',
      carbsPer100: '0.6',
    };
    const m = makrosEinesLebensmittels(ei);
    expect(m.kcal).toBeCloseTo(156);
    expect(m.prot).toBeCloseTo(12);
  });

  it('behandelt eine fehlende Basis wie 100 g', () => {
    const ohneBasis = { ...haferflocken };
    delete ohneBasis.basis;
    expect(makrosEinesLebensmittels(ohneBasis).kcal).toBeCloseTo(407);
  });

  it('liefert null ohne Menge oder ohne hinterlegte Werte', () => {
    expect(makrosEinesLebensmittels({ ...haferflocken, grams: '', amount: '' }).kcal).toBe(0);
    expect(makrosEinesLebensmittels({ name: 'Obstsalat', amount: '200g' }).kcal).toBe(0);
  });

  it('kommt mit deutschem Komma in den Bezugswerten zurecht', () => {
    const m = makrosEinesLebensmittels({ ...haferflocken, grams: '100', kcalPer100: '370,5' });
    expect(m.kcal).toBeCloseTo(370.5);
  });
});

describe('Summe über eine Mahlzeit', () => {
  const foods: MealFood[] = [
    haferflocken,
    // Ohne hinterlegte Werte – zählt nicht mit, verhindert aber auch nichts.
    { name: 'Obstsalat', amount: '200g' },
    {
      name: 'Whey',
      amount: '30g',
      grams: '30',
      basis: '100g',
      kcalPer100: '400',
      protPer100: '80',
      fatPer100: '6',
      carbsPer100: '8',
    },
  ];

  it('zählt nur, was Werte trägt', () => {
    const m = makrosAusLebensmitteln(foods);
    expect(m.kcal).toBeCloseTo(407 + 120);
    expect(m.prot).toBeCloseTo(14.3 + 24);
  });

  it('zählt, wie viele Lebensmittel berechenbar sind', () => {
    expect(anzahlBerechenbar(foods)).toBe(2);
    expect(anzahlBerechenbar([{ name: 'Nur Name' }])).toBe(0);
  });

  it('rundet für die Eingabefelder der Mahlzeit', () => {
    expect(alsMahlzeitFelder(makrosAusLebensmitteln(foods))).toEqual({
      kcal: '527',
      prot: '38',
      // 7,7 g aus den Haferflocken plus 1,8 g aus dem Whey sind 9,5 – und
      // 9,5 rundet auf 10, nicht ab.
      fat: '10',
      carbs: '67',
    });
  });
});

describe('Mahlzeit-Makros', () => {
  it('rechnet aus den Lebensmitteln, wenn die Mahlzeit keine eigenen Summen trägt', () => {
    // Genau der Fehler aus dem Screenshot: Die Werte standen als Bezugsgrößen
    // in den Daten, gelesen wurden aber Felder, die es dort nie gab.
    const m = makrosEinerMahlzeit({ name: 'Frühstück', foods: [haferflocken] });
    expect(m.kcal).toBeCloseTo(407);
  });

  it('lässt von Hand gesetzte Summen gewinnen', () => {
    const m = makrosEinerMahlzeit({ name: 'Frühstück', kcal: '620', foods: [haferflocken] });
    expect(m.kcal).toBe(620);
  });

  it('füllt je Feld auf – ein gesetztes kcal macht Protein nicht zu null', () => {
    // Viele Mahlzeiten tragen nur kcal. Würde das die ganze Mahlzeit
    // übernehmen, stünde bei Protein eine Null, obwohl die Lebensmittel es
    // wissen.
    const m = makrosEinerMahlzeit({ name: 'Frühstück', kcal: '620', foods: [haferflocken] });
    expect(m.kcal).toBe(620);
    expect(m.prot).toBeCloseTo(14.3);
    expect(m.carbs).toBeCloseTo(64.9);
  });
});

describe('Suchtreffer übernehmen', () => {
  it('legt Bezugswerte und Menge passend ab', () => {
    const food = ausTreffer(
      { name: 'Haferflocken', herkunft: 'Eigene Datenbank', basis: '100g', kcal: 370, prot: 13, fat: 7, carbs: 59 },
      110,
    );
    expect(food).toMatchObject({
      name: 'Haferflocken',
      amount: '110g',
      grams: '110',
      basis: '100g',
      kcalPer100: '370',
    });
    // Und das Ergebnis rechnet sich sofort richtig aus.
    expect(makrosEinesLebensmittels(food).kcal).toBeCloseTo(407);
  });

  it('schreibt bei Stück-Basis die Einheit dazu', () => {
    const food = ausTreffer(
      { name: 'Ei', herkunft: 'Eigene Datenbank', basis: 'stueck', kcal: 78, prot: 6, fat: 5, carbs: 0.6 },
      2,
    );
    expect(food.amount).toBe('2 Stück');
    expect(makrosEinesLebensmittels(food).kcal).toBeCloseTo(156);
  });
});

describe('Hat Nährwerte', () => {
  it('erkennt hinterlegte Werte', () => {
    expect(hatNaehrwerte(haferflocken)).toBe(true);
    expect(hatNaehrwerte({ name: 'X', amount: '100g' })).toBe(false);
    // Ein Lebensmittel mit 0 kcal, aber Protein – etwa ein Süßstoff-Pulver.
    expect(hatNaehrwerte({ name: 'X', kcalPer100: '0', protPer100: '2' })).toBe(true);
  });
});
