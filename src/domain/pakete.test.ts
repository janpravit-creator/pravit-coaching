import { describe, expect, it } from 'vitest';
import type { Client } from '@/db/types';
import {
  PAKETE,
  PHASEN_START,
  WAEHLBARE_PAKETE,
  aktuellePhase,
  aktuellerPreis,
  monateDabei,
  naechsteFaelligkeit,
  paketName,
  preisEinesKunden,
  preisFuer,
  preislage,
} from './pakete';

describe('Preisphasen', () => {
  it('zählt den Startmonat als Monat 1, nicht als Monat 0', () => {
    // Sonst verschöbe sich jede Phasengrenze um einen Monat.
    expect(aktuellePhase(PHASEN_START)).toBe('start');
  });

  it('hält die Grenzen aus Kapitel 7 ein', () => {
    expect(aktuellePhase('2027-02')).toBe('start'); // Monat 6
    expect(aktuellePhase('2027-03')).toBe('standard'); // Monat 7
    expect(aktuellePhase('2028-02')).toBe('standard'); // Monat 18
    expect(aktuellePhase('2028-03')).toBe('etabliert'); // Monat 19
  });

  it('behandelt Monate vor dem Start als Startphase', () => {
    expect(aktuellePhase('2026-01')).toBe('start');
  });

  it('rechnet über den Jahreswechsel richtig', () => {
    // 2026-09 ist Monat 1, 2027-01 ist Monat 5 – noch Startphase.
    expect(aktuellePhase('2027-01')).toBe('start');
  });
});

describe('Preistabelle', () => {
  it('trägt die Preise aus Kapitel 7', () => {
    expect(preisFuer('training', 'start')).toBe(79);
    expect(preisFuer('training', 'etabliert')).toBe(99);
    expect(preisFuer('komplett', 'start')).toBe(129);
    expect(preisFuer('komplett', 'standard')).toBe(149);
    expect(preisFuer('komplett', 'etabliert')).toBe(179);
    expect(preisFuer('premium', 'start')).toBe(199);
    expect(preisFuer('premium', 'etabliert')).toBe(259);
  });

  it('hat für „Individuell" keinen Listenpreis', () => {
    expect(preisFuer('individuell', 'start')).toBeNull();
    expect(aktuellerPreis('individuell')).toBeNull();
  });

  it('stellt das alte Testpaket nicht mehr zur Auswahl, zeigt es aber an', () => {
    // Bestandskunden tragen `lifestyle` weiter in Firestore – verschwände der
    // Schlüssel, stünde bei ihnen „Kein Paket".
    expect(WAEHLBARE_PAKETE).not.toContain('lifestyle');
    expect(paketName('lifestyle')).toBe('Lifestyle (Testphase)');
    expect(PAKETE['lifestyle']?.veraltet).toBe(true);
  });

  it('gibt einen unbekannten Schlüssel unverändert zurück, statt ihn zu verschlucken', () => {
    expect(paketName('irgendwas')).toBe('irgendwas');
    expect(paketName(undefined)).toBe('Kein Paket');
  });
});

describe('Bestandsschutz', () => {
  const bestandskunde: Client = { id: 'a', paket: 'komplett', paketPreis: 129 };

  it('lässt den hinterlegten Preis gewinnen, auch wenn die Phase weiter ist', () => {
    // Der Kern der Regel: Preiserhöhung gilt nur für Neukunden.
    expect(preisEinesKunden(bestandskunde, '2028-06')).toBe(129);
    expect(aktuellerPreis('komplett', '2028-06')).toBe(179);
  });

  it('weist den Unterschied aus', () => {
    const lage = preislage(bestandskunde, '2028-06');
    expect(lage).toMatchObject({
      preis: 129,
      listenpreis: 179,
      bestandsschutz: true,
      ersparnis: 50,
    });
  });

  it('meldet keinen Bestandsschutz, wenn der Kunde den aktuellen Preis zahlt', () => {
    const neu: Client = { id: 'b', paket: 'komplett', paketPreis: 179 };
    expect(preislage(neu, '2028-06').bestandsschutz).toBe(false);
    expect(preislage(neu, '2028-06').ersparnis).toBe(0);
  });

  it('meldet keinen Bestandsschutz, wenn jemand über Listenpreis zahlt', () => {
    const teuer: Client = { id: 'c', paket: 'training', paketPreis: 150 };
    const lage = preislage(teuer, PHASEN_START);
    expect(lage.bestandsschutz).toBe(false);
    expect(lage.preis).toBe(150);
  });

  it('nimmt den heutigen Listenpreis, wenn gar nichts hinterlegt ist', () => {
    const ohne: Client = { id: 'd', paket: 'training' };
    expect(preisEinesKunden(ohne, PHASEN_START)).toBe(79);
  });

  it('bleibt bei 0, wenn weder Preis noch Listenpreis existieren', () => {
    // „Individuell" ohne hinterlegten Preis darf keine Phantom-Einnahme werden.
    expect(preisEinesKunden({ id: 'e', paket: 'individuell' })).toBe(0);
    expect(preisEinesKunden({ id: 'f' })).toBe(0);
  });
});

describe('Nächste Fälligkeit', () => {
  it('findet den ersten unbezahlten Monat ab Beitritt', () => {
    const c: Client = {
      id: 'a',
      startDatum: '2026-09-01',
      zahlungen: [{ monat: '2026-09', bezahlt: true }],
    };
    expect(naechsteFaelligkeit(c, '2026-11')).toBe('2026-10');
  });

  it('übersieht eine Lücke zwischen bezahlten Monaten nicht', () => {
    // Wer März und Mai bezahlt hat, schuldet den April. Eine reine
    // Fortschreibung „Start + n" würde das übersehen.
    const c: Client = {
      id: 'b',
      startDatum: '2027-03-01',
      zahlungen: [
        { monat: '2027-03', bezahlt: true },
        { monat: '2027-05', bezahlt: true },
      ],
    };
    expect(naechsteFaelligkeit(c, '2027-05')).toBe('2027-04');
  });

  it('gibt null zurück, wenn alles bis heute beglichen ist', () => {
    const c: Client = {
      id: 'c',
      startDatum: '2026-09-01',
      zahlungen: [
        { monat: '2026-09', bezahlt: true },
        { monat: '2026-10', bezahlt: true },
      ],
    };
    expect(naechsteFaelligkeit(c, '2026-10')).toBeNull();
  });

  it('zählt einen als unbezahlt markierten Monat als offen', () => {
    const c: Client = {
      id: 'd',
      startDatum: '2026-09-01',
      zahlungen: [{ monat: '2026-09', bezahlt: false }],
    };
    expect(naechsteFaelligkeit(c, '2026-09')).toBe('2026-09');
  });

  it('nennt den Startmonat, wenn der Kunde erst künftig beginnt', () => {
    const c: Client = { id: 'e', startDatum: '2027-01-15' };
    expect(naechsteFaelligkeit(c, '2026-11')).toBe('2027-01');
  });

  it('gibt ohne brauchbares Startdatum null zurück statt zu raten', () => {
    expect(naechsteFaelligkeit({ id: 'f' }, '2026-11')).toBeNull();
    expect(naechsteFaelligkeit({ id: 'g', startDatum: 'demnächst' }, '2026-11')).toBeNull();
  });

  it('läuft über den Jahreswechsel', () => {
    const c: Client = {
      id: 'h',
      startDatum: '2026-11-01',
      zahlungen: [
        { monat: '2026-11', bezahlt: true },
        { monat: '2026-12', bezahlt: true },
      ],
    };
    expect(naechsteFaelligkeit(c, '2027-02')).toBe('2027-01');
  });
});

describe('Monate dabei', () => {
  it('zählt den Startmonat als ersten Monat', () => {
    expect(monateDabei({ id: 'a', startDatum: '2026-09-01' }, '2026-09')).toBe(1);
    expect(monateDabei({ id: 'a', startDatum: '2026-09-01' }, '2027-09')).toBe(13);
  });

  it('gibt ohne Startdatum null zurück', () => {
    expect(monateDabei({ id: 'b' }, '2026-09')).toBeNull();
  });
});
