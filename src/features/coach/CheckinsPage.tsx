import { useMemo, useState } from 'react';
import { IconCheck } from '@/components/icons';
import { PrimaryButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { ConfirmSheet, useConfirm } from '@/components/ui/Confirm';
import { PillTabs } from '@/components/ui/Controls';
import { SearchField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { markiereAlleErledigt } from '@/db/repo/checkins';
import { clientName } from '@/db/types';
import { hatFeedback, istErledigt, istOffen } from '@/domain/checkin';
import { neuesteZuerst } from '@/domain/dates';
import { useKundenMitCheckins } from '@/hooks/useCoachData';
import { toast } from '@/state/uiStore';
import { CheckinSheet, type CheckinMitKunde } from './CheckinSheet';

/**
 * Alle Check-ins über alle Kunden.
 *
 * „Offen" heißt hier dasselbe wie in der To-Do-Liste – beides fragt
 * `istOffen`. Genau daran hakte es bisher: Diese Liste räumte über
 * `seenByCoach` auf, die To-Dos lasen `coachFeedback`, und die Meldung blieb
 * stehen, obwohl der Check-in hier längst verschwunden war.
 */

type Filter = 'offen' | 'alle' | 'erledigt';

export default function CheckinsPage() {
  const { daten, laedt, neuLaden } = useKundenMitCheckins();
  const confirm = useConfirm();

  const [filter, setFilter] = useState<Filter>('offen');
  const [suche, setSuche] = useState('');
  const [offen, setOffen] = useState<CheckinMitKunde | null>(null);

  const alle = useMemo<CheckinMitKunde[]>(() => {
    const liste = (daten ?? []).flatMap(({ client, checkins }) =>
      checkins.map((ci) => ({
        ...ci,
        clientId: client.id,
        clientName: ci.clientName ?? clientName(client),
      })),
    );
    return liste.sort(neuesteZuerst);
  }, [daten]);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return alle.filter((ci) => {
      if (filter === 'offen' && !istOffen(ci)) return false;
      if (filter === 'erledigt' && !istErledigt(ci)) return false;
      if (q && !(ci.clientName ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [alle, filter, suche]);

  const offeneAnzahl = alle.filter(istOffen).length;

  const alleAbhaken = () => {
    const offeneProKunde = new Map<string, CheckinMitKunde[]>();
    for (const ci of alle.filter(istOffen)) {
      const liste = offeneProKunde.get(ci.clientId);
      if (liste) liste.push(ci);
      else offeneProKunde.set(ci.clientId, [ci]);
    }

    confirm.fragen({
      title: `${offeneAnzahl} Check-ins abhaken?`,
      description:
        'Sie verschwinden aus dieser Liste und aus den To-Dos. Feedback kannst du danach trotzdem noch schreiben.',
      confirmLabel: 'Alle abhaken',
      onConfirm: async () => {
        await Promise.all(
          [...offeneProKunde.entries()].map(([clientId, liste]) =>
            markiereAlleErledigt(clientId, liste),
          ),
        );
        toast.success('Alle offenen Check-ins abgehakt.');
        neuLaden();
      },
    });
  };

  return (
    <Screen>
      <PageHeader
        title="Check-ins"
        subtitle={laedt ? 'Wird geladen …' : `${offeneAnzahl} offen · ${alle.length} gesamt`}
      />

      <div className="mb-5 grid grid-cols-3 gap-2">
        <StatTile value={offeneAnzahl} label="Offen" tone={offeneAnzahl > 0 ? 'negativ' : 'neutral'} />
        <StatTile value={alle.filter(hatFeedback).length} label="Beantwortet" />
        <StatTile value={alle.length} label="Gesamt" />
      </div>

      <SearchField value={suche} onChange={setSuche} placeholder="Kunde suchen …" className="mb-3" />

      <PillTabs
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'offen', label: `Offen${offeneAnzahl > 0 ? ` (${offeneAnzahl})` : ''}` },
          { value: 'erledigt', label: 'Erledigt' },
          { value: 'alle', label: 'Alle' },
        ]}
      />

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={<IconCheck size={28} />}
          title={filter === 'offen' ? 'Alles beantwortet' : 'Nichts gefunden'}
          description={
            filter === 'offen'
              ? 'Kein Check-in wartet gerade auf dich.'
              : 'Für diese Auswahl gibt es keine Check-ins.'
          }
        />
      ) : (
        <Section>
          <Card padded={false} className="px-4">
            {gefiltert.map((ci, index) => (
              <div key={`${ci.clientId}-${ci.id}`}>
                {index > 0 && <Divider />}
                <ListRow
                  title={ci.clientName ?? 'Ohne Namen'}
                  subtitle={[ci.datum ?? 'ohne Datum', ci.kg ? `${ci.kg} kg` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={
                    istOffen(ci) ? (
                      <Pill tone="warnung">offen</Pill>
                    ) : hatFeedback(ci) ? (
                      <Pill tone="positiv">beantwortet</Pill>
                    ) : (
                      <Pill>abgehakt</Pill>
                    )
                  }
                  onClick={() => setOffen(ci)}
                  chevron
                />
              </div>
            ))}
          </Card>
        </Section>
      )}

      {offeneAnzahl > 0 && filter === 'offen' && (
        <PrimaryButton block onClick={alleAbhaken} icon={<IconCheck size={20} />}>
          Alle {offeneAnzahl} abhaken
        </PrimaryButton>
      )}

      <CheckinSheet checkin={offen} onClose={() => setOffen(null)} onGeaendert={neuLaden} />
      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </Screen>
  );
}
