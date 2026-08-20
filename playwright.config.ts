import { defineConfig, devices } from '@playwright/test';
import { config as ladeEnv } from 'dotenv';

/**
 * End-to-End-Tests gegen den **gebauten** Stand.
 *
 * Bewusst gegen `npm run preview` statt gegen den Entwicklungsserver: geprüft
 * werden soll genau das Bündel, das später bei Netlify landet – mit denselben
 * aufgeteilten Dateien und derselben Firebase-Konfiguration.
 *
 * Die Zugangsdaten des Testkontos stehen ausschließlich in `.env.e2e`. Diese
 * Datei ist in `.gitignore` gesperrt und wird nie eingecheckt.
 */
ladeEnv({ path: '.env.e2e', quiet: true });

const PORT = 4174;

/**
 * Der Container bringt Chromium mit; heruntergeladen wird nichts.
 *
 * Die Version im Bild passt nicht immer zu der, die das gerade installierte
 * Playwright erwartet – dann sucht es eine „headless shell", die es hier nicht
 * gibt, und bricht mit „run npx playwright install" ab. Der ausdrückliche Pfad
 * umgeht das. `CHROMIUM_PATH` überschreibt ihn auf anderen Rechnern.
 */
const CHROMIUM =
  process.env['CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // Nacheinander: Die Tests schreiben in dasselbe Firebase-Konto; parallele
  // Läufe würden sich gegenseitig die Daten unter den Füßen wegziehen.
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },

  projects: [
    {
      name: 'handy',
      use: {
        ...devices['Desktop Chrome'],
        // Kein `devices['iPhone 13']`: das verlangt WebKit, das im Container
        // nicht installiert ist. Die Maße reichen, um das Handy-Layout zu
        // prüfen – darum geht es hier.
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        launchOptions: {
          executablePath: CHROMIUM,
          // Ohne --no-sandbox startet Chromium als root nicht.
          args: ['--no-sandbox'],
        },
      },
    },
  ],

  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
