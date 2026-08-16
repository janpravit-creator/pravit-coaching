import { useEffect, useMemo, useState } from 'react';
import { IconCheck, IconTarget } from '@/components/icons';
import { PrimaryButton } from '@/components/ui/Button';
import { Card, Divider, Section, StatTile } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { PageHeader, Pill, ProgressBar, Screen } from '@/components/ui/Layout';
import { ladeCockpit, speichereCockpit, type CockpitDaten } from '@/db/repo/cockpit';
import {
  MEILENSTEINE,
  ZIEL_NETTO,
  aktiveKunden,
  aktuellerMeilenstein,
  aufgabenId,
  einnahmenbild,
  fortschritt,
  kundenstand,
} from '@/domain/cockpit';
import { dieserMonat } from '@/domain/dates';
import { monateDabei } from '@/domain/pakete';
import { monatLabel } from '@/domain/payments';
import { euro, euroKurz } from '@/domain/rechnung';
import { useKunden } from '@/hooks/useCoachData';
import { toast } from '@/state/uiStore';

/**
 * Cockpit: Wo steht das Geschäft im Zwei-Jahres-Plan.
 *
 * Die Online-Einnahmen rechnet die App aus den Kunden aus. Anstellung und
 * Präsenz-Training trägt der Coach ein — ohne sie wäre der Abstand zum
 * Netto-Ziel nur die halbe Wahrheit.
 */
export default function CockpitPage() {
  const { daten: kunden, laedt } = useKunden();
  const [cockpit, setCockpit] = useState<CockpitDaten>({});
  const [geladen, setGeladen] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  const monat = dieserMonat();
  const alle = useMemo(() => kunden ?? [], [kunden]);

  useEffect(() => {
    void ladeCockpit()
      .then(setCockpit)
      .catch(() => undefined)
      .finally(() => setGeladen(true));
  }, []);

  const neben = cockpit.nebeneinnahmen?.[monat] ?? {};
  const erledigt = cockpit.erledigt ?? [];
  const bild = einnahmenbild(alle, neben);
  const anzahl = aktiveKunden(alle);

  /**
   * Monat der Selbstständigkeit: der früheste Kundenstart gilt als Beginn.
   * So muss nirgends ein Datum gepflegt werden, das ohnehin schon in den
   * Daten steckt.
   */
  const monatImPlan = useMemo(() => {
    const werte = alle
      .map((k) => monateDabei(k, monat))
      .filter((m): m is number => m !== null);
    return werte.length > 0 ? Math.max(...werte) : 1;
  }, [alle, monat]);

  const abschnitt = aktuellerMeilenstein(monatImPlan);

  const setzeNeben = (feld: 'anstellung' | 'praesenz', wert: string) => {
    const zahl = Number(wert.replace(',', '.'));
    setCockpit((c) => ({
      ...c,
      nebeneinnahmen: {
        ...c.nebeneinnahmen,
        [monat]: { ...c.nebeneinnahmen?.[monat], [feld]: Number.isFinite(zahl) ? zahl : 0 },
      },
    }));
  };

  const hakeAb = (id: string) => {
    setCockpit((c) => {
      const liste = c.erledigt ?? [];
      return {
        ...c,
        erledigt: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id],
      };
    });
  };

  const sichern = async () => {
    setSpeichert(true);
    try {
      await speichereCockpit(cockpit);
      toast.info('Cockpit gespeichert.');
    } catch (e) {
      toast.info(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSpeichert(false);
    }
  };

  if (laedt || !geladen) {
    return (
      <Screen>
        <PageHeader title="Cockpit" subtitle="Wo du im Zwei-Jahres-Plan stehst." />
        <div className="h-64" aria-busy="true" />
      </Screen>
    );
  }

  return (
    <Screen actionSpace>
      <PageHeader title="Cockpit" subtitle={`Stand ${monatLabel(monat)}`} />

      <Section title="Monat">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatTile value={euroKurz(bild.online)} label="Online" />
          <StatTile value={euroKurz(bild.anstellung)} label="Anstellung" />
          <StatTile value={euroKurz(bild.praesenz)} label="Präsenz-PT" />
        </div>
        <Card>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold">Gesamt</span>
            <span className="tnum text-[26px] font-extrabold tracking-tight">
              {euro(bild.gesamt)}
            </span>
          </div>
          <Divider />
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="text-[14px] text-muted">Rücklage 30 % (Steuern, KV)</span>
            <span className="tnum text-[15px] font-bold text-negative">
              − {euro(bild.ruecklage)}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-[14px] font-semibold">Bleibt</span>
            <span className="tnum text-[18px] font-extrabold">{euro(bild.nachRuecklage)}</span>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-muted">Ziel {euro(ZIEL_NETTO)} netto</span>
              <span
                className={`tnum text-[13px] font-bold ${
                  bild.zielErreicht ? 'text-positive' : 'text-muted'
                }`}
              >
                {bild.zielErreicht
                  ? `+ ${euro(bild.abstandZumZiel)}`
                  : `noch ${euro(-bild.abstandZumZiel)}`}
              </span>
            </div>
            {/* ProgressBar erwartet einen Bruch 0–1, keinen Prozentwert. */}
            <ProgressBar value={Math.min(1, bild.nachRuecklage / ZIEL_NETTO)} />
          </div>
        </Card>
      </Section>

      <Section title="Nebeneinnahmen eintragen">
        <Card>
          <div className="grid grid-cols-2 gap-x-3">
            <TextField
              label="Anstellung"
              inputMode="numeric"
              suffix="€"
              value={String(neben.anstellung ?? '')}
              onChange={(v) => setzeNeben('anstellung', v)}
            />
            <TextField
              label="Präsenz-PT"
              inputMode="numeric"
              suffix="€"
              value={String(neben.praesenz ?? '')}
              onChange={(v) => setzeNeben('praesenz', v)}
            />
          </div>
          <p className="text-[13px] leading-snug text-muted">
            Gilt für {monatLabel(monat)}. Die Rücklage wird nur auf Online und Präsenz gerechnet —
            bei der Anstellung führt der Arbeitgeber bereits ab.
          </p>
        </Card>
      </Section>

      <Section title={`Fahrplan · ${abschnitt.label}`}>
        {MEILENSTEINE.map((m) => {
          const anteil = fortschritt(m, erledigt, anzahl);
          const stand = kundenstand(anzahl, m.zielKunden);
          const aktiv = m.id === abschnitt.id;

          return (
            <Card key={m.id} className={aktiv ? 'mb-3 ring-2 ring-text' : 'mb-3'}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[17px] font-bold tracking-tight">{m.label}</span>
                <span className="tnum text-[13px] font-bold text-muted">
                  {Math.round(anteil * 100)} %
                </span>
              </div>
              <ProgressBar value={anteil} />

              {m.zielKunden && (
                <div className="mt-3 flex items-center gap-2">
                  <Pill
                    tone={
                      stand === 'unter' ? 'warnung' : stand === 'darueber' ? 'positiv' : 'positiv'
                    }
                  >
                    {anzahl} von {m.zielKunden[0]}–{m.zielKunden[1]} Kunden
                  </Pill>
                </div>
              )}

              <div className="mt-2">
                {m.aufgaben.map((a) => {
                  const id = aufgabenId(m, a);
                  const fertig = erledigt.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => hakeAb(id)}
                      className={`flex w-full items-start gap-3 px-1 py-2.5 text-left ${
                        fertig ? 'opacity-55' : ''
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          fertig ? 'bg-positive text-inverted' : 'bg-surface-muted text-subtle'
                        }`}
                      >
                        <IconCheck size={14} />
                      </span>
                      {/* Kein `truncate`: Aufgaben wie „Freiberufler-Status beim
                          Finanzamt klären" wären sonst nicht lesbar. */}
                      <span className="text-[15px] leading-snug font-semibold">{a}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </Section>

      <div className="mt-2">
        <PrimaryButton block disabled={speichert} onClick={() => void sichern()}>
          {speichert ? 'Speichert …' : 'Cockpit speichern'}
        </PrimaryButton>
      </div>

      <div className="mt-6 flex items-center gap-2 px-1 text-[13px] text-muted">
        <IconTarget size={16} />
        <span>
          Monat {monatImPlan} der Selbstständigkeit, abgeleitet aus dem längsten Kundenverhältnis.
        </span>
      </div>
    </Screen>
  );
}
