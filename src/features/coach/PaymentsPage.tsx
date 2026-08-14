import { useMemo, useState } from 'react';
import { IconMoney } from '@/components/icons';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { EmptyState, PageHeader, Pill, ProgressBar, Screen } from '@/components/ui/Layout';
import { saveZahlungen } from '@/db/repo/clients';
import { clientName, paketName, type Client } from '@/db/types';
import { dieserMonat } from '@/domain/dates';
import { hatFestenPreis, istBezahlt, monatLabel, monatsLage, setzeZahlung } from '@/domain/payments';
import { useKunden } from '@/hooks/useCoachData';
import { toast } from '@/state/uiStore';
import { Rechnung } from './Rechnung';

/**
 * Zahlungen eines Monats.
 *
 * Ein Antippen schaltet zwischen bezahlt und offen um. Die Änderung ist
 * sofort sichtbar, auch bevor Firestore geantwortet hat – bei dreißig Kunden
 * hintereinander wäre jede Wartezeit sonst spürbar. Scheitert das Schreiben,
 * springt die Zeile zurück und sagt es.
 */
export default function PaymentsPage() {
  const { daten: kunden, laedt, neuLaden } = useKunden();

  const [monat, setMonat] = useState(dieserMonat());
  const [ueberschrieben, setUeberschrieben] = useState<Record<string, boolean>>({});
  const [rechnungFuer, setRechnungFuer] = useState<Client | null>(null);

  const relevante = useMemo(
    () =>
      (kunden ?? [])
        .filter((c) => c.aktiv !== false && hatFestenPreis(c))
        .sort((a, b) => clientName(a).localeCompare(clientName(b), 'de')),
    [kunden],
  );

  /** Der angezeigte Zustand: gespeicherter Wert, solange nichts umgeschaltet wurde. */
  const bezahltStatus = (client: Client) =>
    ueberschrieben[client.id] ?? istBezahlt(client, monat);

  const lage = useMemo(() => {
    const gespeichert = monatsLage(relevante, monat);
    // Die eigenen Umschaltungen sofort mitrechnen.
    let ist = 0;
    let bezahlteKunden = 0;
    for (const client of relevante) {
      if (bezahltStatus(client)) {
        ist += client.paketPreis ?? 0;
        bezahlteKunden += 1;
      }
    }
    return {
      ...gespeichert,
      ist,
      offen: gespeichert.soll - ist,
      bezahlteKunden,
      offeneKunden: relevante.length - bezahlteKunden,
    };
  }, [relevante, monat, ueberschrieben]);

  const umschalten = async (client: Client) => {
    const neu = !bezahltStatus(client);
    setUeberschrieben((s) => ({ ...s, [client.id]: neu }));
    try {
      await saveZahlungen(client.id, setzeZahlung(client, monat, neu) ?? []);
      neuLaden();
    } catch {
      setUeberschrieben((s) => {
        const rest = { ...s };
        delete rest[client.id];
        return rest;
      });
      toast.error('Speichern hat nicht geklappt.');
    }
  };

  const monate = letzteMonate(6);

  return (
    <Screen>
      <PageHeader title="Zahlungen" subtitle={monatLabel(monat)} />

      <div className="scroll-x -mx-5 mb-5 flex gap-2 px-5">
        {monate.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMonat(m);
              // Ein Monatswechsel verwirft die Sofortanzeige – sonst zeigte
              // der neue Monat die Umschaltungen des alten.
              setUeberschrieben({});
            }}
            className={
              m === monat
                ? 'shrink-0 rounded-2xl bg-surface px-4 py-2.5 text-[14px] font-bold shadow-card ring-2 ring-text transition-shadow'
                : 'shrink-0 rounded-2xl bg-surface px-4 py-2.5 text-[14px] font-bold shadow-card transition-shadow'
            }
          >
            {monatLabel(m)}
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="tnum text-[30px] font-extrabold tracking-tight">{lage.ist} €</span>
          <span className="text-[15px] text-muted">von {lage.soll} €</span>
        </div>
        <ProgressBar value={lage.soll > 0 ? lage.ist / lage.soll : 0} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile value={lage.bezahlteKunden} label="Bezahlt" tone="positiv" />
          <StatTile
            value={lage.offeneKunden}
            label="Offen"
            tone={lage.offeneKunden > 0 ? 'negativ' : 'neutral'}
          />
          <StatTile value={`${lage.offen} €`} label="Ausstehend" />
        </div>
      </Card>

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : relevante.length === 0 ? (
        <EmptyState
          icon={<IconMoney size={28} />}
          title="Keine Zahlungen"
          description="Kein aktiver Kunde hat ein Paket mit festem Preis."
        />
      ) : (
        <Section title="Kunden">
          <Card padded={false} className="px-4">
            {relevante.map((client, index) => {
              const bezahlt = bezahltStatus(client);
              return (
                <div key={client.id}>
                  {index > 0 && <Divider />}
                  <ListRow
                    title={clientName(client)}
                    subtitle={`${paketName(client.paket)} · ${client.paketPreis ?? 0} €`}
                    trailing={
                      <span className="flex items-center gap-2">
                        <Pill tone={bezahlt ? 'positiv' : 'warnung'}>
                          {bezahlt ? 'bezahlt' : 'offen'}
                        </Pill>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRechnungFuer(client);
                          }}
                          className="rounded-lg px-2 py-1 text-[13px] font-semibold text-muted"
                        >
                          Rechnung
                        </button>
                      </span>
                    }
                    onClick={() => void umschalten(client)}
                  />
                </div>
              );
            })}
          </Card>
          <p className="mt-2 px-1 text-[13px] text-muted">
            Zeile antippen schaltet zwischen bezahlt und offen um.
          </p>
        </Section>
      )}

      {rechnungFuer && (
        <Rechnung
          client={rechnungFuer}
          monat={monat}
          open
          onClose={() => setRechnungFuer(null)}
        />
      )}
    </Screen>
  );
}

/** Die letzten `anzahl` Monate, neuester zuerst, als `YYYY-MM`. */
function letzteMonate(anzahl: number, now = new Date()): string[] {
  const monate: string[] = [];
  for (let i = 0; i < anzahl; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monate.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return monate;
}
