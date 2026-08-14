// Rasterisiert die Icon-SVGs mit dem vorinstallierten Chromium.
// Aufruf: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url));

/**
 * Eine Hantel mit gestaffelten Scheiben: pro Seite eine kleine Scheibe außen
 * und eine große innen, beide vollständig getrennt statt überlappend – zwei
 * unterschiedlich große, sich nur teilweise überlappende Formen erzeugen an
 * der Nahtstelle eine kleine Stufe/Ecke statt einer glatten Kontur. Getrennte
 * Scheiben vermeiden das und sehen nebenbei realistischer aus. Passt zu einer
 * Coaching-App, ohne wie das Logbuch-Icon (dort: drei aufsteigende Balken)
 * auszusehen – beide Apps landen auf demselben Home-Bildschirm und sollen
 * sich klar unterscheiden. Dieselben Formen stecken auch in
 * `src/components/AppMark.tsx`, die denselben Zug im Startbild und in der
 * Anmeldemaske der App selbst zeigt – ändert sich die Form hier, muss sie
 * dort von Hand mitgezogen werden.
 */
const motiv = `
  <rect x="112" y="242" width="288" height="28" rx="14" fill="#FFFFFF"/>
  <rect x="100" y="166" width="44" height="180" rx="20" fill="#FFFFFF"/>
  <rect x="52" y="206" width="40" height="100" rx="20" fill="#FFFFFF"/>
  <rect x="368" y="166" width="44" height="180" rx="20" fill="#FFFFFF"/>
  <rect x="420" y="206" width="40" height="100" rx="20" fill="#FFFFFF"/>`;

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
