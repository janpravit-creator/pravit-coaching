import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { ensureInvoice } from '@/db/repo/invoices';
import { clientName, type Client } from '@/db/types';
import { heute } from '@/domain/dates';
import { offeneMonate, preisEinesKunden } from '@/domain/pakete';
import { hatFestenPreis, monatLabel } from '@/domain/payments';
import { plusTage, postenFuer, summe } from '@/domain/rechnung';
import { GESCHAEFT, fehlendeAngaben } from '@/lib/geschaeft';
import { RechnungBeleg } from './RechnungBeleg';

/**
 * Monatsrechnung mit fortlaufender Nummer.
 *
 * Die Nummer wird beim ersten Öffnen vergeben und in `invoices` abgelegt;
 * jedes weitere Öffnen zeigt dieselbe. Vorher entstand sie aus einem Hash über
 * Kunde und Monat — eindeutig, aber nicht fortlaufend, wie § 14 UStG es
 * verlangt.
 *
 * Steht ein Rückstand offen, werden alle unbezahlten Monate in einem Beleg
 * aufgeführt, statt für jeden Monat eine eigene Rechnung zu erzeugen.
 */
export function Rechnung({
  client,
  open,
  onClose,
  monat,
}: {
  client: Client;
  open: boolean;
  onClose: () => void;
  monat?: string;
}) {
  const datum = heute();
  const abrechnungsmonat = monat ?? datum.slice(0, 7);

  // Bei Rückstand alle offenen Monate abrechnen, sonst den gewählten Monat.
  const offen = offeneMonate(client, abrechnungsmonat);
  const monate = offen.length > 0 ? offen : [abrechnungsmonat];

  const posten = postenFuer(client, monate, monatLabel);
  const gesamt = summe(posten);
  const faelligAm = plusTage(datum, GESCHAEFT.zahlungszielTage);
  const luecken = fehlendeAngaben();

  const [nummer, setNummer] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const abrechenbar = open && hatFestenPreis(client) && gesamt > 0;

  useEffect(() => {
    if (!abrechenbar) return;
    let abgebrochen = false;

    void ensureInvoice({
      clientId: client.id,
      clientName: clientName(client),
      monat: abrechnungsmonat,
      monate,
      betrag: gesamt,
      paket: client.paket,
      datum,
      faelligAm,
    })
      .then((r) => {
        if (!abgebrochen) setNummer(r.nummer ?? null);
      })
      .catch((e: unknown) => {
        if (!abgebrochen) setFehler(e instanceof Error ? e.message : 'Unbekannter Fehler');
      });

    return () => {
      abgebrochen = true;
    };
    // Die Nummer hängt an Kunde und Abrechnungsmonat – nicht an den abgeleiteten
    // Werten, die sich bei jedem Rendern neu ergeben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrechenbar, client.id, abrechnungsmonat]);

  if (!open) return null;

  if (!hatFestenPreis(client) || preisEinesKunden(client) <= 0) {
    return (
      <Sheet open onClose={onClose} title="Keine Rechnung">
        <EmptyState
          title="Kein fester Preis hinterlegt"
          description="Für Individuell-Pakete wird keine Rechnung erzeugt. Trag im Profil einen Monatspreis ein, wenn du eine brauchst."
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Rechnung"
      subtitle={monate.length > 1 ? `${monate.length} Monate` : monatLabel(abrechnungsmonat)}
      fullHeight
      footer={
        <PrimaryButton block disabled={nummer === null} onClick={() => window.print()}>
          {nummer === null ? 'Nummer wird vergeben …' : 'Drucken oder als PDF sichern'}
        </PrimaryButton>
      }
    >
      {luecken.length > 0 && (
        <div className="mb-4 rounded-2xl bg-warning-soft px-4 py-3.5 text-[14px] leading-snug text-warning">
          <strong className="font-bold">Pflichtangaben fehlen:</strong> {luecken.join(', ')}.
          Trag sie in <code className="text-[13px]">src/lib/geschaeft.ts</code> ein — ohne sie ist
          die Rechnung nicht gültig. Dieser Hinweis wird nicht mitgedruckt.
        </div>
      )}

      {fehler && (
        <div className="mb-4 rounded-2xl bg-negative-soft px-4 py-3.5 text-[14px] font-semibold text-negative">
          Rechnungsnummer konnte nicht vergeben werden: {fehler}
        </div>
      )}

      <RechnungBeleg
        nummer={nummer}
        datum={datum}
        faelligAm={faelligAm}
        empfaenger={clientName(client)}
        empfaengerEmail={client.email}
        posten={posten}
        gesamt={gesamt}
      />
    </Sheet>
  );
}
