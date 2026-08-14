// Rasterisiert die Icon-SVGs mit dem vorinstallierten Chromium.
// Aufruf: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url));

/**
 * Das Zeichen ist ein „P" aus drei aufsteigenden Balken – dieselbe Formsprache
 * wie in der App. Bewusst schwarz-weiß statt im alten Stempel-Rot: Die
 * Oberfläche trägt dieses Rot nicht mehr, und ein Icon, das anders aussieht
 * als die App dahinter, wirkt wie eine Fremdanwendung.
 */
const motiv = `
  <rect x="118" y="300" width="68" height="104" rx="26" fill="#FFFFFF" opacity="0.55"/>
  <rect x="222" y="238" width="68" height="166" rx="26" fill="#FFFFFF" opacity="0.8"/>
  <rect x="326" y="140" width="68" height="264" rx="26" fill="#34B857"/>`;

/** Normales Icon: randlos, volle Fläche. */
const icon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0A0A0A"/>
  ${motiv}
</svg>`;

/** Maskable: Motiv auf ~62 % geschrumpft, damit es jeder Zuschnitt überlebt. */
const maskable = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0A0A0A"/>
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
