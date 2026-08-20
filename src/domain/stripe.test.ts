import { describe, expect, it } from 'vitest';
import {
  istBeachtet,
  monatAus,
  preisKennung,
  setzeZahlungsmonat,
  verfuegbarePakete,
} from './stripe';

describe('Preis-Kennungen', () => {
  const env = {
    STRIPE_PREIS_TRAINING: 'price_123',
    STRIPE_PREIS_KOMPLETT: '  price_456  ',
    STRIPE_PREIS_PREMIUM: '',
  };

  it('liest die Kennung und schneidet Leerzeichen ab', () => {
    expect(preisKennung('training', env)).toBe('price_123');
    expect(preisKennung('komplett', env)).toBe('price_456');
  });

  it('behandelt eine leere Variable wie eine fehlende', () => {
    // Sonst entstünde eine Checkout-Sitzung mit leerer Preis-Kennung.
    expect(preisKennung('premium', env)).toBeNull();
  });

  it('gibt null statt zu werfen, wenn nichts hinterlegt ist', () => {
    expect(preisKennung('ernaehrung', env)).toBeNull();
    expect(preisKennung('individuell', env)).toBeNull();
    expect(preisKennung(undefined, env)).toBeNull();
  });

  it('listet nur die Pakete, die wirklich buchbar sind', () => {
    expect(verfuegbarePakete(env)).toEqual(['training', 'komplett']);
    expect(verfuegbarePakete({})).toEqual([]);
  });
});

describe('Abrechnungsmonat', () => {
  it('rechnet Stripe-Sekunden in Millisekunden um', () => {
    // 2026-08-17T00:00:00Z. Ohne die Umrechnung läge alles im Januar 1970.
    expect(monatAus(1_786_924_800)).toBe('2026-08');
  });

  it('rechnet in UTC, damit der Monatserste nicht verrutscht', () => {
    // 2026-09-01T00:30:00Z – in einer westlichen Zeitzone wäre das noch August.
    expect(monatAus(1_788_222_600)).toBe('2026-09');
  });

  it('gibt null bei Unbrauchbarem zurück', () => {
    expect(monatAus(null)).toBeNull();
    expect(monatAus(undefined)).toBeNull();
    expect(monatAus(Number.NaN)).toBeNull();
  });
});

describe('Zahlung eintragen', () => {
  it('ergänzt einen neuen Monat', () => {
    const neu = setzeZahlungsmonat([{ monat: '2026-07', bezahlt: true }], '2026-08', true);
    expect(neu).toHaveLength(2);
    expect(neu[1]).toMatchObject({ monat: '2026-08', bezahlt: true, quelle: 'stripe' });
  });

  it('überschreibt einen vorhandenen Monat, statt ihn zu doppeln', () => {
    const neu = setzeZahlungsmonat([{ monat: '2026-08', bezahlt: false }], '2026-08', true);
    expect(neu).toHaveLength(1);
    expect(neu[0]?.bezahlt).toBe(true);
  });

  it('lässt andere Monate unangetastet', () => {
    const neu = setzeZahlungsmonat(
      [
        { monat: '2026-06', bezahlt: true },
        { monat: '2026-07', bezahlt: true },
      ],
      '2026-08',
      true,
    );
    expect(neu.filter((z) => z.bezahlt)).toHaveLength(3);
    expect(neu.find((z) => z.monat === '2026-06')?.bezahlt).toBe(true);
  });

  it('kommt mit einer noch leeren Liste zurecht', () => {
    expect(setzeZahlungsmonat(undefined, '2026-08', true)).toHaveLength(1);
  });

  it('vermerkt die Herkunft, damit Stripe und Handeintrag unterscheidbar sind', () => {
    expect(setzeZahlungsmonat([], '2026-08', true, 'hand')[0]?.quelle).toBe('hand');
  });
});

describe('Beachtete Ereignisse', () => {
  it('erkennt die vier Ereignisse, auf die reagiert wird', () => {
    expect(istBeachtet('invoice.paid')).toBe(true);
    expect(istBeachtet('checkout.session.completed')).toBe(true);
    expect(istBeachtet('customer.subscription.deleted')).toBe(true);
  });

  it('ignoriert alles andere', () => {
    // Stripe schickt Dutzende Ereignisarten; eine unbekannte darf keinen
    // Fehler auslösen, sonst wiederholt Stripe die Zustellung endlos.
    expect(istBeachtet('customer.created')).toBe(false);
    expect(istBeachtet('')).toBe(false);
  });
});
