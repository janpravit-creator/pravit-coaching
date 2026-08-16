import { describe, expect, it } from 'vitest';
import type { Client, Referral } from '@/db/types';
import {
  UPGRADE_AB,
  bezahlteMonate,
  empfehlungsCode,
  empfehlungsStand,
  gutschriftBetrag,
  offeneGutschriften,
  stufeFuer,
  stufenLabel,
} from './empfehlung';

/** Ein Kunde mit `n` bezahlten Monaten. */
function mitMonaten(id: string, n: number, rest: Partial<Client> = {}): Client {
  return {
    id,
    paket: 'komplett',
    paketPreis: 129,
    zahlungen: Array.from({ length: n }, (_, i) => ({
      monat: `2026-${String(i + 1).padStart(2, '0')}`,
      bezahlt: true,
    })),
    ...rest,
  };
}

describe('Bezahlte Monate', () => {
  it('zählt nur, was wirklich bezahlt ist', () => {
    const c: Client = {
      id: 'a',
      zahlungen: [
        { monat: '2026-06', bezahlt: true },
        { monat: '2026-07', bezahlt: false },
        { monat: '2026-08', bezahlt: true },
      ],
    };
    expect(bezahlteMonate(c)).toBe(2);
  });

  it('ist ohne Zahlungen null', () => {
    expect(bezahlteMonate({ id: 'a' })).toBe(0);
  });
});

describe('Stufen', () => {
  it('greift erst ab drei bezahlten Monaten', () => {
    // Nicht „drei Monate seit Anmeldung" – sonst entstünde ein Anspruch aus
    // einem Kunden, der nie gezahlt hat.
    expect(stufeFuer(2)).toBeNull();
    expect(stufeFuer(3)).toBe('halb');
  });

  it('gibt ab sechs Monaten den ganzen Monat', () => {
    expect(stufeFuer(5)).toBe('halb');
    expect(stufeFuer(6)).toBe('gratis');
    expect(stufeFuer(12)).toBe('gratis');
  });

  it('rechnet die höhere Stufe an, nicht beide', () => {
    // Sonst gäbe es bei sechs Monaten anderthalb Monate geschenkt statt einem.
    const werber = mitMonaten('w', 1);
    expect(gutschriftBetrag(werber, 'gratis')).toBe(129);
    expect(gutschriftBetrag(werber, 'halb')).toBe(64.5);
  });

  it('beschriftet die Stufen wie im Konzept', () => {
    expect(stufenLabel('halb')).toBe('1 Monat 50 % Rabatt');
    expect(stufenLabel('gratis')).toBe('1 Monat gratis');
  });

  it('bezieht die Gutschrift auf den Preis des Werbers', () => {
    // Der Rabatt wird auf seiner Rechnung gewährt, nicht auf der des Geworbenen.
    const guenstiger: Client = { id: 'w', paket: 'training', paketPreis: 79 };
    expect(gutschriftBetrag(guenstiger, 'gratis')).toBe(79);
  });
});

describe('Empfehlungscode', () => {
  it('nutzt den Namen und bleibt gleich', () => {
    const a = empfehlungsCode('Lena Berger', 'abc123');
    expect(a).toMatch(/^LENABE-[0-9A-Z]{4}$/);
    expect(empfehlungsCode('Lena Berger', 'abc123')).toBe(a);
  });

  it('unterscheidet gleiche Namen über die Kennung', () => {
    expect(empfehlungsCode('Max Muster', 'id-eins')).not.toBe(
      empfehlungsCode('Max Muster', 'id-zwei'),
    );
  });

  it('wandelt Umlaute um, statt sie zu verschlucken', () => {
    expect(empfehlungsCode('Jörg Müller', 'x')).toMatch(/^JOERGM/);
  });

  it('fällt bei einem Namen ohne Buchstaben auf PRAVIT zurück', () => {
    expect(empfehlungsCode('123', 'x')).toMatch(/^PRAVIT-/);
  });
});

describe('Offene Gutschriften', () => {
  const werber = mitMonaten('w', 2);
  const clients = [werber, mitMonaten('g1', 4), mitMonaten('g2', 7), mitMonaten('g3', 1)];

  const referrals: Referral[] = [
    { id: 'r1', werberId: 'w', geworbenerId: 'g1', geworbenerName: 'Anna' },
    { id: 'r2', werberId: 'w', geworbenerId: 'g2', geworbenerName: 'Ben' },
    { id: 'r3', werberId: 'w', geworbenerId: 'g3', geworbenerName: 'Chris' },
  ];

  it('listet nur, was die Marke erreicht hat', () => {
    const offen = offeneGutschriften(werber, referrals, clients);
    expect(offen.map((g) => g.geworbenerName)).toEqual(['Anna', 'Ben']);
    expect(offen[0]).toMatchObject({ stufe: 'halb', betrag: 64.5 });
    expect(offen[1]).toMatchObject({ stufe: 'gratis', betrag: 129 });
  });

  it('lässt bereits gewährte Gutschriften weg', () => {
    // Sonst stünde derselbe Anspruch jeden Monat erneut in der Liste.
    const mitGewaehrt = referrals.map((r) =>
      r.id === 'r1' ? { ...r, gewaehrt: '2026-08-01' } : r,
    );
    expect(offeneGutschriften(werber, mitGewaehrt, clients).map((g) => g.geworbenerName)).toEqual([
      'Ben',
    ]);
  });

  it('übergeht eine Empfehlung, deren Geworbener nicht mehr existiert', () => {
    const verwaist: Referral[] = [{ id: 'r9', werberId: 'w', geworbenerId: 'weg' }];
    expect(offeneGutschriften(werber, verwaist, clients)).toEqual([]);
  });

  it('übergeht einen noch nicht eingelösten Code', () => {
    const nurCode: Referral[] = [{ id: 'r8', werberId: 'w', code: 'LENABE-0001' }];
    expect(offeneGutschriften(werber, nurCode, clients)).toEqual([]);
  });

  it('zählt fremde Empfehlungen nicht mit', () => {
    const fremd: Referral[] = [{ id: 'r7', werberId: 'jemand', geworbenerId: 'g2' }];
    expect(offeneGutschriften(werber, fremd, clients)).toEqual([]);
  });
});

describe('Empfehlungsstand', () => {
  const werber = mitMonaten('w', 2);

  it('fasst erfolgreiche Empfehlungen und offenen Betrag zusammen', () => {
    const clients = [werber, mitMonaten('g1', 4), mitMonaten('g2', 7), mitMonaten('g3', 1)];
    const referrals: Referral[] = [
      { id: 'r1', werberId: 'w', geworbenerId: 'g1', geworbenerName: 'Anna' },
      { id: 'r2', werberId: 'w', geworbenerId: 'g2', geworbenerName: 'Ben' },
      { id: 'r3', werberId: 'w', geworbenerId: 'g3', geworbenerName: 'Chris' },
    ];
    expect(empfehlungsStand(werber, referrals, clients)).toEqual({
      erfolgreiche: 2,
      gesamt: 3,
      offenerBetrag: 193.5,
      upgradeVerdient: false,
      bisUpgrade: 1,
    });
  });

  it('meldet das Premium-Upgrade ab drei erfolgreichen Empfehlungen', () => {
    const clients = [werber, mitMonaten('g1', 3), mitMonaten('g2', 3), mitMonaten('g3', 3)];
    const referrals: Referral[] = [
      { id: 'r1', werberId: 'w', geworbenerId: 'g1' },
      { id: 'r2', werberId: 'w', geworbenerId: 'g2' },
      { id: 'r3', werberId: 'w', geworbenerId: 'g3' },
    ];
    const stand = empfehlungsStand(werber, referrals, clients);
    expect(stand.erfolgreiche).toBe(UPGRADE_AB);
    expect(stand.upgradeVerdient).toBe(true);
    expect(stand.bisUpgrade).toBe(0);
  });

  it('ist bei einem Kunden ohne Empfehlungen leer, nicht fehlerhaft', () => {
    expect(empfehlungsStand(werber, [], [werber])).toEqual({
      erfolgreiche: 0,
      gesamt: 0,
      offenerBetrag: 0,
      upgradeVerdient: false,
      bisUpgrade: 3,
    });
  });
});
