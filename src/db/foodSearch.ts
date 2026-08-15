import type { Lebensmitteltreffer } from '@/domain/lebensmittel';
import { zahl } from '@/domain/nutrition';
import { listCustomFoods } from './repo/library';

/**
 * Lebensmittelsuche in drei Stufen.
 *
 * 1. **Eigene Datenbank** (Firestore `customFoods`) – zuerst und ohne Netz.
 *    Die verlässlichste Quelle, weil die Werte selbst hinterlegt wurden.
 * 2. **Open Food Facts** – offene Barcode-Datenbank für verpackte
 *    Markenprodukte. Zwei Endpunkte: erst der neue Such-Dienst, dann der
 *    ältere als Rückfall, weil der neue zeitweise nichts liefert.
 * 3. **USDA FoodData Central** – für frisches, unverpacktes Obst und Gemüse.
 *    Open Food Facts ist eine Barcode-Datenbank und hat dort oft gar nichts;
 *    USDA deckt das über „Foundation" und „SR Legacy" ab (generische
 *    Lebensmittel, keine Marken).
 *
 * Die Netzquellen ergänzen, sie ersetzen nicht: Eigene Treffer stehen immer
 * oben.
 */

/**
 * Der bestehende, kostenlose USDA-Schlüssel (1.000 Anfragen/Stunde).
 *
 * Steht bewusst im Quelltext: Er lag schon in der bisherigen ausgelieferten
 * App offen und ist ohne Kontingent für Fremde nur begrenzt brauchbar. Über
 * `VITE_USDA_API_KEY` lässt er sich ersetzen, ohne Code zu ändern.
 */
const USDA_KEY = import.meta.env['VITE_USDA_API_KEY'] ?? 'TRic3P5CEEtXt2YaEJLZHbAmfTVPXyfqE7Q4t3di';

export interface SuchErgebnis {
  treffer: Lebensmitteltreffer[];
  /** Gesetzt, wenn eine Netzquelle nicht erreichbar war – rein informativ. */
  hinweis?: string;
}

/* ------------------------------------------------------------------ *
 * Open Food Facts
 * ------------------------------------------------------------------ */

interface OffNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
}

interface OffProdukt {
  product_name?: string;
  productName?: string;
  brands?: string;
  nutriments?: OffNutriments;
  product?: OffProdukt;
}

/**
 * Holt die Produktliste aus einer Antwort.
 *
 * Die beiden Endpunkte antworten unterschiedlich: mal unter `hits`, mal unter
 * `products`, und manche Formen verpacken das Produkt noch einmal in
 * `product`. Deshalb wird alles der Reihe nach probiert.
 */
function leseOffProdukte(data: unknown): OffProdukt[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as { hits?: unknown; products?: unknown };
  const liste = Array.isArray(d.hits) ? d.hits : Array.isArray(d.products) ? d.products : [];
  return (liste as OffProdukt[])
    .map((p) => p?.product ?? p)
    .filter((p): p is OffProdukt => Boolean(p && (p.product_name || p.productName) && p.nutriments));
}

function offAlsTreffer(p: OffProdukt): Lebensmitteltreffer {
  const n = p.nutriments ?? {};
  return {
    name: p.product_name ?? p.productName ?? '',
    herkunft: (p.brands ?? '').split(',')[0]?.trim() || 'Open Food Facts',
    basis: '100g',
    kcal: zahl(n['energy-kcal_100g']),
    prot: zahl(n.proteins_100g),
    fat: zahl(n.fat_100g),
    carbs: zahl(n.carbohydrates_100g),
  };
}

/* ------------------------------------------------------------------ *
 * USDA FoodData Central
 * ------------------------------------------------------------------ */

interface UsdaFood {
  description?: string;
  dataType?: string;
  brandOwner?: string;
  foodNutrients?: Array<{ nutrientNumber?: string | number; value?: number }>;
}

/** Nährstoff-Nummern der USDA-Datenbank. */
const USDA_NUMMER = { kcal: '208', protein: '203', fett: '204', kohlenhydrate: '205' } as const;

function usdaAlsTreffer(f: UsdaFood): Lebensmitteltreffer {
  const wert = (nummer: string) =>
    zahl(f.foodNutrients?.find((n) => String(n.nutrientNumber) === nummer)?.value);

  const generisch = f.dataType === 'Foundation' || f.dataType === 'SR Legacy';

  return {
    name: f.description ?? '',
    herkunft: generisch ? 'USDA · frisch/generisch' : (f.brandOwner ?? 'USDA'),
    basis: '100g',
    kcal: wert(USDA_NUMMER.kcal),
    prot: wert(USDA_NUMMER.protein),
    fat: wert(USDA_NUMMER.fett),
    carbs: wert(USDA_NUMMER.kohlenhydrate),
  };
}

/* ------------------------------------------------------------------ *
 * Die Suche
 * ------------------------------------------------------------------ */

async function holeJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const antwort = await fetch(url, { signal });
  if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
  return antwort.json();
}

export async function sucheLebensmittel(
  frage: string,
  signal?: AbortSignal,
): Promise<SuchErgebnis> {
  const q = frage.trim();
  if (!q) return { treffer: [] };

  const treffer: Lebensmitteltreffer[] = [];
  let hinweis: string | undefined;

  // 1. Eigene Datenbank – ohne Netz, deshalb zuerst und ohne Fehlerrisiko.
  try {
    const eigene = await listCustomFoods();
    const klein = q.toLowerCase();
    for (const f of eigene) {
      if (!f.name.toLowerCase().includes(klein)) continue;
      treffer.push({
        name: f.name,
        herkunft: 'Eigene Datenbank',
        basis: f.basis === 'stueck' ? 'stueck' : '100g',
        kcal: zahl(f.kcal),
        prot: zahl(f.protein),
        fat: zahl(f.fat),
        carbs: zahl(f.carbs),
      });
    }
  } catch {
    // Ohne Anmeldung oder ohne Netz gibt es hier nichts – die Netzquellen
    // unten können trotzdem etwas finden.
  }

  // 2. Open Food Facts, zwei Endpunkte nacheinander.
  const offUrls = [
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=15&langs=de,en`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,nutriments`,
  ];

  let ausDemNetz: Lebensmitteltreffer[] = [];

  for (const url of offUrls) {
    try {
      const produkte = leseOffProdukte(await holeJson(url, signal));
      ausDemNetz = produkte.map(offAlsTreffer).filter((t) => t.name && t.kcal > 0);
      if (ausDemNetz.length) break;
    } catch (e) {
      if (signal?.aborted) throw e;
      hinweis = e instanceof Error ? e.message : 'Open Food Facts nicht erreichbar';
    }
  }

  // 3. USDA nur, wenn Open Food Facts nichts hatte – bei frischem Obst und
  //    Gemüse ist genau das der Normalfall.
  if (ausDemNetz.length === 0) {
    try {
      const url =
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}` +
        `&pageSize=15&dataType=Foundation,SR%20Legacy&api_key=${USDA_KEY}`;
      const data = (await holeJson(url, signal)) as { foods?: UsdaFood[] };
      ausDemNetz = (data.foods ?? []).map(usdaAlsTreffer).filter((t) => t.name && t.kcal > 0);
      if (ausDemNetz.length) hinweis = undefined;
    } catch (e) {
      if (signal?.aborted) throw e;
      hinweis = e instanceof Error ? `USDA: ${e.message}` : 'USDA nicht erreichbar';
    }
  }

  treffer.push(...ausDemNetz);

  return hinweis ? { treffer, hinweis } : { treffer };
}
