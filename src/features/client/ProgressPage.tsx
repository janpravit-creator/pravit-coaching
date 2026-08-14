import { useMemo, useState } from 'react';
import { ProgressLineChart } from '@/components/charts/LineChart';
import { IconChart } from '@/components/icons';
import { Card, Section, StatTile } from '@/components/ui/Card';
import { PillTabs } from '@/components/ui/Controls';
import { EmptyState, PageHeader, Screen } from '@/components/ui/Layout';
import { parseDatum } from '@/domain/dates';
import { zahl } from '@/domain/nutrition';
import {
  KENNZAHL_LABEL,
  anzahlSaetze,
  trainingsVolumen,
  uebungsVerlauf,
  vorkommendeUebungen,
  type UebungsKennzahl,
} from '@/domain/training';
import { useEigeneCheckins, useEigenesLogbuch } from '@/hooks/useClientData';

/** Fortschritt: Gewichtsverlauf aus den Check-ins und Übungsverläufe aus dem Logbuch. */
export default function ProgressPage() {
  const { daten: checkins } = useEigeneCheckins();
  const { daten: logbuch } = useEigenesLogbuch();

  const [kennzahl, setKennzahl] = useState<UebungsKennzahl>('e1rm');
  const [uebung, setUebung] = useState<string | null>(null);

  const gewichtsVerlauf = useMemo(
    () =>
      (checkins ?? [])
        .filter((ci) => zahl(ci.kg) > 0)
        .map((ci) => ({ t: parseDatum(ci.datum) ?? 0, value: zahl(ci.kg) }))
        .filter((p) => p.t > 0)
        .sort((a, b) => a.t - b.t),
    [checkins],
  );

  const uebungen = useMemo(() => vorkommendeUebungen(logbuch ?? []), [logbuch]);
  const gewaehlt = uebung ?? uebungen[0] ?? null;

  const verlauf = useMemo(
    () => (gewaehlt ? uebungsVerlauf(logbuch ?? [], gewaehlt, kennzahl) : []),
    [logbuch, gewaehlt, kennzahl],
  );

  const summe = useMemo(() => {
    const eintraege = logbuch ?? [];
    return {
      trainings: eintraege.length,
      saetze: eintraege.reduce((s, e) => s + anzahlSaetze(e), 0),
      volumen: Math.round(eintraege.reduce((s, e) => s + trainingsVolumen(e), 0)),
    };
  }, [logbuch]);

  const leer = gewichtsVerlauf.length === 0 && uebungen.length === 0;

  return (
    <Screen>
      <PageHeader title="Fortschritt" subtitle="Deine Entwicklung über die Zeit." />

      {leer && (
        <EmptyState
          icon={<IconChart size={28} />}
          title="Noch keine Auswertung"
          description="Nach deinem ersten Check-in und Training erscheinen hier deine Kurven."
        />
      )}

      {!leer && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-2">
            <StatTile value={summe.trainings} label="Trainings" />
            <StatTile value={summe.saetze} label="Sätze" />
            <StatTile
              value={summe.volumen >= 10000 ? `${Math.round(summe.volumen / 1000)} t` : `${summe.volumen} kg`}
              label="Volumen"
            />
          </div>

          {gewichtsVerlauf.length >= 2 && (
            <Section title="Gewicht">
              <Card>
                <ProgressLineChart data={gewichtsVerlauf} unit="kg" />
              </Card>
            </Section>
          )}

          {uebungen.length > 0 && (
            <Section title="Übungen">
              <div className="scroll-x -mx-5 mb-3 px-5">
                <PillTabs
                  value={gewaehlt ?? ''}
                  onChange={(v) => setUebung(String(v))}
                  options={uebungen.slice(0, 12).map((name) => ({ value: name, label: name }))}
                />
              </div>

              <Card>
                <PillTabs
                  className="mb-4"
                  value={kennzahl}
                  onChange={setKennzahl}
                  options={[
                    { value: 'e1rm', label: '1RM' },
                    { value: 'gewicht', label: 'Gewicht' },
                    { value: 'volumen', label: 'Volumen' },
                  ]}
                />
                <ProgressLineChart data={verlauf} unit="kg" />
                <p className="mt-2 text-center text-[12px] text-muted">
                  {KENNZAHL_LABEL[kennzahl]}
                </p>
              </Card>
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}
