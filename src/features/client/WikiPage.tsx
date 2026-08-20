import { useMemo, useState } from 'react';
import { IconChevronDown, IconDumbbell, IconSearch } from '@/components/icons';
import { Card, Divider, Section } from '@/components/ui/Card';
import { PillTabs } from '@/components/ui/Controls';
import { SearchField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { MUSKELGRUPPEN, type LibraryExercise } from '@/db/types';
import { useUebungsBibliothek } from '@/hooks/useClientData';
import { cn } from '@/lib/cn';
import { WIKI_KAPITEL, type WikiAbschnitt } from './wikiInhalte';

/**
 * Gym-Wiki.
 *
 * Die Wissenskapitel und die Übungsdatenbank liegen unter denselben Reitern.
 * Die Datenbank kam bisher als eigener, anders aussehender Block dazu –
 * jetzt ist sie einfach das letzte Kapitel.
 */
export default function WikiPage() {
  const [kapitel, setKapitel] = useState<string>(WIKI_KAPITEL[0]?.titel ?? 'Training');

  const optionen = [
    ...WIKI_KAPITEL.map((k) => ({ value: k.titel, label: k.titel })),
    { value: 'Übungen', label: 'Übungen' },
  ];

  const aktiv = WIKI_KAPITEL.find((k) => k.titel === kapitel);

  return (
    <Screen>
      <PageHeader title="Wiki" subtitle="Das Wichtigste auf einen Blick." />

      <div className="scroll-x -mx-5 mb-6 px-5">
        <PillTabs
          scrollable
          value={kapitel}
          onChange={(v) => setKapitel(String(v))}
          options={optionen}
        />
      </div>

      {kapitel === 'Übungen' ? (
        <UebungsDatenbank />
      ) : (
        <>
          {aktiv?.banner && (
            <Card className="mb-6 flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-muted">{aktiv.banner.links}</span>
              <span className="text-[19px] font-extrabold tracking-tight">
                {aktiv.banner.rechts}
              </span>
            </Card>
          )}

          {(aktiv?.abschnitte ?? []).map((abschnitt) => (
            <AbschnittsKarte key={abschnitt.titel} abschnitt={abschnitt} />
          ))}
        </>
      )}
    </Screen>
  );
}

function AbschnittsKarte({ abschnitt }: { abschnitt: WikiAbschnitt }) {
  return (
    <Section title={abschnitt.titel}>
      <Card padded={false} className="px-5">
        {abschnitt.zeilen?.map((zeile, index) => (
          <div key={zeile.begriff}>
            {index > 0 && <Divider />}
            <div className="py-3.5">
              {zeile.url ? (
                <a
                  href={zeile.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[15px] font-bold tracking-tight underline decoration-line-strong underline-offset-4"
                >
                  {zeile.begriff}
                </a>
              ) : (
                <div className="text-[15px] font-bold tracking-tight">{zeile.begriff}</div>
              )}
              <div className="mt-1 text-[14px] leading-relaxed text-muted">{zeile.wert}</div>
            </div>
          </div>
        ))}

        {abschnitt.punkte?.map((punkt, index) => (
          <div key={punkt}>
            {index > 0 && <Divider />}
            <div className="flex gap-3 py-3.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-subtle" />
              <span className="text-[15px] leading-relaxed">{punkt}</span>
            </div>
          </div>
        ))}
      </Card>
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Übungsdatenbank
 * ------------------------------------------------------------------ */

function UebungsDatenbank() {
  const { daten: uebungen, laedt } = useUebungsBibliothek();
  const [suche, setSuche] = useState('');
  const [gruppe, setGruppe] = useState<string>('');
  const [offen, setOffen] = useState<Set<string>>(new Set());

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return (uebungen ?? []).filter((e) => {
      if (q && !(e.name ?? '').toLowerCase().includes(q)) return false;
      if (gruppe && e.muscleGroup !== gruppe) return false;
      return true;
    });
  }, [uebungen, suche, gruppe]);

  /** Nach Muskelgruppe gebündelt, in der gewohnten Reihenfolge. */
  const gruppen = useMemo(() => {
    const map = new Map<string, LibraryExercise[]>();
    for (const ex of gefiltert) {
      const key = ex.muscleGroup || 'Sonstige';
      const liste = map.get(key);
      if (liste) liste.push(ex);
      else map.set(key, [ex]);
    }
    const bekannt = [...MUSKELGRUPPEN, 'Sonstige'].filter((g) => map.has(g));
    const rest = [...map.keys()].filter((g) => !bekannt.includes(g as never));
    return [...bekannt, ...rest].map((name) => ({ name, eintraege: map.get(name) ?? [] }));
  }, [gefiltert]);

  // Bei aktiver Suche alles aufklappen – sonst müsste man die Treffer suchen,
  // die man gerade gesucht hat.
  const filtert = suche.trim() !== '' || gruppe !== '';

  if (laedt) return <div className="h-40" aria-busy="true" />;

  if ((uebungen ?? []).length === 0) {
    return (
      <EmptyState
        icon={<IconDumbbell size={28} />}
        title="Noch keine Übungen"
        description="Übungen erscheinen hier automatisch, sobald dein Coach sie in einem Trainingsplan verwendet."
      />
    );
  }

  return (
    <>
      <SearchField
        value={suche}
        onChange={setSuche}
        placeholder="Übung suchen …"
        className="mb-3"
      />

      <div className="scroll-x -mx-5 mb-5 px-5">
        <PillTabs
          scrollable
          value={gruppe}
          onChange={(v) => setGruppe(String(v))}
          options={[
            { value: '', label: 'Alle' },
            ...MUSKELGRUPPEN.map((g) => ({ value: g, label: g })),
          ]}
        />
      </div>

      {gruppen.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={26} />}
          title="Keine Übung gefunden"
          description="Versuch einen anderen Suchbegriff oder eine andere Muskelgruppe."
        />
      ) : (
        <div className="space-y-2.5">
          {gruppen.map(({ name, eintraege }) => {
            const auf = filtert || offen.has(name);
            return (
              <Card key={name} padded={false} className="px-5">
                <button
                  onClick={() =>
                    setOffen((s) => {
                      const next = new Set(s);
                      if (next.has(name)) next.delete(name);
                      else next.add(name);
                      return next;
                    })
                  }
                  aria-expanded={auf}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left"
                >
                  <span className="text-[16px] font-bold tracking-tight">{name}</span>
                  <span className="flex items-center gap-2">
                    <Pill>{eintraege.length}</Pill>
                    <IconChevronDown
                      size={18}
                      className={cn(
                        'text-subtle transition-transform duration-200',
                        auf && 'rotate-180',
                      )}
                    />
                  </span>
                </button>

                {auf && (
                  <div className="pb-2">
                    {eintraege.map((ex) => (
                      <div key={ex.id}>
                        <Divider />
                        <div className="flex items-center justify-between gap-3 py-3">
                          <span className="min-w-0 flex-1 text-[15px]">{ex.name}</span>
                          {ex.equipment && (
                            <span className="shrink-0 text-[13px] text-muted">{ex.equipment}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
