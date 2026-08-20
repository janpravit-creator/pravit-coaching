/**
 * Inhalte des Gym-Wikis.
 *
 * Vorher lagen sie als HTML-Zeichenketten im Skript und wurden per
 * `innerHTML` eingesetzt – mit eigenen Klassen, eigenen Abständen und
 * fest eingebautem Rot. Hier stehen sie als Daten; wie sie aussehen,
 * entscheidet die Seite. Der Wortlaut ist unverändert übernommen.
 */

export interface WikiZeile {
  begriff: string;
  wert: string;
  /** Nur bei den Supplement-Empfehlungen belegt. */
  url?: string;
}

export interface WikiAbschnitt {
  titel: string;
  zeilen?: WikiZeile[];
  punkte?: string[];
}

export interface WikiKapitel {
  titel: string;
  /** Hervorgehobener Hinweis über den Abschnitten. */
  banner?: { links: string; rechts: string };
  abschnitte: WikiAbschnitt[];
}

export const WIKI_KAPITEL: WikiKapitel[] = [
  {
    titel: 'Training',
    abschnitte: [
      {
        titel: 'Volumen',
        zeilen: [
          { begriff: 'Wiederholungen', wert: '5–30 Reps · Effektivster Bereich 6–10' },
          { begriff: 'Sätze/Einheit', wert: '12–18 Sätze' },
          { begriff: '2 Tage Pause', wert: '1–2 direkte Arbeitssätze' },
          { begriff: '3 Tage Pause', wert: '1–5 direkte Arbeitssätze' },
          { begriff: '4 Tage Pause', wert: '1–7 direkte Arbeitssätze' },
        ],
      },
      {
        titel: 'Ausführung',
        punkte: [
          'Kontrollierte exzentrische Phase',
          'Explosive konzentrische Phase',
          'Jede Wiederholung mit vollem ROM',
          '1–0 RIR bei gleicher Ausführung',
          'Pausen Bilateral: 2–5 Min · Unilateral: 1–3 Min',
        ],
      },
      {
        titel: 'Stretch-Mediated Hypertrophy',
        zeilen: [
          { begriff: 'Reagiert gut', wert: 'Brust · Quads · Glutes · Hamstrings · Waden · Bizeps' },
          { begriff: 'Reagiert nicht', wert: 'Lat · Trapez · Hintere Schulter · Brachialis · Trizeps' },
        ],
      },
    ],
  },
  {
    titel: 'Ernährung',
    abschnitte: [
      {
        titel: 'Meal Timing',
        zeilen: [
          { begriff: 'Frequenz', wert: 'Alle 2–4 Stunden · mind. 4 Protein-Spikes · 3–6 Mahlzeiten' },
          { begriff: 'Pre-Workout', wert: 'Carbs + Protein · 60 % der täglichen Carbs' },
          { begriff: 'Post-Workout', wert: 'Carbs + Protein + Gemüse · 40 % der täglichen Carbs' },
        ],
      },
      {
        titel: 'Makros',
        zeilen: [
          { begriff: 'Protein', wert: '2,5–3 g/kg · 0,4–0,55 g/kg pro Mahlzeit' },
          { begriff: 'Fette Männer', wert: 'min. 0,6 g/kg' },
          { begriff: 'Fette Frauen', wert: 'min. 1 g/kg' },
          { begriff: 'Wasser', wert: '1 l pro 20 kg · 2–4 l aktiver Alltag' },
        ],
      },
    ],
  },
  {
    titel: 'Supplements',
    banner: { links: '2,61 € täglich', rechts: '78,30 € monatlich' },
    abschnitte: [
      {
        titel: 'Meine Empfehlungen',
        zeilen: [
          {
            begriff: 'Magnesium Bisglycinat',
            wert: '2 Kapseln täglich · 17,90 €/120 Kapseln · Gigas Nutrition',
            url: 'https://gigasnutrition.com/products/magnesium-bisglycinat-gods-rage',
          },
          {
            begriff: 'Omega 3 Triglyceride',
            wert: '4 Kapseln täglich · 44,90 €/300 Kapseln · Gigas Nutrition',
            url: 'https://gigasnutrition.com/products/omega-3-triglyceride-300-softgels',
          },
          {
            begriff: 'Vitamin D3 / K2',
            wert: '1 Kapsel jeden 2. Tag · 20,90 €/90 Kapseln · Gigas Nutrition',
            url: 'https://gigasnutrition.com/products/helios-vitamins-d3-k2-spartan-rage-gods-rage',
          },
          {
            begriff: 'Flavor Powder',
            wert: '3 g täglich · 9,52 €/130 g · ESN',
            url: 'https://www.esn.com/products/designer-flavor-powder',
          },
          {
            begriff: 'Maltodextrin',
            wert: '40 g an 2–3 Tagen/Woche · 24,99 €/5 kg · Bulk',
            url: 'https://www.bulk.com/de/products/maltodextrin-de/bpb-malt-0000',
          },
          {
            begriff: 'Whey Protein',
            wert: '30 g täglich · 38,90 €/kg · Gigas Nutrition',
            url: 'https://gigasnutrition.com/products/100-dairy-whey-1000g-gn',
          },
          {
            begriff: 'Kreatin Monohydrat',
            wert: '5 g täglich · 14,29 €/kg · The Protein Works',
            url: 'https://de.theproteinworks.com/creatine-monohydrate',
          },
        ],
      },
      {
        titel: 'Dosierungshinweise',
        zeilen: [
          { begriff: 'Vitamin D3 + K2', wert: '4000 IE D3 + 100–200 mcg K2 · immer mit fettiger Mahlzeit' },
          { begriff: 'Omega 3', wert: '2000 EPA + 1000 DHA · mit fettiger Mahlzeit' },
          { begriff: 'Magnesium', wert: 'Bisglycinat 200 mg · besser verträglich als andere Formen' },
          { begriff: 'Kreatin', wert: '1 g pro 10 kg Körpergewicht täglich · kein Laden nötig' },
          { begriff: 'Maltodextrin', wert: '30–50 g Pre/Intra Workout · schnelle Energie' },
        ],
      },
    ],
  },
  {
    titel: 'Regeneration',
    abschnitte: [
      {
        titel: 'Erholung',
        zeilen: [
          { begriff: 'Schlaf', wert: '6–9 Stunden pro Nacht' },
          { begriff: 'Schritte', wert: '10.000 Schritte täglich' },
          { begriff: 'Muskelaufbau', wert: 'Muskelsynthese aktiv 48 h nach Training' },
        ],
      },
      {
        titel: 'Pre-Workout Fehler',
        punkte: [
          'Keine / zu wenig Carbs',
          'Fette zu kurz vor Training',
          'Verdauung nicht abgeschlossen',
          'Zu wenig Elektrolyte',
          'Bei Schlafmangel trainieren',
        ],
      },
    ],
  },
  {
    titel: 'Phasen',
    abschnitte: [
      {
        titel: 'Aufbau',
        zeilen: [
          { begriff: 'Dauer', wert: '20–24 Wochen' },
          { begriff: 'Ziel', wert: '1–2 % Körpergewicht Zunahme pro Monat' },
        ],
      },
      {
        titel: 'Diät',
        zeilen: [
          { begriff: 'Dauer', wert: '8–12 Wochen' },
          { begriff: 'Männer KFA', wert: 'von 20 % auf 10 %' },
          { begriff: 'Frauen KFA', wert: 'von 28 % auf 18 %' },
        ],
      },
      {
        titel: 'Reverse Diet',
        zeilen: [
          { begriff: 'Dauer', wert: '4–12 Wochen nach der Diät' },
          { begriff: 'Steigerung', wert: '50–300 kcal pro Woche erhöhen' },
        ],
      },
    ],
  },
];
