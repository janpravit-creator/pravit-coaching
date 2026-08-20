/**
 * Reine Stripe-Hilfslogik.
 *
 * Steht hier statt in der Netlify-Funktion, damit sie ohne Netz und ohne
 * Stripe-Konto getestet werden kann — die Funktionen selbst lassen sich in
 * dieser Umgebung nicht ausführen.
 */

/** Welche Umgebungsvariable die Stripe-Preis-Kennung eines Pakets trägt. */
export const PREIS_ENV: Record<string, string> = {
  training: 'STRIPE_PREIS_TRAINING',
  ernaehrung: 'STRIPE_PREIS_ERNAEHRUNG',
  komplett: 'STRIPE_PREIS_KOMPLETT',
  premium: 'STRIPE_PREIS_PREMIUM',
};

/**
 * Die Preis-Kennung für ein Paket aus der Umgebung.
 *
 * Gibt `null` zurück statt zu werfen — die Funktion soll eine saubere
 * Fehlermeldung liefern können, statt mit einem Stapelabzug abzustürzen.
 */
export function preisKennung(
  paket: string | undefined,
  env: Record<string, string | undefined>,
): string | null {
  if (!paket) return null;
  const name = PREIS_ENV[paket];
  if (!name) return null;
  const wert = env[name]?.trim();
  return wert ? wert : null;
}

/** Pakete, für die eine Preis-Kennung hinterlegt ist. */
export function verfuegbarePakete(env: Record<string, string | undefined>): string[] {
  return Object.keys(PREIS_ENV).filter((p) => preisKennung(p, env) !== null);
}

/**
 * Der Abrechnungsmonat aus einem Unix-Zeitstempel in Sekunden.
 *
 * Stripe liefert Sekunden, JavaScript erwartet Millisekunden — ohne die
 * Umrechnung landet jedes Datum im Januar 1970. Gerechnet wird in UTC, damit
 * eine Zahlung am Monatsersten nicht je nach Zeitzone in den Vormonat rutscht.
 */
export function monatAus(unixSekunden: number | null | undefined): string | null {
  if (typeof unixSekunden !== 'number' || !Number.isFinite(unixSekunden)) return null;
  const d = new Date(unixSekunden * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface Zahlungseintrag {
  monat: string;
  bezahlt: boolean;
  updatedAt?: string;
  /** Woher die Zahlung stammt – von Hand oder über Stripe. */
  quelle?: string;
}

/**
 * Trägt eine Zahlung ein, ohne andere Monate anzurühren.
 *
 * Dieselbe Regel wie beim manuellen Abhaken: Ein vorhandener Monat wird
 * überschrieben, nicht gedoppelt.
 */
export function setzeZahlungsmonat(
  zahlungen: Zahlungseintrag[] | undefined,
  monat: string,
  bezahlt: boolean,
  quelle = 'stripe',
  jetzt: Date = new Date(),
): Zahlungseintrag[] {
  const liste = [...(zahlungen ?? [])];
  const eintrag: Zahlungseintrag = {
    monat,
    bezahlt,
    updatedAt: jetzt.toISOString(),
    quelle,
  };
  const index = liste.findIndex((z) => z.monat === monat);
  if (index >= 0) liste[index] = eintrag;
  else liste.push(eintrag);
  return liste;
}

/** Die Ereignisse, auf die der Webhook reagiert. Alles andere wird ignoriert. */
export const BEACHTETE_EREIGNISSE = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.deleted',
] as const;

export type BeachtetesEreignis = (typeof BEACHTETE_EREIGNISSE)[number];

export function istBeachtet(typ: string): typ is BeachtetesEreignis {
  return (BEACHTETE_EREIGNISSE as readonly string[]).includes(typ);
}
