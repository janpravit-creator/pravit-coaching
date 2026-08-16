import type { Rechnungsposten } from '@/domain/rechnung';
import { euro } from '@/domain/rechnung';
import { GESCHAEFT, KLEINUNTERNEHMER_HINWEIS } from '@/lib/geschaeft';
import { dateNumeric } from '@/lib/format';

/**
 * Der druckbare Beleg.
 *
 * Bewusst ohne Datenbankzugriff: Die Nummernvergabe steckt in `Rechnung.tsx`,
 * hier wird nur dargestellt. Dadurch lässt sich der Beleg — ein Dokument, das
 * beim Kunden landet und Pflichtangaben tragen muss — isoliert ansehen und
 * prüfen, ohne dass eine Anmeldung nötig wäre.
 */
export function RechnungBeleg({
  nummer,
  datum,
  faelligAm,
  empfaenger,
  empfaengerEmail,
  posten,
  gesamt,
}: {
  nummer: string | null;
  datum: string;
  faelligAm: string;
  empfaenger: string;
  empfaengerEmail?: string;
  posten: Rechnungsposten[];
  gesamt: number;
}) {
  return (
    /* `print-bereich` blendet beim Drucken alles andere aus – siehe theme.css */
    <div className="print-bereich rounded-[var(--radius-card)] bg-surface p-6 shadow-card">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="text-[22px] font-extrabold tracking-[0.18em]">PRAVIT</div>
          <div className="mt-2 text-[13px] leading-relaxed text-muted">
            {GESCHAEFT.name}
            <br />
            {GESCHAEFT.strasse}
            <br />
            {GESCHAEFT.plzOrt}
            <br />
            {GESCHAEFT.email}
            {GESCHAEFT.telefon && (
              <>
                <br />
                {GESCHAEFT.telefon}
              </>
            )}
            <br />
            Steuernummer: {GESCHAEFT.steuernummer}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[13px] font-bold">RECHNUNG</div>
          <div className="tnum mt-1 text-[13px] text-muted">{nummer ?? '…'}</div>
          <div className="tnum text-[13px] text-muted">{dateNumeric(datum)}</div>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <div className="text-[12px] font-bold tracking-wide text-muted uppercase">
          Rechnungsempfänger
        </div>
        <div className="mt-1.5 text-[16px] font-bold">{empfaenger}</div>
        {empfaengerEmail && <div className="text-[14px] text-muted">{empfaengerEmail}</div>}
      </div>

      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="py-2 text-[12px] font-bold tracking-wide text-muted uppercase">
              Leistung
            </th>
            <th className="py-2 text-center text-[12px] font-bold tracking-wide text-muted uppercase">
              Zeitraum
            </th>
            <th className="py-2 text-right text-[12px] font-bold tracking-wide text-muted uppercase">
              Betrag
            </th>
          </tr>
        </thead>
        <tbody>
          {posten.map((p) => (
            <tr key={p.zeitraum} className="border-b border-line last:border-0">
              <td className="py-3 text-[15px]">{p.bezeichnung}</td>
              <td className="py-3 text-center text-[15px] text-muted">{p.zeitraum}</td>
              <td className="tnum py-3 text-right text-[15px] font-bold">{euro(p.betrag)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-surface-muted px-4 py-3.5">
        <span className="text-[14px] font-bold">Gesamtbetrag</span>
        <span className="tnum text-[20px] font-extrabold tracking-tight">{euro(gesamt)}</span>
      </div>

      <div className="mt-5 space-y-2 text-[13px] leading-relaxed text-muted">
        <p>{KLEINUNTERNEHMER_HINWEIS}</p>
        <p>
          Zahlbar bis {dateNumeric(faelligAm)} auf {GESCHAEFT.iban} ({GESCHAEFT.kontoinhaber}).
          Verwendungszweck: {nummer ?? '—'}
        </p>
        <p>Leistung erbracht im angegebenen Zeitraum. Es gilt das Rechnungsdatum.</p>
      </div>
    </div>
  );
}
