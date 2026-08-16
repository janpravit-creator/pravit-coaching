/**
 * Startet den Stripe-Checkout.
 *
 * Ruft die Netlify-Funktion auf und leitet zur zurückgegebenen Adresse weiter.
 * Die Funktion liegt unter `/.netlify/functions/…` – dieser Pfad wird von
 * Netlify direkt aufgelöst und darf **nicht** über eine Weiterleitungsregel
 * laufen; Netlify weist Regeln zurück, deren Pfad mit `/.netlify` beginnt.
 */
export async function starteCheckout(paket: string, clientId?: string, email?: string) {
  const antwort = await fetch('/.netlify/functions/stripe-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paket, clientId, email }),
  });

  const daten = (await antwort.json().catch(() => ({}))) as { url?: string; fehler?: string };

  if (!antwort.ok || !daten.url) {
    throw new Error(daten.fehler ?? `Checkout nicht möglich (HTTP ${antwort.status})`);
  }

  window.location.href = daten.url;
}
