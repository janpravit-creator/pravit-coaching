import { expect, test } from '@playwright/test';

/**
 * Was ohne Anmeldung prüfbar ist.
 *
 * Diese Tests brauchen kein Testkonto und laufen deshalb immer – auch in einem
 * frisch geklonten Repository.
 */

test('die Anmeldemaske erscheint, statt in einer leeren Seite zu enden', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel(/e-mail/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel(/passwort/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible();
});

test('falsche Zugangsdaten ergeben einen verständlichen Satz, keinen Fehlercode', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel(/e-mail/i).fill('niemand@example.invalid');
  await page.getByLabel(/passwort/i).fill('definitiv-falsch');
  await page.getByRole('button', { name: /anmelden/i }).click();

  // „auth/invalid-credential" hilft niemandem weiter – erwartet wird der
  // übersetzte Satz aus anmeldeFehlerText().
  const meldung = page.getByText(/stimmen nicht|nicht richtig|keine verbindung/i);
  await expect(meldung).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/auth\//)).toHaveCount(0);
});

test('eine Unterseite lässt sich direkt aufrufen, ohne im Nichts zu landen', async ({ page }) => {
  // Prüft die SPA-Weiterleitung aus netlify.toml bzw. _redirects: Ohne sie
  // liefert der Server für /coach/kunden einen 404.
  const antwort = await page.goto('/coach/kunden');

  expect(antwort?.status()).toBe(200);
  await expect(page.getByLabel(/e-mail/i)).toBeVisible({ timeout: 20_000 });
});

test('der Registrierungs-Fragebogen führt Schritt für Schritt und prüft die Eingaben', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel(/e-mail/i)).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /konto anlegen/i }).click();
  await expect(page).toHaveURL(/\/registrieren$/);
  await expect(page.getByRole('heading', { name: 'Konto anlegen' })).toBeVisible();

  // Leer weitergehen darf nicht durchrutschen – die Prüfung sitzt je Schritt.
  await page.getByRole('button', { name: /^weiter$/i }).click();
  await expect(page.getByText(/bitte e-mail und passwort eingeben/i)).toBeVisible();

  // Ein zu kurzes Passwort wird ebenfalls abgefangen, und zwar bevor Firebase
  // gefragt wird.
  await page.getByLabel(/e-mail/i).fill('test-e2e@example.invalid');
  await page.getByLabel(/passwort/i).fill('kurz');
  await page.getByRole('button', { name: /^weiter$/i }).click();
  await expect(page.getByText(/mindestens sechs zeichen/i)).toBeVisible();

  // Mit gültigen Angaben geht es in den zweiten Schritt.
  await page.getByLabel(/passwort/i).fill('langgenug123');
  await page.getByRole('button', { name: /^weiter$/i }).click();
  await expect(page.getByRole('heading', { name: 'Über dich' })).toBeVisible();

  // Hier wird bewusst abgebrochen: Ein echtes Konto soll der Test nicht anlegen.
});

test('der Dunkelmodus färbt die Seite wirklich um', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/e-mail/i)).toBeVisible({ timeout: 20_000 });

  const hell = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => {
    document.documentElement.dataset['theme'] = 'dark';
  });

  const dunkel = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(dunkel).not.toBe(hell);
});
