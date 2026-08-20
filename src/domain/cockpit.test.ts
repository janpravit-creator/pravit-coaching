import { describe, expect, it } from 'vitest';
import type { Client } from '@/db/types';
import {
  MEILENSTEINE,
  RUECKLAGE_ANTEIL,
  ZIEL_NETTO,
  aktiveKunden,
  aktuellerMeilenstein,
  aufgabenId,
  einnahmenbild,
  fortschritt,
  kundenstand,
  onlineEinnahmen,
} from './cockpit';

const kunde = (id: string, preis: number, rest: Partial<Client> = {}): Client => ({
  id,
  paket: 'komplett',
  paketPreis: preis,
  ...rest,
});

describe('Online-Einnahmen', () => {
  it('summiert aktive Kunden mit festem Paket', () => {
    expect(onlineEinnahmen([kunde('a', 129), kunde('b', 79)])).toBe(208);
  });

  it('lässt inaktive Kunden weg', () => {
    expect(onlineEinnahmen([kunde('a', 129), kunde('b', 79, { aktiv: false })])).toBe(129);
  });

  it('lässt „Individuell" ohne Preis weg', () => {
    // Sonst entstünde eine Einnahme, die es nicht gibt.
    expect(onlineEinnahmen([kunde('a', 129), { id: 'c', paket: 'individuell' }])).toBe(129);
  });
});

describe('Einnahmenbild', () => {
  const kunden = [kunde('a', 129), kunde('b', 129), kunde('c', 79)];

  it('führt die drei Quellen getrennt und summiert sie', () => {
    const bild = einnahmenbild(kunden, { anstellung: 900, praesenz: 400 });
    expect(bild.online).toBe(337);
    expect(bild.anstellung).toBe(900);
    expect(bild.praesenz).toBe(400);
    expect(bild.gesamt).toBe(1637);
  });

  it('legt nur auf das Selbstständige zurück, nicht auf die Anstellung', () => {
    // Dort führt der Arbeitgeber bereits ab – 30 % auf 337 + 400.
    const bild = einnahmenbild(kunden, { anstellung: 900, praesenz: 400 });
    expect(bild.ruecklage).toBe(Math.round(737 * RUECKLAGE_ANTEIL));
    expect(bild.ruecklage).toBe(221);
    expect(bild.nachRuecklage).toBe(1637 - 221);
  });

  it('misst den Abstand am Betrag nach Rücklage, nicht am Umsatz', () => {
    const bild = einnahmenbild(kunden, { anstellung: 900, praesenz: 400 });
    expect(bild.abstandZumZiel).toBe(1416 - ZIEL_NETTO);
    expect(bild.zielErreicht).toBe(false);
  });

  it('meldet das Ziel als erreicht, sobald es reicht', () => {
    const viele = Array.from({ length: 20 }, (_, i) => kunde(`k${i}`, 129));
    const bild = einnahmenbild(viele, { anstellung: 900 });
    expect(bild.zielErreicht).toBe(true);
    expect(bild.abstandZumZiel).toBeGreaterThan(0);
  });

  it('kommt ohne Nebeneinnahmen zurecht', () => {
    const bild = einnahmenbild(kunden);
    expect(bild.anstellung).toBe(0);
    expect(bild.gesamt).toBe(337);
  });

  it('behandelt negative oder unlesbare Eingaben als null', () => {
    const bild = einnahmenbild([], { anstellung: -50, praesenz: Number.NaN });
    expect(bild.gesamt).toBe(0);
    expect(bild.ruecklage).toBe(0);
  });
});

describe('Meilensteine', () => {
  it('beginnt im ersten Abschnitt', () => {
    expect(aktuellerMeilenstein(1).id).toBe('t30');
  });

  it('wechselt am Startmonat des nächsten Abschnitts', () => {
    expect(aktuellerMeilenstein(2).id).toBe('t30');
    expect(aktuellerMeilenstein(3).id).toBe('t90');
    expect(aktuellerMeilenstein(6).id).toBe('m6');
    expect(aktuellerMeilenstein(12).id).toBe('m12');
  });

  it('bleibt im letzten Abschnitt, statt darüber hinauszulaufen', () => {
    expect(aktuellerMeilenstein(99).id).toBe('m24');
  });

  it('fällt bei Monat 0 nicht durch', () => {
    expect(aktuellerMeilenstein(0).id).toBe('t30');
  });

  it('trägt die Zielkorridore aus Kapitel 13', () => {
    expect(MEILENSTEINE.find((m) => m.id === 'm6')?.zielKunden).toEqual([8, 12]);
    expect(MEILENSTEINE.find((m) => m.id === 'm24')?.zielKunden).toEqual([25, 30]);
  });
});

describe('Kundenstand', () => {
  it('erkennt unter, im und über dem Korridor', () => {
    expect(kundenstand(5, [8, 12])).toBe('unter');
    expect(kundenstand(8, [8, 12])).toBe('im_korridor');
    expect(kundenstand(12, [8, 12])).toBe('im_korridor');
    expect(kundenstand(15, [8, 12])).toBe('darueber');
  });

  it('gibt null, wenn ein Abschnitt keinen Korridor hat', () => {
    expect(kundenstand(5, undefined)).toBeNull();
  });
});

describe('Fortschritt', () => {
  const m6 = MEILENSTEINE.find((m) => m.id === 'm6')!;

  it('zählt den Kundenkorridor als eigenen Punkt', () => {
    // Sonst hinge der Fortschritt allein an Häkchen, obwohl die Kundenzahl
    // die eigentliche Messgröße ist. m6 hat 3 Aufgaben + Korridor = 4 Punkte.
    expect(fortschritt(m6, [], 10)).toBeCloseTo(0.25);
    expect(fortschritt(m6, [], 2)).toBe(0);
  });

  it('zählt abgehakte Aufgaben mit', () => {
    const eine = [aufgabenId(m6, m6.aufgaben[0]!)];
    expect(fortschritt(m6, eine, 2)).toBeCloseTo(0.25);
    expect(fortschritt(m6, eine, 10)).toBeCloseTo(0.5);
  });

  it('erreicht 1, wenn alles erledigt ist', () => {
    const alle = m6.aufgaben.map((a) => aufgabenId(m6, a));
    expect(fortschritt(m6, alle, 10)).toBe(1);
  });

  it('wertet ein Übertreffen des Korridors als erfüllt', () => {
    expect(fortschritt(m6, [], 30)).toBeCloseTo(0.25);
  });

  it('gibt einen Bruch zwischen 0 und 1 zurück, keinen Prozentwert', () => {
    // Die Fortschrittsleiste rechnet selbst mal 100 – ein Prozentwert hier
    // ergäbe einen 100-fach zu langen Balken.
    const wert = fortschritt(m6, [], 10);
    expect(wert).toBeGreaterThanOrEqual(0);
    expect(wert).toBeLessThanOrEqual(1);
  });
});

describe('Aktive Kunden', () => {
  it('zählt alle, die nicht ausdrücklich inaktiv sind', () => {
    expect(aktiveKunden([kunde('a', 129), kunde('b', 79, { aktiv: false }), { id: 'c' }])).toBe(2);
  });
});
