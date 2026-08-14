import { useMemo } from 'react';
import { PrimaryButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { clientName, paketName, type Client } from '@/db/types';
import { dieserMonat } from '@/domain/dates';
import { monatLabel } from '@/domain/payments';
import { hatFestenPreis } from '@/domain/payments';

/**
 * Monatsrechnung.
 *
 * Die Rechnungsnummer wird aus Kunde und Monat gebildet statt aus einer
 * Zufallszahl: derselbe Monat ergibt dieselbe Nummer. Vorher bekam ein Kunde
 * bei jedem Öffnen eine neue – und damit einen zweiten Beleg über dieselbe
 * Leistung.
 */
export function Rechnung({
  client,
  open,
  onClose,
  monat = dieserMonat(),
}: {
  client: Client;
  open: boolean;
  onClose: () => void;
  monat?: string;
}) {
  const nummer = useMemo(() => rechnungsNummer(client, monat), [client.id, monat]);
  const betrag = client.paketPreis ?? 0;

  if (!open) return null;

  if (!hatFestenPreis(client) || betrag <= 0) {
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
      subtitle={monatLabel(monat)}
      fullHeight
      footer={
        <PrimaryButton block onClick={() => window.print()}>
          Drucken oder als PDF sichern
        </PrimaryButton>
      }
    >
      {/* `print-bereich` blendet beim Drucken alles andere aus – siehe theme.css */}
      <div className="print-bereich rounded-[var(--radius-card)] bg-surface p-6 shadow-card">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="text-[22px] font-extrabold tracking-[0.18em]">PRAVIT</div>
            <div className="mt-2 text-[13px] leading-relaxed text-muted">
              Jan Pravit Jungmann
              <br />
              Hamburg
              <br />
              jan.pravit@gmx.de
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-bold">RECHNUNG</div>
            <div className="mt-1 text-[13px] text-muted">{nummer}</div>
            <div className="text-[13px] text-muted">{monatLabel(monat)}</div>
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <div className="text-[12px] font-bold tracking-wide text-muted uppercase">
            Rechnungsempfänger
          </div>
          <div className="mt-1.5 text-[16px] font-bold">{clientName(client)}</div>
          {client.email && <div className="text-[14px] text-muted">{client.email}</div>}
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
            <tr>
              <td className="py-3 text-[15px]">{paketName(client.paket)}</td>
              <td className="py-3 text-center text-[15px] text-muted">{monatLabel(monat)}</td>
              <td className="tnum py-3 text-right text-[15px] font-bold">{betrag},00 €</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-surface-muted px-4 py-3.5">
          <span className="text-[13px] text-muted">Kleinunternehmer gemäß § 19 UStG</span>
          <span className="tnum text-[20px] font-extrabold tracking-tight">{betrag},00 €</span>
        </div>
      </div>
    </Sheet>
  );
}

/** `PRV-2026-08-a1b2` – gleich bleibend für Kunde und Monat. */
function rechnungsNummer(client: Client, monat: string): string {
  let hash = 0;
  for (const zeichen of client.id) {
    hash = (hash * 31 + zeichen.charCodeAt(0)) % 65_536;
  }
  return `PRV-${monat}-${hash.toString(16).padStart(4, '0')}`;
}
