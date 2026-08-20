import { expect, test } from '@playwright/test';
import { OHNE_ZUGANG, TEST_EMAIL, anmelden, hatZugang } from './zugang';

/**
 * Die Abnahme des gemeldeten Fehlers am laufenden System.
 *
 * Bisher galt: „Als gesehen markieren" schrieb `seenByCoach`, die To-Do-Liste
 * fragte aber `coachFeedback` ab – die Meldung blieb also stehen, obwohl der
 * Check-in aus der Liste verschwunden war. Dieser Test hält fest, dass ein
 * abgehakter Check-in verschwindet **und** nach dem Neuladen verschwunden
 * bleibt.
 *
 * Läuft nur, wenn der Build mit `VITE_COACH_EMAIL=<Testkonto>` erzeugt wurde.
 * Dann sieht derselbe Testzugang den Coach-Arbeitsplatz – ein echtes
 * Coach-Passwort ist dafür nirgends nötig.
 */

test.skip(!hatZugang, OHNE_ZUGANG);

test('ein abgehakter Check-in verschwindet aus den To-Dos und bleibt weg', async ({ page }) => {
  await anmelden(page);

  const kundenListe = page.getByRole('heading', { name: 'Kunden' });
  test.skip(
    !(await kundenListe.isVisible({ timeout: 20_000 }).catch(() => false)),
    `Der Testzugang sieht den Kundenbereich, nicht den Coach-Arbeitsplatz. Für diesen Test mit VITE_COACH_EMAIL=${TEST_EMAIL} bauen.`,
  );

  /* --- Offenen Check-in finden --- */

  await page.getByRole('link', { name: 'Mehr' }).click();
  await page.getByRole('button', { name: /to-dos/i }).click();
  await expect(page.getByRole('heading', { name: 'To-Dos' })).toBeVisible();

  const wartet = page.getByText(/wartet auf antwort/i).first();
  test.skip(
    !(await wartet.isVisible({ timeout: 15_000 }).catch(() => false)),
    'Gerade wartet kein Check-in auf Antwort – erst kunde.spec.ts laufen lassen.',
  );

  const vorher = await page.getByText(/wartet auf antwort/i).count();

  /* --- Abhaken, ohne Feedback zu schreiben --- */

  await wartet.click();
  await page.getByRole('button', { name: /^abhaken$/i }).click();
  await expect(page.getByText(/abgehakt/i)).toBeVisible({ timeout: 20_000 });

  // Genau hier ging es vorher schief: Die Meldung blieb stehen.
  await expect(page.getByText(/wartet auf antwort/i)).toHaveCount(vorher - 1, {
    timeout: 20_000,
  });

  /* --- Und nach dem Neuladen immer noch weg --- */

  await page.reload();
  await page.getByRole('link', { name: 'Mehr' }).click();
  await page.getByRole('button', { name: /to-dos/i }).click();

  await expect(page.getByText(/wartet auf antwort/i)).toHaveCount(vorher - 1, {
    timeout: 20_000,
  });
});
