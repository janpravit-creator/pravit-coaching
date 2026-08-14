import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLogout, IconUsers } from '@/components/icons';
import { IconButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { PillTabs } from '@/components/ui/Controls';
import { SearchField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { clientName, paketName, type Client } from '@/db/types';
import { checkinLage, istOffen } from '@/domain/checkin';
import { parseDatum } from '@/domain/dates';
import { zahl } from '@/domain/nutrition';
import { hatFestenPreis, istBezahlt } from '@/domain/payments';
import { dieserMonat } from '@/domain/dates';
import { useKundenMitCheckins, type KundeMitCheckins } from '@/hooks/useCoachData';
import { useAuthStore } from '@/state/authStore';

/**
 * Kundenübersicht des Coaches.
 *
 * Die Warnhinweise standen bisher als lose Textzeilen über der Liste und
 * wiederholten, was in den Zeilen ohnehin steht. Hier trägt jede Zeile ihren
 * eigenen Zustand – offene Check-ins, Tage seit dem letzten, offene Zahlung –
 * und die Übersicht oben zählt nur zusammen.
 */

type Sortierung = 'name' | 'offen' | 'start';

export default function ClientsPage() {
  const navigate = useNavigate();
  const abmelden = useAuthStore((s) => s.abmelden);
  const { daten, laedt } = useKundenMitCheckins();

  const [suche, setSuche] = useState('');
  const [sortierung, setSortierung] = useState<Sortierung>('offen');
  const [zeigeInaktive, setZeigeInaktive] = useState(false);

  const zeilen = useMemo(() => (daten ?? []).map(baueZeile), [daten]);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const passend = zeilen.filter(
      (z) =>
        z.aktiv === !zeigeInaktive &&
        (q === '' || z.name.toLowerCase().includes(q) || (z.email ?? '').toLowerCase().includes(q)),
    );

    return [...passend].sort((a, b) => {
      if (sortierung === 'name') return a.name.localeCompare(b.name, 'de');
      if (sortierung === 'start') return (b.startMs ?? 0) - (a.startMs ?? 0);
      // „Offen zuerst": erst die mit unbeantworteten Check-ins, dann die
      // längsten Funkstillen.
      if (a.offene !== b.offene) return b.offene - a.offene;
      return (b.tageSeitCheckin ?? -1) - (a.tageSeitCheckin ?? -1);
    });
  }, [zeilen, suche, sortierung, zeigeInaktive]);

  const summe = useMemo(() => {
    const aktive = zeilen.filter((z) => z.aktiv);
    return {
      aktive: aktive.length,
      offeneCheckins: aktive.reduce((s, z) => s + z.offene, 0),
      offeneZahlungen: aktive.filter((z) => z.zahlungOffen).length,
      inaktive: zeilen.length - aktive.length,
    };
  }, [zeilen]);

  return (
    <Screen>
      <PageHeader
        title="Kunden"
        subtitle={laedt ? 'Wird geladen …' : `${summe.aktive} aktiv · ${zeilen.length} gesamt`}
        trailing={
          <IconButton label="Abmelden" onClick={() => void abmelden()}>
            <IconLogout size={20} />
          </IconButton>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatTile value={summe.aktive} label="Aktiv" />
        <StatTile
          value={summe.offeneCheckins}
          label="Offene Check-ins"
          tone={summe.offeneCheckins > 0 ? 'negativ' : 'neutral'}
        />
        <StatTile
          value={summe.offeneZahlungen}
          label="Offene Zahlungen"
          tone={summe.offeneZahlungen > 0 ? 'negativ' : 'neutral'}
        />
      </div>

      <SearchField
        value={suche}
        onChange={setSuche}
        placeholder="Kunde suchen …"
        className="mb-3"
      />

      <PillTabs
        className="mb-3"
        value={sortierung}
        onChange={setSortierung}
        options={[
          { value: 'offen', label: 'Offen zuerst' },
          { value: 'name', label: 'A–Z' },
          { value: 'start', label: 'Neu zuerst' },
        ]}
      />

      {summe.inaktive > 0 && (
        <PillTabs
          className="mb-5"
          value={zeigeInaktive ? 'inaktiv' : 'aktiv'}
          onChange={(v) => setZeigeInaktive(v === 'inaktiv')}
          options={[
            { value: 'aktiv', label: `Aktiv (${summe.aktive})` },
            { value: 'inaktiv', label: `Inaktiv (${summe.inaktive})` },
          ]}
        />
      )}

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={28} />}
          title={suche ? 'Kein Kunde gefunden' : 'Noch keine Kunden'}
          description={
            suche
              ? 'Versuch einen anderen Namen.'
              : 'Sobald sich jemand registriert, erscheint er hier.'
          }
        />
      ) : (
        <Section>
          <Card padded={false} className="px-4">
            {gefiltert.map((z, index) => (
              <div key={z.id}>
                {index > 0 && <Divider />}
                <ListRow
                  leading={<Avatar name={z.name} />}
                  title={z.name}
                  subtitle={z.untertitel}
                  trailing={<Zustand zeile={z} />}
                  onClick={() => navigate(`/coach/kunden/${z.id}`)}
                  chevron
                />
              </div>
            ))}
          </Card>
        </Section>
      )}
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Zeilen-Aufbereitung
 * ------------------------------------------------------------------ */

interface Zeile {
  id: string;
  name: string;
  email: string | undefined;
  aktiv: boolean;
  untertitel: string;
  offene: number;
  tageSeitCheckin: number | null;
  nieCheckin: boolean;
  gewicht: number;
  zahlungOffen: boolean;
  startMs: number | null;
}

function baueZeile({ client, checkins }: KundeMitCheckins): Zeile {
  const lage = checkinLage(checkins);
  const letztesGewicht = checkins.find((ci) => zahl(ci.kg) > 0);

  const teile = [paketName(client.paket)];
  if (client.freq) teile.push(client.freq);

  return {
    id: client.id,
    name: clientName(client),
    email: client.email,
    aktiv: client.aktiv !== false,
    untertitel: teile.join(' · '),
    offene: checkins.filter(istOffen).length,
    tageSeitCheckin: lage.tageSeitLetztem,
    nieCheckin: lage.nochNieEingereicht,
    gewicht: letztesGewicht ? zahl(letztesGewicht.kg) : zahl(client.kg),
    zahlungOffen: zahlungOffen(client),
    startMs: parseDatum(client.startDatum),
  };
}

function zahlungOffen(client: Client): boolean {
  if (client.aktiv === false || !hatFestenPreis(client)) return false;
  return !istBezahlt(client, dieserMonat());
}

function Zustand({ zeile }: { zeile: Zeile }) {
  return (
    <div className="flex flex-col items-end gap-1">
      {zeile.offene > 0 ? (
        <Pill tone="negativ">{zeile.offene} offen</Pill>
      ) : zeile.nieCheckin ? (
        <Pill>kein Check-in</Pill>
      ) : (
        // `null` und `0` müssen sich unterscheiden: ein Check-in von heute ist
        // kein fehlender Check-in. Genau das ging bisher verloren.
        <Pill tone={(zeile.tageSeitCheckin ?? 0) > 7 ? 'warnung' : 'positiv'}>
          {zeile.tageSeitCheckin === 0 ? 'heute' : `vor ${zeile.tageSeitCheckin} T`}
        </Pill>
      )}
      <span className="tnum text-[13px] text-muted">
        {zeile.gewicht > 0 ? `${zeile.gewicht} kg` : '–'}
      </span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initialen = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-[15px] font-bold text-muted">
      {initialen || '?'}
    </span>
  );
}
