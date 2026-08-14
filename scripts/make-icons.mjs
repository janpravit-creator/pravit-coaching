// Rasterisiert die Icon-SVGs mit dem vorinstallierten Chromium.
// Aufruf: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url));

/**
 * Ein geometrisches „P" – Stamm plus Ring, aus drei einfachen Formen gebaut
 * statt aus einem echten Schriftzeichen. Ein Textglyph würde beim Rastern in
 * mehreren Größen (60 px bis 512 px) je nach Schriftrendering unterschiedlich
 * scharf oder unterschiedlich dick wirken; feste Formen bleiben in jeder
 * Größe exakt gleich. Durchgehend abgerundete Ecken, dieselbe Formsprache
 * wie der Rest der App. Reines Weiß auf Schwarz, kein Farbakzent – bewusst
 * anders als das Logbuch-Icon (dort: drei Balken), damit beide Apps auf
 * demselben Home-Bildschirm klar auseinanderzuhalten sind.
 */
const motiv = `
  <rect x="156" y="120" width="80" height="272" rx="40" fill="#FFFFFF"/>
  <rect x="156" y="120" width="200" height="168" rx="84" fill="#FFFFFF"/>
  <rect x="236" y="164" width="76" height="80" rx="38" fill="#000000"/>`;

/** Normales Icon: randlos, volle Fläche. */
const icon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#000000"/>
  ${motiv}
</svg>`;

/** Maskable: Motiv auf ~62 % geschrumpft, damit es jeder Zuschnitt überlebt. */
const maskable = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <g transform="translate(256 256) scale(0.62) translate(-256 -256)">${motiv}</g>
</svg>`;

const targets = [
  ['icon-192.png', icon, 192],
  ['icon-512.png', icon, 512],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', icon, 180],
];

await mkdir(outDir, { recursive: true });

// Der Container liefert Chromium vorinstalliert mit; nichts nachladen.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();

for (const [name, build, size] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${build(size)}</body>`, {
    waitUntil: 'load',
  });
  const buf = await page.screenshot({ omitBackground: true });
  await writeFile(new URL(name, `file://${outDir}`), buf);
  console.log(`✓ ${name} (${size}×${size})`);
}

await browser.close();
