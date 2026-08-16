import { describe, expect, it } from 'vitest';
import type { Client } from '@/db/types';
import { monatLabel } from './payments';
import {
  euro,
  formatiereNummer,
  naechsterZaehler,
  plusTage,
  postenFuer,
  summe,
  zaehlerAus,
} from './rechnung';

describe('Rechnungsnummer', () => {
  it('ist vierstellig aufgefüllt, damit die Textsortierung stimmt', () => {
    expect(formatiereNummer(2026, 1)).toBe('PRV-2026-0001');
    expect(formatiereNummer(2026, 42)).toBe('PRV-2026-0042');
    // Sonst käme „PRV-2026-10" vor „PRV-2026-9".
    expect(['PRV-2026-0010', 'PRV-2026-0009'].sort()).toEqual([
      'PRV-2026-0009',
      'PRV-2026-0010',
    ]);
  });

  it('läuft auch über vier Stellen hinaus weiter', () => {
    expect(formatiereNummer(2026, 12345)).toBe('PRV-2026-12345');
  });

  it('liest den Zählerstand zurück', () => {
    expect(zaehlerAus('PRV-2026-0042', 2026)).toBe(42);
  });

  it('ignoriert Nummern aus einem anderen Jahr', () => {
    // Der Zähler beginnt jedes Jahr neu; eine Nummer von 2025 darf 2026 nicht
    // mitzählen.
    expect(zaehlerAus('PRV-2025-0099', 2026)).toBe(0);
  });

  it('verschluckt sich nicht an alten Hash-Nummern', () => {
    // Die frühere Fassung erzeugte so etwas – die dürfen den Zähler nicht
    // durcheinanderbringen.
    expect(zaehlerAus('PRV-2026-08-a1b2', 2026)).toBe(0);
    expect(zaehlerAus('', 2026)).toBe(0);
  });

  it('zählt von der höchsten vergebenen Nummer weiter, nicht von der Anzahl', () => {
    // Wird eine Rechnung gelöscht, entstünde bei „Anzahl + 1" eine Nummer,
    // die es schon einmal gab.
    expect(naechsterZaehler(['PRV-2026-0001', 'PRV-2026-0003'], 2026)).toBe(4);
  });

  it('beginnt bei 1, wenn im Jahr noch nichts vergeben wurde', () => {
    expect(naechsterZaehler([], 2026)).toBe(1);
    expect(naechsterZaehler(['PRV-2025-0007'], 2026)).toBe(1);
  });
});

describe('Zahlungsziel', () => {
  it('addiert Tage über den Monatswechsel', () => {
    expect(plusTage('2026-08-25', 14)).toBe('2026-09-08');
  });

  it('addiert über den Jahreswechsel', () => {
    expect(plusTage('2026-12-28', 14)).toBe('2027-01-11');
  });

  it('kennt den Schaltjahr-Februar', () => {
    expect(plusTage('2028-02-20', 14)).toBe('2028-03-05');
  });

  it('gibt Unlesbares unverändert zurück statt „Invalid Date"', () => {
    expect(plusTage('irgendwann', 14)).toBe('irgendwann');
  });
});

describe('Positionen', () => {
  const client: Client = { id: 'a', paket: 'komplett', paketPreis: 129 };

  it('bildet je Monat eine Position', () => {
    const posten = postenFuer(client, ['2026-06', '2026-07'], monatLabel);
    expect(posten).toHaveLength(2);
    expect(posten[0]).toMatchObject({
      bezeichnung: 'Coaching – Komplett',
      zeitraum: 'Juni 2026',
      betrag: 129,
    });
    expect(summe(posten)).toBe(258);
  });

  it('nimmt den Bestandspreis, nicht den Listenpreis', () => {
    const alt: Client = { id: 'b', paket: 'komplett', paketPreis: 99 };
    expect(postenFuer(alt, ['2026-06'], monatLabel)[0]?.betrag).toBe(99);
  });

  it('ergibt ohne Monate eine leere Rechnung statt einer über 0 €', () => {
    expect(postenFuer(client, [], monatLabel)).toEqual([]);
    expect(summe([])).toBe(0);
  });
});

describe('Betragsformat', () => {
  it('schreibt deutsch mit zwei Nachkommastellen', () => {
    expect(euro(129)).toBe('129,00 €');
    expect(euro(1548.5)).toBe('1.548,50 €');
  });
});
