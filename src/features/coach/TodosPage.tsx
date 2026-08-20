import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheck } from '@/components/icons';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { PillTabs } from '@/components/ui/Controls';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { sortiereTodos, todosFuerKunden, type Todo, type TodoPrio } from '@/domain/checkin';
import { useKundenMitCheckins } from '@/hooks/useCoachData';
import { CheckinSheet, type CheckinMitKunde } from './CheckinSheet';

/**
 * To-Do-Liste des Coaches.
 *
 * Die Meldungen entstehen in `todosFuerKunden` – einer reinen Funktion, die
 * ohne Datenbank prüfbar ist und im Test genau das nachweist, was vorher
 * schieflief: Ein abgehakter Check-in erzeugt keine Meldung mehr.
 *
 * Die Daten kommen aus derselben Abfrage wie Kundenliste und Check-in-Liste;
 * vorher lud dieser Bereich für jeden Kunden noch einmal alle Check-ins
 * einzeln nach.
 */

type Filter = TodoPrio | 'alle';

export default function TodosPage() {
  const navigate = useNavigate();
  const { daten, laedt, neuLaden } = useKundenMitCheckins();

  const [filter, setFilter] = useState<Filter>('alle');
  const [offen, setOffen] = useState<CheckinMitKunde | null>(null);

  const todos = useMemo(() => {
    const liste = (daten ?? []).flatMap(({ client, checkins }) =>
      // Inaktive Kunden erzeugen keine Aufgaben – sie sind ja bewusst pausiert.
      client.aktiv === false ? [] : todosFuerKunden(client, checkins),
    );
    return sortiereTodos(liste);
  }, [daten]);

  const gefiltert = filter === 'alle' ? todos : todos.filter((t) => t.prio === filter);

  const zaehler = {
    kritisch: todos.filter((t) => t.prio === 'kritisch').length,
    wichtig: todos.filter((t) => t.prio === 'wichtig').length,
    optional: todos.filter((t) => t.prio === 'optional').length,
  };

  /** Öffnet bei einer Feedback-Aufgabe direkt den Check-in, sonst die Akte. */
  const oeffnen = (todo: Todo) => {
    if (todo.typ !== 'feedback' || !todo.checkinId) {
      navigate(`/coach/kunden/${todo.clientId}`);
      return;
    }
    const eintrag = (daten ?? [])
      .find(({ client }) => client.id === todo.clientId)
      ?.checkins.find((ci) => ci.id === todo.checkinId);

    if (!eintrag) {
      navigate(`/coach/kunden/${todo.clientId}`);
      return;
    }
    setOffen({ ...eintrag, clientId: todo.clientId, clientName: todo.clientName });
  };

  return (
    <Screen>
      <PageHeader
        title="To-Dos"
        subtitle={laedt ? 'Wird geladen …' : `${todos.length} offene Aufgaben`}
      />

      <div className="mb-5 grid grid-cols-3 gap-2">
        <StatTile
          value={zaehler.kritisch}
          label="Dringend"
          tone={zaehler.kritisch > 0 ? 'negativ' : 'neutral'}
        />
        <StatTile value={zaehler.wichtig} label="Wichtig" />
        <StatTile value={zaehler.optional} label="Kann warten" />
      </div>

      <PillTabs
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'alle', label: 'Alle' },
          { value: 'kritisch', label: 'Dringend' },
          { value: 'wichtig', label: 'Wichtig' },
          { value: 'optional', label: 'Später' },
        ]}
      />

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={<IconCheck size={28} />}
          title="Nichts zu tun"
          description="Alle Kunden sind versorgt. Gute Arbeit."
        />
      ) : (
        <Section>
          <Card padded={false} className="px-4">
            {gefiltert.map((todo, index) => (
              <div key={todo.id}>
                {index > 0 && <Divider />}
                <ListRow
                  title={todo.text}
                  subtitle={`${todo.clientName} · ${todo.sub}`}
                  trailing={<PrioPill prio={todo.prio} />}
                  onClick={() => oeffnen(todo)}
                  chevron
                />
              </div>
            ))}
          </Card>
        </Section>
      )}

      <CheckinSheet
        checkin={offen}
        onClose={() => setOffen(null)}
        onGeaendert={() => {
          // Nach dem Erledigen neu rechnen – die Aufgabe soll sofort weg sein.
          neuLaden();
        }}
      />
    </Screen>
  );
}

function PrioPill({ prio }: { prio: TodoPrio }) {
  if (prio === 'kritisch') return <Pill tone="negativ">dringend</Pill>;
  if (prio === 'wichtig') return <Pill tone="warnung">wichtig</Pill>;
  return <Pill>später</Pill>;
}
