/**
 * Geschäftsangaben für Rechnungen und Impressum.
 *
 * Diese Daten müssen nach § 14 UStG auf jeder Rechnung stehen. Sie liegen
 * bewusst als Konstanten hier und nicht in der Datenbank: Sie ändern sich
 * praktisch nie, und eine Rechnung darf nicht davon abhängen, ob gerade eine
 * Abfrage durchkommt.
 *
 * **Noch auszufüllen.** Solange ein Feld mit `AUSFÜLLEN` beginnt, blendet die
 * App vor dem Druck eine Warnung ein — eine Rechnung mit Platzhaltern darf
 * nicht beim Kunden landen. Über `VITE_…` lässt sich jedes Feld beim Bauen
 * überschreiben, ohne diese Datei anzufassen.
 */

const aus = (name: string, ersatz: string): string =>
  (import.meta.env[name] as string | undefined)?.trim() || ersatz;

export const GESCHAEFT = {
  name: aus('VITE_FIRMA_NAME', 'Jan Pravit Jungmann'),
  zusatz: aus('VITE_FIRMA_ZUSATZ', 'PRAVIT Coaching'),
  strasse: aus('VITE_FIRMA_STRASSE', 'AUSFÜLLEN: Straße und Hausnummer'),
  plzOrt: aus('VITE_FIRMA_PLZ_ORT', 'AUSFÜLLEN: PLZ und Ort'),
  email: aus('VITE_FIRMA_EMAIL', 'jan.pravit@gmx.de'),
  telefon: aus('VITE_FIRMA_TELEFON', ''),
  /** Steuernummer vom Finanzamt. Ohne USt-IdNr., da Kleinunternehmer. */
  steuernummer: aus('VITE_FIRMA_STEUERNUMMER', 'AUSFÜLLEN: Steuernummer'),
  iban: aus('VITE_FIRMA_IBAN', 'AUSFÜLLEN: IBAN'),
  kontoinhaber: aus('VITE_FIRMA_KONTOINHABER', 'Jan Pravit Jungmann'),
  /** Zahlungsziel in Tagen ab Rechnungsdatum. */
  zahlungszielTage: Number(aus('VITE_FIRMA_ZAHLUNGSZIEL', '14')) || 14,
} as const;

/**
 * Der Hinweis nach § 19 Abs. 1 UStG.
 *
 * Als Kleinunternehmer wird keine Umsatzsteuer ausgewiesen. Der Hinweis ist
 * Pflicht — ohne ihn wirkt die Rechnung, als wäre die Steuer vergessen worden.
 */
export const KLEINUNTERNEHMER_HINWEIS =
  'Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).';

/** Die Felder, die noch Platzhalter tragen. Leer = alles ausgefüllt. */
export function fehlendeAngaben(): string[] {
  const pflicht: Array<[string, string]> = [
    ['Straße', GESCHAEFT.strasse],
    ['PLZ und Ort', GESCHAEFT.plzOrt],
    ['Steuernummer', GESCHAEFT.steuernummer],
    ['IBAN', GESCHAEFT.iban],
  ];
  return pflicht.filter(([, wert]) => wert.startsWith('AUSFÜLLEN')).map(([name]) => name);
}
