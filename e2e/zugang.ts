import { expect, type Page } from '@playwright/test';

/**
 * Zugangsdaten des Testkontos.
 *
 * Sie stammen ausschließlich aus `.env.e2e` – einer Datei, die `.gitignore`
 * sperrt. Fehlen sie, überspringen die betroffenen Tests sich selbst, statt
 * fehlzuschlagen: Ein frisch geklontes Repository soll `npm run e2e` ohne
 * Einrichtung überstehen.
 */

export const TEST_EMAIL = process.env['E2E_EMAIL'] ?? '';
export const TEST_PASSWORT = process.env['E2E_PASSWORT'] ?? '';

export const hatZugang = TEST_EMAIL !== '' && TEST_PASSWORT !== '';

export const OHNE_ZUGANG =
  'Kein Testkonto hinterlegt. Lege .env.e2e mit E2E_EMAIL und E2E_PASSWORT an.';

/** Meldet sich an und wartet, bis der Kundenbereich steht. */
export async function anmelden(page: Page): Promise<void> {
  await page.goto('/');

  // Die Anmeldemaske erscheint erst, wenn Firebase geantwortet hat – vorher
  // steht bewusst der ruhige Startbildschirm.
  const email = page.getByLabel(/e-mail/i);
  await expect(email).toBeVisible({ timeout: 20_000 });

  await email.fill(TEST_EMAIL);
  await page.getByLabel(/passwort/i).fill(TEST_PASSWORT);
  await page.getByRole('button', { name: /anmelden/i }).click();
}

/** Schließt die Einführungstour, falls sie beim ersten Start erscheint. */
export async function tourWegklicken(page: Page): Promise<void> {
  const ueberspringen = page.getByRole('button', { name: /überspringen/i });
  if (await ueberspringen.isVisible().catch(() => false)) {
    await ueberspringen.click();
  }
}
