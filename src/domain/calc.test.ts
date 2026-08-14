import { describe, expect, it } from 'vitest';
import type { Client, LogbookEntry } from '@/db/types';
import { berechneKalorien, makrosEinesPlans, zahl } from './nutrition';
import { e1RM, letzteSaetze, uebungsVerlauf, vorkommendeUebungen, zielFortschritt } from './training';
import { einnahmenJeMonat, monatsLage, setzeZahlung, wiederkehrenderUmsatz } from './payments';
import { neuesteZuerst, parseDatum } from './dates';

describe('Zahlen aus der Datenbank lesen', () => {
  it('versteht Punkt und Komma', () => {
    expect(zahl('82.5')).toBe(82.5);
    expect(zahl('82,5')).toBe(82.5);
    expect(zahl(82.5)).toBe(82.5);
  });

  it('macht aus Unlesbarem eine Null statt NaN', () => {
    // NaN würde sich durch jede Summe fressen und am Ende „NaN kg" anzeigen.
    expect(zahl('')).toBe(0);
    expect(zahl('keine Ahnung')).toBe(0);
    expect(zahl(undefined)).toBe(0);
    expect(zahl(null)).toBe(0);
  });
});

describe('Datumsauswertung', () => {
  it('liest ISO-Datum', () => {
    expect(parseDatum('2026-08-14')).toBe(Date.UTC(2026, 7, 14));
  });

  it('liest deutsches Datum aus Altdaten', () => {
    // new Date("14.08.2026") ergibt in den meisten Browsern Invalid Date.
    expect(parseDatum('14.08.2026')).toBe(Date.UTC(2026, 7, 14));
  });

  it('meldet Unlesbares als null statt als Invalid Date', () => {
    expect(parseDatum('')).toBeNull();
    expect(parseDatum(undefined)).toBeNull();
    expect(parseDatum('irgendwas')).toBeNull();
  });

  it('sortiert stabil und gibt bei Gleichstand 0 zurück', () => {
    // Die alte Fassung (b>a?1:-1) konnte nie 0 liefern – bei gleichem Datum
    // war die Reihenfolge dem Zufall überlassen.
    const a = { datum: '2026-08-14', createdAt: '2026-08-14T10:00:00Z' };
    const b = { datum: '2026-08-14', createdAt: '2026-08-14T10:00:00Z' };
    expect(neuesteZuerst(a, b)).toBe(0);
  });

  it('entscheidet bei gleichem Tag über die Uhrzeit', () => {
    const frueh = { datum: '2026-08-14', createdAt: '2026-08-14T08:00:00Z' };
    const spaet = { datum: '2026-08-14', createdAt: '2026-08-14T20:00:00Z' };
    expect(neuesteZuerst(frueh, spaet)).toBeGreaterThan(0);
  });
});

describe('Ernährung', () => {
  it('summiert die Makros eines Plans', () => {
    const plan = {
      name: 'Tag A',
      meals: [
        { name: 'Frühstück', kcal: '500', prot: '30', fat: '15', carbs: '60' },
        { name: 'Mittag', kcal: '700', prot: '45', fat: '20', carbs: '80' },
      ],
    };
    expect(makrosEinesPlans(plan)).toEqual({ kcal: 1200, prot: 75, fat: 35, carbs: 140 });
  });

  it('rechnet aus den Lebensmitteln, wenn die Mahlzeit keine Summe trägt', () => {
    const plan = {
      name: 'Tag B',
      meals: [
        {
          name: 'Snack',
          foods: [
            { name: 'Quark', kcal: '150', prot: '25', fat: '1', carbs: '6' },
            { name: 'Banane', kcal: '90', prot: '1', fat: '0', carbs: '22' },
          ],
        },
      ],
    };
    expect(makrosEinesPlans(plan)).toEqual({ kcal: 240, prot: 26, fat: 1, carbs: 28 });
  });
});

describe('Kalorienrechner', () => {
  const basis = {
    kg: 80,
    cm: 180,
    alter: 30,
    geschlecht: 'Männlich',
    aktivitaet: 1.465,
    anpassungProzent: 0,
    proteinProKg: 2,
    fettProKg: 1,
  };

  it('rechnet den Grundumsatz nach Mifflin-St Jeor', () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 1780
    expect(berechneKalorien(basis).bmr).toBe(1780);
  });

  it('nutzt für Frauen die andere Konstante', () => {
    const w = berechneKalorien({ ...basis, geschlecht: 'Weiblich' });
    expect(w.bmr).toBe(1780 - 166);
  });

  it('berücksichtigt Defizit und Überschuss', () => {
    const defizit = berechneKalorien({ ...basis, anpassungProzent: -20 });
    const normal = berechneKalorien(basis);
    expect(defizit.targetKcal).toBeLessThan(normal.targetKcal);
    expect(defizit.targetKcal).toBe(Math.round(normal.tdee * 0.8));
  });

  it('lässt Kohlenhydrate nie negativ werden', () => {
    // Starkes Defizit bei viel Protein und Fett ergäbe sonst ein Minus.
    const extrem = berechneKalorien({
      ...basis,
      anpassungProzent: -60,
      proteinProKg: 3,
      fettProKg: 1.5,
    });
    expect(extrem.carbs).toBeGreaterThanOrEqual(0);
  });
});

describe('Trainingsauswertung', () => {
  const entries: LogbookEntry[] = [
    {
      id: '1',
      datum: '2026-08-01',
      exercises: [
        { name: 'Bankdrücken', sets: [{ set: 1, kg: '80', reps: '10' }, { set: 2, kg: '80', reps: '9' }] },
      ],
    },
    {
      id: '2',
      datum: '2026-08-08',
      exercises: [
        { name: 'Bankdrücken', sets: [{ set: 1, kg: '85', reps: '8' }] },
        { name: 'Kniebeugen', sets: [{ set: 1, kg: '100', reps: '5' }] },
      ],
    },
  ];

  it('rechnet e1RM nach Epley', () => {
    expect(e1RM(100, 1)).toBe(100);
    expect(e1RM(100, 10)).toBeCloseTo(133.33, 1);
  });

  it('deckelt bei hohen Wiederholungszahlen', () => {
    expect(e1RM(50, 30)).toBe(e1RM(50, 12));
  });

  it('listet alle vorkommenden Übungen alphabetisch', () => {
    expect(vorkommendeUebungen(entries)).toEqual(['Bankdrücken', 'Kniebeugen']);
  });

  it('baut den Verlauf einer Übung chronologisch', () => {
    const verlauf = uebungsVerlauf(entries, 'Bankdrücken', 'gewicht');
    expect(verlauf.map((p) => p.value)).toEqual([80, 85]);
  });

  it('findet die Übung unabhängig von der Schreibweise', () => {
    expect(uebungsVerlauf(entries, '  bankdrücken ', 'gewicht')).toHaveLength(2);
  });

  it('liefert die Sätze des letzten Trainings', () => {
    const letzte = letzteSaetze(entries, 'Bankdrücken');
    expect(letzte?.datum).toBe('2026-08-08');
    expect(letzte?.sets).toHaveLength(1);
  });

  it('übergeht leere Sätze bei der Suche nach dem letzten Training', () => {
    const mitLeerem: LogbookEntry[] = [
      { id: '3', datum: '2026-08-10', exercises: [{ name: 'Bankdrücken', sets: [{ set: 1, kg: '', reps: '' }] }] },
      ...entries,
    ];
    expect(letzteSaetze(mitLeerem, 'Bankdrücken')?.datum).toBe('2026-08-08');
  });

  it('rechnet den Zielfortschritt', () => {
    expect(zielFortschritt(90, 85, 80)).toBe(50);
    expect(zielFortschritt(90, 80, 80)).toBe(100);
    expect(zielFortschritt(80, 80, 80)).toBeNull();
  });
});

describe('Zahlungen', () => {
  const clients: Client[] = [
    { id: 'a', paket: 'lifestyle', paketPreis: 39, zahlungen: [{ monat: '2026-08', bezahlt: true }] },
    { id: 'b', paket: 'training', paketPreis: 24, zahlungen: [] },
    { id: 'c', paket: 'individuell', paketPreis: 0 },
    { id: 'd', paket: 'training', paketPreis: 24, aktiv: false },
  ];

  it('rechnet Soll und Ist für den Monat', () => {
    const lage = monatsLage(clients, '2026-08');
    // Nur a und b zählen: c ist individuell, d ist inaktiv.
    expect(lage.soll).toBe(63);
    expect(lage.ist).toBe(39);
    expect(lage.offen).toBe(24);
    expect(lage.offeneKunden).toBe(1);
  });

  it('setzt eine Zahlung, ohne andere Monate zu verlieren', () => {
    const client: Client = { id: 'x', zahlungen: [{ monat: '2026-07', bezahlt: true }] };
    const neu = setzeZahlung(client, '2026-08', true);
    expect(neu).toHaveLength(2);
    expect(neu?.find((z) => z.monat === '2026-07')?.bezahlt).toBe(true);
  });

  it('überschreibt einen bestehenden Monat statt ihn zu doppeln', () => {
    const client: Client = { id: 'x', zahlungen: [{ monat: '2026-08', bezahlt: true }] };
    const neu = setzeZahlung(client, '2026-08', false);
    expect(neu).toHaveLength(1);
    expect(neu?.[0]?.bezahlt).toBe(false);
  });

  it('summiert die Einnahmen je Monat', () => {
    expect(einnahmenJeMonat(clients)).toEqual([{ monat: '2026-08', betrag: 39 }]);
  });

  it('rechnet den wiederkehrenden Umsatz nur aus aktiven Kunden', () => {
    expect(wiederkehrenderUmsatz(clients)).toBe(63);
  });
});
