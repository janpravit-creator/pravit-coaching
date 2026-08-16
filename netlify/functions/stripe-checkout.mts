import Stripe from 'stripe';
import { preisKennung, verfuegbarePakete } from '../../src/domain/stripe.js';

/**
 * Erzeugt eine Stripe-Checkout-Sitzung für ein Abo.
 *
 * Aufruf per POST mit `{ paket, clientId?, email? }`. Antwort: `{ url }` — die
 * Seite leitet dann dorthin weiter.
 *
 * Die Preis-Kennungen liegen in Umgebungsvariablen, nicht im Code: Sie
 * unterscheiden sich zwischen Test- und Echtbetrieb, und der Wechsel darf
 * kein neues Bündel erfordern.
 *
 * Benötigte Variablen (Netlify → Site settings → Environment variables):
 *   STRIPE_GEHEIM           sk_test_… bzw. sk_live_…
 *   STRIPE_PREIS_TRAINING   price_…   (Abo-Preis „Training")
 *   STRIPE_PREIS_ERNAEHRUNG price_…
 *   STRIPE_PREIS_KOMPLETT   price_…
 *   STRIPE_PREIS_PREMIUM    price_…
 *   SEITEN_URL              https://…  (für Rücksprung nach Zahlung)
 */
export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return json({ fehler: 'Nur POST' }, 405);
  }

  const geheim = process.env['STRIPE_GEHEIM']?.trim();
  if (!geheim) {
    return json({ fehler: 'STRIPE_GEHEIM ist nicht gesetzt.' }, 500);
  }

  let körper: { paket?: string; clientId?: string; email?: string };
  try {
    körper = (await request.json()) as typeof körper;
  } catch {
    return json({ fehler: 'Ungültiger Anfragekörper.' }, 400);
  }

  const preis = preisKennung(körper.paket, process.env);
  if (!preis) {
    return json(
      {
        fehler: `Für „${körper.paket ?? '—'}" ist kein Stripe-Preis hinterlegt.`,
        buchbar: verfuegbarePakete(process.env),
      },
      400,
    );
  }

  const basis = (process.env['SEITEN_URL'] ?? new URL(request.url).origin).replace(/\/$/, '');
  const stripe = new Stripe(geheim);

  try {
    const sitzung = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: preis, quantity: 1 }],
      // Die Kunden-Kennung reist mit, damit der Webhook die Zahlung dem
      // richtigen Firestore-Dokument zuordnen kann.
      client_reference_id: körper.clientId,
      customer_email: körper.email,
      metadata: {
        clientId: körper.clientId ?? '',
        paket: körper.paket ?? '',
      },
      subscription_data: {
        metadata: { clientId: körper.clientId ?? '', paket: körper.paket ?? '' },
      },
      success_url: `${basis}/?zahlung=ok`,
      cancel_url: `${basis}/?zahlung=abgebrochen`,
      allow_promotion_codes: true,
    });

    return json({ url: sitzung.url });
  } catch (e) {
    return json({ fehler: e instanceof Error ? e.message : 'Stripe-Fehler' }, 502);
  }
};

function json(daten: unknown, status = 200): Response {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
