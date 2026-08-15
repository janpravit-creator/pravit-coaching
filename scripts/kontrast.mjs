/**
 * Prüft die Farbtoken gegen WCAG AA.
 *
 * Liest die Werte direkt aus `src/styles/theme.css`, damit der Bericht nicht
 * von einer zweiten, irgendwann veralteten Liste stammt. Geprüft werden die
 * Paare, die in der App wirklich vorkommen – Text auf seinem Grund, nicht
 * jede denkbare Kombination.
 *
 * Schwellen: 4.5:1 für Fließtext, 3:1 für große Schrift (ab 24px bzw. 19px
 * fett) und für Flächen, die nur Zustand anzeigen.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');

/** Liest einen `:root`-Block heraus (Hell = erster, Dunkel = `[data-theme='dark']`). */
function tokens(selektor) {
  const start = css.indexOf(selektor);
  if (start < 0) throw new Error(`Block ${selektor} nicht gefunden`);
  const block = css.slice(start, css.indexOf('}', start));
  const werte = {};
  for (const m of block.matchAll(/(--c-[\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) werte[m[1]] = m[2];
  return werte;
}

function rgb(hex) {
  const h = hex.replace('#', '');
  const voll = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(voll.slice(i, i + 2), 16));
}

/** Relative Luminanz nach WCAG 2.1. */
function luminanz(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a, b) {
  const [l1, l2] = [luminanz(a), luminanz(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Die Paare, die in der App tatsächlich aufeinandertreffen — nach Rolle
 * getrennt, weil die Schwelle von der Schriftgröße abhängt:
 *   4.5  kleine Schrift (alles unter 24px bzw. 19px fett)
 *   3    große Zahlen, Balken, Icons, Flächen
 */
const PAARE = [
  // Grundtext
  ['--c-text', '--c-page', 4.5, 'Haupttext auf Seitengrund'],
  ['--c-text', '--c-surface', 4.5, 'Haupttext auf Karte'],
  ['--c-text-muted', '--c-surface', 4.5, 'Sekundärtext auf Karte'],
  ['--c-text-muted', '--c-page', 4.5, 'Sekundärtext auf Seitengrund'],
  ['--c-text-subtle', '--c-surface', 3, 'Platzhalter auf Karte (leise Schrift)'],
  ['--c-action-text', '--c-action', 4.5, 'Beschriftung im Hauptknopf'],
  ['--c-text', '--c-surface-muted', 4.5, 'Text auf gedämpfter Fläche'],

  // Heller Markenton: große Zahlen, Balken, Icons
  ['--c-positive', '--c-surface', 3, 'Große Positivzahl auf Karte'],
  ['--c-negative', '--c-surface', 3, 'Große Negativzahl auf Karte'],
  ['--c-warning', '--c-surface', 3, 'Warnbalken auf Karte'],
  ['--c-info', '--c-surface', 3, 'Hinweisgrafik auf Karte'],
  // Gold liegt in beiden Themes bei 2.29:1 gegen Weiß und ist damit als
  // freistehende Grafik auf hellem Grund ungeeignet. Es wird deshalb nur als
  // gefüllte Fläche mit dunkler Schrift eingesetzt – geprüft wird das Paar,
  // das dabei wirklich entsteht, nicht die Fläche gegen die Karte.
  ['--c-brand-on', '--c-brand', 4.5, 'Schrift auf voller Goldfläche'],

  // Dunkler Ton: kleine Schrift, auch auf der getönten Pille
  ['--c-positive-strong', '--c-positive-soft', 4.5, 'Pillenschrift positiv'],
  ['--c-negative-strong', '--c-negative-soft', 4.5, 'Pillenschrift negativ'],
  ['--c-warning-strong', '--c-warning-soft', 4.5, 'Pillenschrift Warnung'],
  ['--c-info-strong', '--c-info-soft', 4.5, 'Pillenschrift Hinweis'],
  ['--c-brand-strong', '--c-brand-soft', 4.5, 'Pillenschrift Marke'],
  ['--c-positive-strong', '--c-surface', 4.5, 'Kleine Positivschrift auf Karte'],
  ['--c-negative-strong', '--c-surface', 4.5, 'Kleine Negativschrift auf Karte'],
  ['--c-warning-strong', '--c-surface', 4.5, 'Kleine Warnschrift auf Karte'],
  ['--c-info-strong', '--c-surface', 4.5, 'Kleine Hinweisschrift auf Karte'],
  ['--c-brand-strong', '--c-surface', 4.5, 'Kleine Goldschrift auf Karte'],

];

let fehler = 0;
for (const [name, selektor] of [['HELL', ':root {'], ['DUNKEL', ":root[data-theme='dark']"]]) {
  const t = tokens(selektor);
  console.log(`\n── ${name} ${'─'.repeat(56)}`);
  for (const [vorn, hinten, schwelle, was] of PAARE) {
    const a = t[vorn];
    const b = t[hinten];
    if (!a || !b) {
      console.log(`  ?  ${was}: Token fehlt (${!a ? vorn : hinten})`);
      fehler++;
      continue;
    }
    const c = kontrast(a, b);
    const ok = c >= schwelle;
    if (!ok) fehler++;
    console.log(
      `  ${ok ? '✓' : '✗'}  ${c.toFixed(2)}:1  (min ${schwelle})  ${was}  ${a} auf ${b}`,
    );
  }
}

console.log(
  fehler === 0
    ? '\nAlle geprüften Paare erfüllen WCAG AA.\n'
    : `\n${fehler} Paar(e) unter der Schwelle.\n`,
);
process.exit(fehler === 0 ? 0 : 1);
