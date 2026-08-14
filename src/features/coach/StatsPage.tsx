import { useMemo } from 'react';
import { IconMoney } from '@/components/icons';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { PAKETE, paketName, type Client } from '@/db/types';
import { dieserMonat } from '@/domain/dates';
import {
  einnahmenJeMonat,
  hatFestenPreis,
  monatLabel,
  monatsLage,
  wiederkehrenderUmsatz,
} from '@/domain/payments';
import { useKunden } from '@/hooks/useCoachData';

/**
 * Einnahmen.
 *
 * Zwei Zahlen tragen die Seite: was diesen Monat schon da ist, und was bei
 * unverändertem Kundenstamm jeden Monat wiederkommt. Alles andere ist
 * Aufschlüsselung.
 */
export default function StatsPage() {
  const { daten: kunden, laedt } = useKunden();

  const monat = dieserMonat();
  const alle = useMemo(() => kunden ?? [], [kunden]);
  const lage = useMemo(() => monatsLage(alle, monat), [alle, monat]);
  const wiederkehrend = useMemo(() => wiederkehrenderUmsatz(alle), [alle]);

  const verlauf = useMemo(() => einnahmenJeMonat(alle).slice(-12), [alle]);
  const jahresSumme = verlauf.reduce((s, m) => s + m.betrag, 0);

  const jePaket = useMemo(() => {
    const summen = new Map<string, { kunden: number; umsatz: number }>();
    for (const client of alle) {
      if (client.aktiv === false || !hatFestenPreis(client)) continue;
      const key = client.paket ?? 'unbekannt';
      const bisher = summen.get(key) ?? { kunden: 0, umsatz: 0 };
      summen.set(key, {
        kunden: bisher.kunden + 1,
        umsatz: bisher.umsatz + (client.paketPreis ?? 0),
      });
    }
    return [...summen.entries()].sort((a, b) => b[1].umsatz - a[1].umsatz);
  }, [alle]);

  if (laedt) {
    return (
      <Screen>
        <PageHeader title="Einnahmen" />
        <div className="h-40" aria-busy="true" />
      </Screen>
    );
  }

  if (alle.length === 0) {
    return (
      <Screen>
        <PageHeader title="Einnahmen" />
        <EmptyState
          icon={<IconMoney size={28} />}
          title="Noch keine Zahlen"
          description="Sobald du Kunden mit einem Paket hast, erscheint hier die Auswertung."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Einnahmen" subtitle={monatLabel(monat)} />

      <Card className="mb-3">
        <div className="text-[13px] font-semibold text-muted">Wiederkehrend pro Monat</div>
        <div className="tnum mt-1 text-[36px] leading-none font-extrabold tracking-tight">
          {wiederkehrend} €
        </div>
        <div className="mt-2 text-[14px] text-muted">
          {alle.filter((c) => c.aktiv !== false && hatFestenPreis(c)).length} aktive Kunden mit
          festem Paket
        </div>
      </Card>

      <div className="mb-7 grid grid-cols-3 gap-2">
        <StatTile value={`${lage.ist} €`} label="Diesen Monat" tone="positiv" />
        <StatTile
          value={`${lage.offen} €`}
          label="Noch offen"
          tone={lage.offen > 0 ? 'negativ' : 'neutral'}
        />
        <StatTile value={`${jahresSumme} €`} label="Letzte 12 Monate" />
      </div>

      {verlauf.length > 0 && (
        <Section title="Verlauf">
          <Card>
            <MonatsBalken daten={verlauf} />
          </Card>
        </Section>
      )}

      {jePaket.length > 0 && (
        <Section title="Nach Paket">
          <Card padded={false} className="px-4">
            {jePaket.map(([key, wert], index) => (
              <div key={key}>
                {index > 0 && <Divider />}
                <ListRow
                  title={paketName(key)}
                  subtitle={`${wert.kunden} ${wert.kunden === 1 ? 'Kunde' : 'Kunden'}`}
                  trailing={<span className="tnum text-[17px] font-bold">{wert.umsatz} €</span>}
                />
              </div>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Kundenstamm">
        <div className="grid grid-cols-2 gap-2">
          <StatTile value={alle.filter((c) => c.aktiv !== false).length} label="Aktiv" />
          <StatTile value={alle.filter((c) => c.aktiv === false).length} label="Inaktiv" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(PAKETE).map(([key, paket]) => (
            <Pill key={key}>
              {paket.name}: {anzahlMitPaket(alle, key)}
            </Pill>
          ))}
        </div>
      </Section>
    </Screen>
  );
}

function anzahlMitPaket(clients: Client[], paket: string): number {
  return clients.filter((c) => c.aktiv !== false && c.paket === paket).length;
}

/**
 * Balken je Monat.
 *
 * Selbst gezeichnet statt über die Diagrammbibliothek: zwölf Werte auf einer
 * Achse brauchen kein Koordinatensystem, und so bleibt die Optik dieselbe wie
 * bei den übrigen Balken der App.
 */
function MonatsBalken({ daten }: { daten: Array<{ monat: string; betrag: number }> }) {
  const max = Math.max(...daten.map((m) => m.betrag), 1);

  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {daten.map((m) => (
          <div key={m.monat} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="tnum text-[11px] font-semibold text-muted">{m.betrag}</span>
            <div
              className="w-full rounded-t-lg bg-positive transition-[height] duration-500"
              style={{ height: `${Math.max(3, (m.betrag / max) * 100)}%` }}
              role="img"
              aria-label={`${monatLabel(m.monat)}: ${m.betrag} Euro`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {daten.map((m) => (
          <span
            key={m.monat}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-subtle"
          >
            {m.monat.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
