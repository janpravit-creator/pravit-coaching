import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomFood } from './types';

/**
 * Die drei Stufen der Lebensmittelsuche – ohne Netz geprüft.
 *
 * Der Container, in dem diese App gebaut wird, kommt weder an Open Food Facts
 * noch an USDA heran. Geprüft wird deshalb genau das, was ohne die echten
 * Dienste prüfbar ist und am ehesten falsch sein kann: die Reihenfolge der
 * Quellen und das Lesen der beiden Antwortformen. Die Adressen selbst sind
 * unverändert aus der bisherigen App übernommen.
 */

const eigene = vi.hoisted(() => ({ liste: [] as CustomFood[], fehler: null as Error | null }));

vi.mock('./repo/library', () => ({
  listCustomFoods: async () => {
    if (eigene.fehler) throw eigene.fehler;
    return eigene.liste;
  },
}));

const { sucheLebensmittel } = await import('./foodSearch');

/** Antwort des neuen Such-Dienstes: Produkte stehen unter `hits`. */
const neuerDienst = {
  hits: [
    {
      product_name: 'Zarte Haferflocken',
      brands: 'Kölln, Kölln GmbH',
      nutriments: {
        'energy-kcal_100g': 370,
        proteins_100g: 13.5,
        fat_100g: 7,
        carbohydrates_100g: 58.7,
      },
    },
  ],
};

/** Antwort des alten Dienstes: Produkte stehen unter `products`. */
const alterDienst = {
  products: [
    {
      product_name: 'Haferflocken kernig',
      brands: 'Alnatura',
      nutriments: { 'energy-kcal_100g': 372, proteins_100g: 13, fat_100g: 7.5, carbohydrates_100g: 59 },
    },
  ],
};

const usdaAntwort = {
  foods: [
    {
      description: 'Bananas, raw',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientNumber: '208', value: 89 },
        { nutrientNumber: '203', value: 1.09 },
        { nutrientNumber: '204', value: 0.33 },
        { nutrientNumber: '205', value: 22.8 },
      ],
    },
  ],
};

/** Beantwortet Adressen nach Muster; alles Unbekannte scheitert. */
function antworteMit(regeln: Array<[string, unknown | Error]>) {
  const gerufen: string[] = [];
  const fetchMock = vi.fn(async (url: string) => {
    gerufen.push(url);
    const treffer = regeln.find(([muster]) => url.includes(muster));
    if (!treffer) throw new Error('nicht erreichbar');
    const [, wert] = treffer;
    if (wert instanceof Error) throw wert;
    return { ok: true, status: 200, json: async () => wert } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return gerufen;
}

beforeEach(() => {
  eigene.liste = [];
  eigene.fehler = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Lebensmittelsuche über drei Quellen', () => {
  it('gibt leer zurück und fragt niemanden, wenn nichts eingetippt ist', async () => {
    const gerufen = antworteMit([]);
    expect((await sucheLebensmittel('   ')).treffer).toEqual([]);
    expect(gerufen).toHaveLength(0);
  });

  it('stellt eigene Treffer vor die aus dem Netz', async () => {
    eigene.liste = [
      { id: 'a', name: 'Mein Haferbrei', basis: '100g', kcal: 350, protein: 12, fat: 6, carbs: 55 },
      { id: 'b', name: 'Reis', kcal: 130 },
    ];
    antworteMit([['search.openfoodfacts.org', neuerDienst]]);

    const { treffer } = await sucheLebensmittel('hafer');
    // „Reis" passt nicht zur Suche und darf nicht mitkommen.
    expect(treffer.map((t) => t.name)).toEqual(['Mein Haferbrei', 'Zarte Haferflocken']);
    expect(treffer[0]?.herkunft).toBe('Eigene Datenbank');
    expect(treffer[0]).toMatchObject({ kcal: 350, prot: 12, fat: 6, carbs: 55 });
  });

  it('liest die Marke als Herkunft – nur die erste', async () => {
    antworteMit([['search.openfoodfacts.org', neuerDienst]]);
    const { treffer } = await sucheLebensmittel('hafer');
    expect(treffer[0]?.herkunft).toBe('Kölln');
    expect(treffer[0]).toMatchObject({ kcal: 370, prot: 13.5, fat: 7, carbs: 58.7 });
  });

  it('weicht auf den alten Dienst aus, wenn der neue scheitert', async () => {
    const gerufen = antworteMit([
      ['search.openfoodfacts.org', new Error('HTTP 502')],
      ['world.openfoodfacts.org', alterDienst],
    ]);

    const { treffer } = await sucheLebensmittel('hafer');
    expect(treffer.map((t) => t.name)).toEqual(['Haferflocken kernig']);
    expect(gerufen).toHaveLength(2);
  });

  it('weicht auch aus, wenn der neue Dienst nur nichts findet', async () => {
    // Kein Fehler, bloß eine leere Liste – der Grund, warum es zwei Adressen
    // gibt. Ohne diesen Fall bliebe die Suche stumm, obwohl es Treffer gäbe.
    const gerufen = antworteMit([
      ['search.openfoodfacts.org', { hits: [] }],
      ['world.openfoodfacts.org', alterDienst],
    ]);

    expect((await sucheLebensmittel('hafer')).treffer).toHaveLength(1);
    expect(gerufen).toHaveLength(2);
  });

  it('fragt USDA erst, wenn Open Food Facts nichts hat', async () => {
    const gerufen = antworteMit([['search.openfoodfacts.org', neuerDienst]]);
    await sucheLebensmittel('hafer');
    expect(gerufen.some((u) => u.includes('api.nal.usda.gov'))).toBe(false);
  });

  it('holt frisches Obst bei USDA, wo Open Food Facts leer bleibt', async () => {
    // Genau der Fall, für den die dritte Stufe da ist: Open Food Facts ist
    // eine Barcode-Datenbank und kennt eine rohe Banane nicht.
    antworteMit([
      ['search.openfoodfacts.org', { hits: [] }],
      ['world.openfoodfacts.org', { products: [] }],
      ['api.nal.usda.gov', usdaAntwort],
    ]);

    const { treffer, hinweis } = await sucheLebensmittel('banane');
    expect(treffer).toHaveLength(1);
    expect(treffer[0]).toMatchObject({
      name: 'Bananas, raw',
      herkunft: 'USDA · frisch/generisch',
      basis: '100g',
      kcal: 89,
      prot: 1.09,
      carbs: 22.8,
    });
    expect(hinweis).toBeUndefined();
  });

  it('lässt Produkte ohne Namen oder ohne Kalorien weg', async () => {
    antworteMit([
      [
        'search.openfoodfacts.org',
        {
          hits: [
            { brands: 'X', nutriments: { 'energy-kcal_100g': 100 } },
            { product_name: 'Ohne Werte' },
            { product_name: 'Null Kalorien', nutriments: { 'energy-kcal_100g': 0 } },
            neuerDienst.hits[0],
          ],
        },
      ],
      ['world.openfoodfacts.org', { products: [] }],
      ['api.nal.usda.gov', { foods: [] }],
    ]);

    const { treffer } = await sucheLebensmittel('hafer');
    expect(treffer.map((t) => t.name)).toEqual(['Zarte Haferflocken']);
  });

  it('packt ein doppelt verschachteltes Produkt aus', async () => {
    antworteMit([['search.openfoodfacts.org', { hits: [{ product: neuerDienst.hits[0] }] }]]);
    expect((await sucheLebensmittel('hafer')).treffer[0]?.name).toBe('Zarte Haferflocken');
  });

  it('meldet einen Hinweis, wenn keine Netzquelle erreichbar ist – behält aber die eigenen Treffer', async () => {
    eigene.liste = [{ id: 'a', name: 'Mein Haferbrei', kcal: 350 }];
    antworteMit([]);

    const { treffer, hinweis } = await sucheLebensmittel('hafer');
    expect(treffer.map((t) => t.name)).toEqual(['Mein Haferbrei']);
    expect(hinweis).toBeTruthy();
  });

  it('sucht im Netz weiter, wenn die eigene Datenbank nicht antwortet', async () => {
    // Ohne Anmeldung wirft Firestore – das darf die Suche nicht anhalten.
    eigene.fehler = new Error('permission-denied');
    antworteMit([['search.openfoodfacts.org', neuerDienst]]);

    expect((await sucheLebensmittel('hafer')).treffer).toHaveLength(1);
  });

  it('reicht einen Abbruch durch, statt ihn als Fehler zu behandeln', async () => {
    // Bei jedem Tastendruck wird die vorige Suche abgebrochen. Würde der
    // Abbruch als „nicht erreichbar" durchgehen, stünde ständig ein Hinweis da.
    const abbruch = new DOMException('Aborted', 'AbortError');
    antworteMit([['search.openfoodfacts.org', abbruch]]);
    const controller = new AbortController();
    controller.abort();

    await expect(sucheLebensmittel('hafer', controller.signal)).rejects.toThrow();
  });
});
