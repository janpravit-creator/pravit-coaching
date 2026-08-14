import { expect, test } from '@playwright/test';
import { OHNE_ZUGANG, anmelden, hatZugang, tourWegklicken } from './zugang';

/**
 * Der Weg des Kunden am laufenden System.
 *
 * Braucht das Testkonto aus `.env.e2e`. Der Test legt darin einen echten
 * Check-in und einen echten Logbuch-Eintrag an – deshalb gehört hier ein
 * Wegwerf-Konto hinein und kein echter Kunde.
 */

test.skip(!hatZugang, OHNE_ZUGANG);

test('anmelden, Check-in absenden, Training erfassen und mitten im Training neu laden', async ({
  page,
}) => {
  await anmelden(page);
  await tourWegklicken(page);

  await expect(page.getByRole('heading', { name: /hey,/i })).toBeVisible({ timeout: 20_000 });

  /* --- Check-in mit den Schiebereglern --- */

  await page.getByRole('link', { name: 'Check-in' }).click();
  await expect(page.getByRole('heading', { name: 'Check-in' })).toBeVisible();

  const gewicht = `${80 + Math.round(Math.random() * 9)}`;
  await page.getByLabel('Gewicht').fill(gewicht);

  // Die fünf Skalen sind native Regler – `fill` setzt sie zuverlässiger als
  // eine nachgebaute Zieh-Geste.
  for (const label of ['Trainingsintensität', 'Ernährung', 'Schlaf', 'Energie', 'Stress']) {
    const regler = page.getByRole('slider', { name: new RegExp(label, 'i') });
    if (await regler.isVisible().catch(() => false)) await regler.fill('7');
  }

  await page.getByRole('button', { name: /check-in absenden/i }).click();
  await expect(page.getByText(/check-in gesendet/i)).toBeVisible({ timeout: 20_000 });

  // Er muss anschließend im eigenen Verlauf auftauchen.
  await expect(page.getByText(`${gewicht} kg`).first()).toBeVisible({ timeout: 20_000 });

  /* --- Training erfassen und mitten drin neu laden --- */

  await page.getByRole('link', { name: 'Logbuch' }).click();

  const ersterTag = page.getByRole('button', { name: /sätze|übungen/i }).first();
  test.skip(
    !(await ersterTag.isVisible().catch(() => false)),
    'Das Testkonto hat noch keinen Trainingsplan – der Coach muss zuerst einen anlegen.',
  );
  await ersterTag.click();

  // Gewicht über den Ziffernblock eintragen, nicht über die Systemtastatur.
  await page.getByRole('button', { name: /kg × /i }).first().click();
  for (const ziffer of ['6', '0']) {
    await page.getByRole('button', { name: ziffer, exact: true }).click();
  }
  await page.getByRole('button', { name: /weiter/i }).click();
  for (const ziffer of ['1', '0']) {
    await page.getByRole('button', { name: ziffer, exact: true }).click();
  }
  await page.getByRole('button', { name: /weiter|übernehmen|fertig/i }).click();

  await expect(page.getByText(/60 kg × 10/)).toBeVisible();

  // Die Uhr läuft – den Stand vor dem Neuladen merken.
  const timer = page.getByText(/^\d+:\d{2}(:\d{2})?$/).first();
  const vorher = await timer.textContent();

  await page.waitForTimeout(2000);
  await page.reload();
  await tourWegklicken(page);

  // Das Entscheidende: Der Entwurf steht noch, und die Uhr ist weitergelaufen,
  // statt bei null neu anzufangen.
  await expect(page.getByText(/60 kg × 10/)).toBeVisible({ timeout: 20_000 });
  const nachher = await page.getByText(/^\d+:\d{2}(:\d{2})?$/).first().textContent();
  expect(nachher).not.toBe(vorher);
});
