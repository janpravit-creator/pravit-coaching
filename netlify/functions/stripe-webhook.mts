import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { istBeachtet, monatAus, setzeZahlungsmonat } from '../../src/domain/stripe.js';
import type { Zahlungseintrag } from '../../src/domain/stripe.js';

/**
 * Nimmt Stripe-Ereignisse entgegen und schreibt sie nach Firestore.
 *
 * Reagiert auf vier Ereignisse:
 *   checkout.session.completed    Abo angelegt → Kennungen am Kunden merken
 *   invoice.paid                  Monat bezahlt → in `zahlungen[]` eintragen
 *   invoice.payment_failed        Zahlung geplatzt → Monat als offen markieren
 *   customer.subscription.deleted Abo gekündigt → Kunde als inaktiv markieren
 *
 * Alles andere wird bewusst mit 200 quittiert: Stripe schickt Dutzende
 * Ereignisarten, und ein Fehler würde die Zustellung endlos wiederholen lassen.
 *
 * Benötigte Variablen:
 *   STRIPE_GEHEIM             sk_test_… bzw. sk_live_…
 *   STRIPE_WEBHOOK_GEHEIM     whsec_…  (aus dem Stripe-Dashboard)
 *   FIREBASE_DIENSTKONTO      Der komplette JSON-Schlüssel als eine Zeile
 *
 * Der Dienstkonto-Schlüssel ist ein Vollzugriff auf die Datenbank. Er gehört
 * ausschließlich in die Netlify-Umgebungsvariablen, niemals ins Repository.
 */
export default async (request: Request): Promise<Response> => {
  const geheim = process.env['STRIPE_GEHEIM']?.trim();
  const webhookGeheim = process.env['STRIPE_WEBHOOK_GEHEIM']?.trim();
  if (!geheim || !webhookGeheim) {
    return new Response('Stripe-Variablen fehlen', { status: 500 });
  }

  const signatur = request.headers.get('stripe-signature');
  if (!signatur) return new Response('Signatur fehlt', { status: 400 });

  const roh = await request.text();
  const stripe = new Stripe(geheim);

  let ereignis: Stripe.Event;
  try {
    // Die Signaturprüfung ist der eigentliche Schutz: Ohne sie könnte jeder
    // eine bezahlte Rechnung vortäuschen.
    ereignis = await stripe.webhooks.constructEventAsync(roh, signatur, webhookGeheim);
  } catch (e) {
    return new Response(
      `Signatur ungültig: ${e instanceof Error ? e.message : 'unbekannt'}`,
      { status: 400 },
    );
  }

  if (!istBeachtet(ereignis.type)) {
    return new Response('ignoriert', { status: 200 });
  }

  let db: FirebaseFirestore.Firestore;
  try {
    db = firestore();
  } catch (e) {
    return new Response(
      `Firestore nicht erreichbar: ${e instanceof Error ? e.message : 'unbekannt'}`,
      { status: 500 },
    );
  }

  try {
    await verarbeite(ereignis, db, stripe);
    return new Response('ok', { status: 200 });
  } catch (e) {
    // 500 lässt Stripe es später erneut versuchen – richtig, wenn Firestore
    // gerade nicht erreichbar war.
    return new Response(e instanceof Error ? e.message : 'Fehler', { status: 500 });
  }
};

async function verarbeite(
  ereignis: Stripe.Event,
  db: FirebaseFirestore.Firestore,
  stripe: Stripe,
): Promise<void> {
  switch (ereignis.type) {
    case 'checkout.session.completed': {
      const sitzung = ereignis.data.object;
      const clientId = sitzung.client_reference_id ?? sitzung.metadata?.['clientId'];
      if (!clientId) return;
      await db.collection('clients').doc(clientId).set(
        {
          stripeCustomerId: typeof sitzung.customer === 'string' ? sitzung.customer : null,
          stripeSubscriptionId:
            typeof sitzung.subscription === 'string' ? sitzung.subscription : null,
          stripeStatus: 'aktiv',
          aktiv: true,
        },
        { merge: true },
      );
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const rechnung = ereignis.data.object;
      const bezahlt = ereignis.type === 'invoice.paid';

      const clientId = await findeClientId(rechnung, db, stripe);
      if (!clientId) return;

      // Der abgerechnete Zeitraum steht an der Rechnungsposition; fehlt er,
      // gilt das Rechnungsdatum.
      const zeitraumStart =
        rechnung.lines?.data?.[0]?.period?.start ?? rechnung.created ?? null;
      const monat = monatAus(zeitraumStart);
      if (!monat) return;

      const ref = db.collection('clients').doc(clientId);
      await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const bisher = (doc.data()?.['zahlungen'] as Zahlungseintrag[] | undefined) ?? [];
        t.set(
          ref,
          { zahlungen: setzeZahlungsmonat(bisher, monat, bezahlt), stripeStatus: bezahlt ? 'aktiv' : 'zahlung_offen' },
          { merge: true },
        );
      });
      return;
    }

    case 'customer.subscription.deleted': {
      const abo = ereignis.data.object;
      const clientId = abo.metadata?.['clientId'];
      if (!clientId) return;
      // Bewusst nicht `aktiv: false` – ob der Kunde weiterbetreut wird,
      // entscheidet der Coach. Vermerkt wird nur, dass das Abo endete.
      await db.collection('clients').doc(clientId).set(
        { stripeStatus: 'gekuendigt', stripeSubscriptionId: null },
        { merge: true },
      );
      return;
    }
  }
}

/**
 * Findet die Kunden-Kennung zu einer Rechnung.
 *
 * Bei Folgerechnungen eines Abos steht sie nicht auf der Rechnung, sondern am
 * Abo — deshalb wird notfalls dort nachgesehen.
 */
async function findeClientId(
  rechnung: Stripe.Invoice,
  db: FirebaseFirestore.Firestore,
  stripe: Stripe,
): Promise<string | null> {
  const ausMetadaten = rechnung.metadata?.['clientId'];
  if (ausMetadaten) return ausMetadaten;

  const aboId = (rechnung as { subscription?: string | Stripe.Subscription }).subscription;
  if (typeof aboId === 'string') {
    try {
      const abo = await stripe.subscriptions.retrieve(aboId);
      const ausAbo = abo.metadata?.['clientId'];
      if (ausAbo) return ausAbo;
    } catch {
      // Weiter zur Suche über die Kundennummer.
    }
  }

  const kundenId = typeof rechnung.customer === 'string' ? rechnung.customer : null;
  if (!kundenId) return null;

  const treffer = await db
    .collection('clients')
    .where('stripeCustomerId', '==', kundenId)
    .limit(1)
    .get();
  return treffer.empty ? null : (treffer.docs[0]?.id ?? null);
}

/** Firestore-Zugang über das Dienstkonto; wird je Aufruf nur einmal aufgebaut. */
function firestore(): FirebaseFirestore.Firestore {
  if (getApps().length === 0) {
    const roh = process.env['FIREBASE_DIENSTKONTO'];
    if (!roh) throw new Error('FIREBASE_DIENSTKONTO ist nicht gesetzt.');
    const schluessel = JSON.parse(roh) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    initializeApp({
      credential: cert({
        projectId: schluessel.project_id,
        clientEmail: schluessel.client_email,
        // In Umgebungsvariablen stehen Zeilenumbrüche als „\n" – ohne das
        // Zurückwandeln lehnt Google den Schlüssel ab.
        privateKey: schluessel.private_key.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}
