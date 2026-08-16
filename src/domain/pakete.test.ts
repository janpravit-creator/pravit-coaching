import { describe, expect, it } from 'vitest';
import type { Client } from '@/db/types';
import {
  PAKETE,
  WAEHLBARE_PAKETE,
  aktuellerPreis,
  monateDabei,
  naechsteFaelligkeit,
  offeneMonate,
  paketInhalt,
  paketName,
  preisEinesKunden,
  preislage,
} from './pakete';

describe('Preistabelle', () => {
  it('trägt die aktuell gültigen Preise', () => {
    expect(aktuellerPreis('training')).toBe(79);
    expect(aktuellerPreis('ernaehrung')).toBe(79);
    expect(aktuellerPreis('komplett')).toBe(129);
    expect(aktuellerPreis('premium')).toBe(199);
  });

  it('beschreibt Premium mit vier Einheiten pro Monat', () => {
    expect(paketInhalt('premium')).toContain('4 Trainingseinheiten pro Monat');
    expect(paketInhalt('premium')).toContain('1× pro Woche');
  });

  it('hat für „Individuell" keinen Listenpreis', () => {
    expect(aktuellerPreis('individuell')).toBeNull();
  });

  it('kennt keinen unbekannten Schlüssel als Preis', () => {
    expect(aktuellerPreis('gibtsnicht')).toBeNull();
    expect(aktuellerPreis(undefined)).toBeNull();
  });

  it('stellt das alte Testpaket nicht mehr zur Auswahl, zeigt es aber an', () => {
    // Bestandskunden tragen `lifestyle` weiter in Firestore – verschwände der
    // Schlüssel, stünde bei ihnen „Kein Paket".
    expect(WAEHLBARE_PAKETE).not.toContain('lifestyle');
    expect(paketName('lifestyle')).toBe('Lifestyle (Testphase)');
    expect(PAKETE['lifestyle']?.veraltet).toBe(true);
  });

  it('stellt die vier echten Pakete plus „Individuell" zur Auswahl', () => {
    expect(WAEHLBARE_PAKETE).toEqual([
      'training',
      'ernaehrung',
      'komplett',
      'premium',
      'individuell',
    ]);
  });

  it('gibt einen unbekannten Schlüssel unverändert zurück, statt ihn zu verschlucken', () => {
    expect(paketName('irgendwas')).toBe('irgendwas');
    expect(paketName(undefined)).toBe('Kein Paket');
  });
});

describe('Bestandsschutz', () => {
  it('lässt den hinterlegten Preis gewinnen', () => {
    // Der Kern der Regel: Wird die Tabelle oben von Hand angehoben, gilt das
    // nur für Neukunden.
    const alt: Client = { id: 'a', paket: 'komplett', paketPreis: 99 };
    expect(preisEinesKunden(alt)).toBe(99);
    expect(aktuellerPreis('komplett')).toBe(129);
  });

  it('weist den Unterschied aus', () => {
    const alt: Client = { id: 'a', paket: 'komplett', paketPreis: 99 };
    expect(preislage(alt)).toMatchObject({
      preis: 99,
      listenpreis: 129,
      bestandsschutz: true,
      ersparnis: 30,
    });
  });

  it('meldet keinen Bestandsschutz beim aktuellen Preis', () => {
    const neu: Client = { id: 'b', paket: 'komplett', paketPreis: 129 };
    expect(preislage(neu).bestandsschutz).toBe(false);
    expect(preislage(neu).ersparnis).toBe(0);
  });

  it('meldet keinen Bestandsschutz, wenn jemand über Listenpreis zahlt', () => {
    const teuer: Client = { id: 'c', paket: 'training', paketPreis: 150 };
    expect(preislage(teuer).bestandsschutz).toBe(false);
    expect(preislage(teuer).preis).toBe(150);
  });

  it('nimmt den Listenpreis, wenn gar nichts hinterlegt ist', () => {
    expect(preisEinesKunden({ id: 'd', paket: 'training' })).toBe(79);
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
      startDatum: '2026-06-01',
      zahlungen: [{ monat: '2026-06', bezahlt: true }],
    };
    expect(naechsteFaelligkeit(c, '2026-08')).toBe('2026-07');
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
    expect(offeneMonate(c, '2027-05')).toEqual(['2027-04']);
  });

  it('gibt null zurück, wenn alles bis heute beglichen ist', () => {
    const c: Client = {
      id: 'c',
      startDatum: '2026-06-01',
      zahlungen: [
        { monat: '2026-06', bezahlt: true },
        { monat: '2026-07', bezahlt: true },
      ],
    };
    expect(naechsteFaelligkeit(c, '2026-07')).toBeNull();
    expect(offeneMonate(c, '2026-07')).toEqual([]);
  });

  it('zählt einen als unbezahlt markierten Monat als offen', () => {
    const c: Client = {
      id: 'd',
      startDatum: '2026-06-01',
      zahlungen: [{ monat: '2026-06', bezahlt: false }],
    };
    expect(naechsteFaelligkeit(c, '2026-06')).toBe('2026-06');
  });

  it('nennt den Startmonat, wenn der Kunde erst künftig beginnt', () => {
    const c: Client = { id: 'e', startDatum: '2027-01-15' };
    expect(naechsteFaelligkeit(c, '2026-11')).toBe('2027-01');
  });

  it('gibt ohne brauchbares Startdatum null zurück statt zu raten', () => {
    expect(naechsteFaelligkeit({ id: 'f' }, '2026-11')).toBeNull();
    expect(naechsteFaelligkeit({ id: 'g', startDatum: 'demnächst' }, '2026-11')).toBeNull();
    expect(offeneMonate({ id: 'f' }, '2026-11')).toEqual([]);
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
    expect(offeneMonate(c, '2027-02')).toEqual(['2027-01', '2027-02']);
  });
});

describe('Monate dabei', () => {
  it('zählt den Startmonat als ersten Monat', () => {
    expect(monateDabei({ id: 'a', startDatum: '2026-06-01' }, '2026-06')).toBe(1);
    expect(monateDabei({ id: 'a', startDatum: '2026-06-01' }, '2027-06')).toBe(13);
  });

  it('gibt ohne Startdatum null zurück', () => {
    expect(monateDabei({ id: 'b' }, '2026-09')).toBeNull();
  });
});
