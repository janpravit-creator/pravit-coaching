import { useEffect, useMemo, useState } from 'react';
import {
  IconCheck,
  IconChevronRight,
  IconPause,
  IconPlay,
  IconPlus,
  IconTimer,
  IconTrash,
} from '@/components/icons';
import { IconButton, PrimaryButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { PillTabs, Slider, Toggle } from '@/components/ui/Controls';
import { TextArea } from '@/components/ui/Field';
import { NumericKeypad, parseGerman } from '@/components/ui/NumericKeypad';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { createLogEntry, deleteLogEntry } from '@/db/repo/logbook';
import type { LogbookEntry, LoggedExercise, LoggedSet, PlanDay } from '@/db/types';
import { heute } from '@/domain/dates';
import {
  elapsedMs,
  formatDuration,
  pauseTiming,
  resumeTiming,
  startTiming,
  type WorkoutTiming,
} from '@/domain/timers';
import { anzahlSaetze, letzteSaetze, trainingsVolumen } from '@/domain/training';
import { useEigenesLogbuch, useEigenesProfil } from '@/hooks/useClientData';
import { useTicker } from '@/hooks/useTicker';
import { dateShort } from '@/lib/format';
import { useAuthStore } from '@/state/authStore';
import { toast } from '@/state/uiStore';

/**
 * Trainings-Logbuch.
 *
 * Gewicht und Wiederholungen werden über den Ziffernblock aus dem
 * Logbuch-Design erfasst statt über Zahlenfelder – große Tasten, keine
 * Systemtastatur, die den halben Bildschirm verdeckt.
 *
 * Der Entwurf liegt im Gerätespeicher: Wer die App mitten im Training
 * schließt, findet alles wieder. Die Uhr rechnet aus Zeitstempeln statt
 * hochzuzählen und stimmt deshalb auch nach einem Neustart.
 */

interface Entwurf {
  datum: string;
  planName: string;
  dayName: string;
  exercises: LoggedExercise[];
  notes: string;
  timing: WorkoutTiming | null;
}

const ENTWURF_KEY = (uid: string) => `pravit_log_entwurf_${uid}`;

function ladeEntwurf(uid: string): Entwurf | null {
  try {
    const raw = localStorage.getItem(ENTWURF_KEY(uid));
    return raw ? (JSON.parse(raw) as Entwurf) : null;
  } catch {
    return null;
  }
}

export default function LogbookPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { daten: profil } = useEigenesProfil();
  const { daten: verlauf, neuLaden } = useEigenesLogbuch();

  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);
  const [planIndex, setPlanIndex] = useState(0);
  const [zeigeLetztes, setZeigeLetztes] = useState(true);
  const [eingabe, setEingabe] = useState<{ exIndex: number; setIndex: number; warmup: boolean } | null>(null);
  const [detail, setDetail] = useState<LogbookEntry | null>(null);
  const [speichert, setSpeichert] = useState(false);

  // Entwurf beim Öffnen zurückholen.
  useEffect(() => {
    if (uid) setEntwurf(ladeEntwurf(uid));
  }, [uid]);

  // Jede Änderung sofort sichern – das Training darf nichts verlieren.
  useEffect(() => {
    if (!uid) return;
    if (entwurf) localStorage.setItem(ENTWURF_KEY(uid), JSON.stringify(entwurf));
    else localStorage.removeItem(ENTWURF_KEY(uid));
  }, [entwurf, uid]);

  const plans = profil?.plans ?? [];
  const now = useTicker(500, entwurf?.timing != null);

  const starteAusPlan = (planName: string, day: PlanDay) => {
    setEntwurf({
      datum: heute(),
      planName,
      dayName: day.name,
      notes: '',
      timing: startTiming(),
      exercises: (day.exercises ?? []).map((ex) => ({
        name: ex.name,
        targetReps: ex.reps ?? '',
        repRange: ex.repRange ?? '',
        warmupSets: [],
        sets: Array.from({ length: Number(ex.sets) || 3 }, (_, i) => ({
          set: i + 1,
          kg: '',
          reps: '',
          rpe: '',
        })),
      })),
    });
  };

  const starteFrei = () => {
    setEntwurf({
      datum: heute(),
      planName: '',
      dayName: '',
      notes: '',
      timing: startTiming(),
      exercises: [],
    });
  };

  const patchEntwurf = (patch: Partial<Entwurf>) =>
    setEntwurf((c) => (c ? { ...c, ...patch } : c));

  const patchSatz = (exIndex: number, setIndex: number, warmup: boolean, patch: Partial<LoggedSet>) => {
    setEntwurf((c) => {
      if (!c) return c;
      const exercises = c.exercises.map((ex, i) => {
        if (i !== exIndex) return ex;
        const liste = warmup ? (ex.warmupSets ?? []) : (ex.sets ?? []);
        const neu = liste.map((s, j) => (j === setIndex ? { ...s, ...patch } : s));
        return warmup ? { ...ex, warmupSets: neu } : { ...ex, sets: neu };
      });
      return { ...c, exercises };
    });
  };

  const speichern = async () => {
    if (!entwurf || !uid || speichert) return;
    setSpeichert(true);
    try {
      const dauer = entwurf.timing ? Math.round(elapsedMs(entwurf.timing) / 60000) : '';
      await createLogEntry(uid, {
        datum: entwurf.datum,
        exercises: entwurf.exercises,
        notes: entwurf.notes,
        planName: entwurf.planName,
        dayName: entwurf.dayName,
        durationMin: String(dauer),
      });
      setEntwurf(null);
      neuLaden();
      toast.success('Training gespeichert. Dein Coach sieht deinen Fortschritt.');
    } catch {
      toast.error('Speichern fehlgeschlagen – dein Entwurf bleibt erhalten.');
    } finally {
      setSpeichert(false);
    }
  };

  /* ---------------- Kein Training offen: Auswahl ---------------- */
  if (!entwurf) {
    return (
      <Screen>
        <PageHeader title="Logbuch" subtitle="Trag ein, was du bewegt hast." />

        <Section title="Training starten">
          {plans.length > 1 && (
            <PillTabs
              className="mb-3"
              value={planIndex}
              onChange={setPlanIndex}
              options={plans.map((p, i) => ({ value: i, label: p.name }))}
            />
          )}

          {plans.length > 0 && (
            <Card padded={false} className="px-4">
              {(plans[planIndex]?.days ?? []).map((day, index) => (
                <div key={`${day.name}-${index}`}>
                  {index > 0 && <Divider />}
                  <ListRow
                    title={day.name}
                    subtitle={`${day.exercises?.length ?? 0} Übungen`}
                    onClick={() => starteAusPlan(plans[planIndex]!.name, day)}
                    chevron
                  />
                </div>
              ))}
            </Card>
          )}

          <div className="mt-3">
            <SecondaryButton block onClick={starteFrei} icon={<IconPlus size={18} />}>
              Freies Training
            </SecondaryButton>
          </div>
        </Section>

        <Section title="Deine Trainings">
          {verlauf && verlauf.length === 0 ? (
            <EmptyState
              icon={<IconTimer size={26} />}
              title="Noch kein Training erfasst"
              description="Wähle oben eine Einheit aus deinem Plan – oder starte frei."
            />
          ) : (
            <Card padded={false} className="px-4">
              {(verlauf ?? []).map((e, index) => (
                <div key={e.id}>
                  {index > 0 && <Divider />}
                  <ListRow
                    title={e.planName ? `${e.planName}${e.dayName ? ` · ${e.dayName}` : ''}` : 'Freies Training'}
                    subtitle={`${e.datum ? dateShort(new Date(`${e.datum}T12:00:00`).getTime()) : ''} · ${e.exercises?.length ?? 0} Übungen`}
                    trailing={
                      e.durationMin ? <Pill>{e.durationMin} Min</Pill> : undefined
                    }
                    onClick={() => setDetail(e)}
                    chevron
                  />
                </div>
              ))}
            </Card>
          )}
        </Section>

        <TrainingDetail
          entry={detail}
          onClose={() => setDetail(null)}
          onDelete={async (id) => {
            if (!uid) return;
            await deleteLogEntry(uid, id);
            setDetail(null);
            neuLaden();
            toast.info('Training gelöscht');
          }}
        />
      </Screen>
    );
  }

  /* ---------------- Laufendes Training ---------------- */
  const pausiert = entwurf.timing?.pausedAt != null;
  const aktiveUebung = eingabe ? entwurf.exercises[eingabe.exIndex] : null;
  const aktiverSatz = aktiveUebung
    ? (eingabe!.warmup ? aktiveUebung.warmupSets : aktiveUebung.sets)?.[eingabe!.setIndex]
    : null;

  return (
    <Screen actionSpace>
      <PageHeader
        title={entwurf.dayName || entwurf.planName || 'Freies Training'}
        subtitle={entwurf.planName && entwurf.dayName ? entwurf.planName : 'Läuft'}
        trailing={
          <div className="flex items-center gap-2">
            <span className="tnum text-[18px] font-extrabold tracking-tight">
              {entwurf.timing ? formatDuration(elapsedMs(entwurf.timing, now)) : '0:00'}
            </span>
            <IconButton
              label={pausiert ? 'Fortsetzen' : 'Anhalten'}
              onClick={() =>
                patchEntwurf({
                  timing: entwurf.timing
                    ? pausiert
                      ? resumeTiming(entwurf.timing)
                      : pauseTiming(entwurf.timing)
                    : startTiming(),
                })
              }
            >
              {pausiert ? <IconPlay size={19} /> : <IconPause size={19} />}
            </IconButton>
          </div>
        }
      />

      <div className="mb-4">
        <Toggle
          checked={zeigeLetztes}
          onChange={setZeigeLetztes}
          label="Letztes Training anzeigen"
          description="Zeigt unter jedem Satz, was du beim letzten Mal geschafft hast."
        />
      </div>

      {entwurf.exercises.map((ex, exIndex) => (
        <UebungsKarte
          key={`${ex.name}-${exIndex}`}
          uebung={ex}
          verlauf={verlauf ?? []}
          zeigeLetztes={zeigeLetztes}
          onSatzAntippen={(setIndex, warmup) => setEingabe({ exIndex, setIndex, warmup })}
          onAufwaermenHinzu={() =>
            setEntwurf((c) => {
              if (!c) return c;
              const exercises = c.exercises.map((e, i) =>
                i === exIndex
                  ? {
                      ...e,
                      warmupSets: [
                        ...(e.warmupSets ?? []),
                        { set: `W${(e.warmupSets?.length ?? 0) + 1}`, kg: '', reps: '' },
                      ],
                    }
                  : e,
              );
              return { ...c, exercises };
            })
          }
          onSatzHinzu={() =>
            setEntwurf((c) => {
              if (!c) return c;
              const exercises = c.exercises.map((e, i) =>
                i === exIndex
                  ? { ...e, sets: [...(e.sets ?? []), { set: (e.sets?.length ?? 0) + 1, kg: '', reps: '', rpe: '' }] }
                  : e,
              );
              return { ...c, exercises };
            })
          }
          onEntfernen={() =>
            setEntwurf((c) =>
              c ? { ...c, exercises: c.exercises.filter((_, i) => i !== exIndex) } : c,
            )
          }
        />
      ))}

      <div className="mb-5">
        <SecondaryButton
          block
          icon={<IconPlus size={18} />}
          onClick={() => {
            const name = window.prompt('Name der Übung');
            if (!name?.trim()) return;
            setEntwurf((c) =>
              c
                ? {
                    ...c,
                    exercises: [
                      ...c.exercises,
                      { name: name.trim(), warmupSets: [], sets: [{ set: 1, kg: '', reps: '', rpe: '' }] },
                    ],
                  }
                : c,
            );
          }}
        >
          Übung hinzufügen
        </SecondaryButton>
      </div>

      <Card className="mb-5">
        <TextArea
          label="Notiz zum Training"
          rows={3}
          value={entwurf.notes}
          onChange={(v) => patchEntwurf({ notes: v })}
          placeholder="Wie hat es sich angefühlt?"
        />
      </Card>

      <PrimaryButton
        block
        tone="positiv"
        onClick={speichern}
        disabled={speichert || entwurf.exercises.length === 0}
        icon={<IconCheck size={20} />}
      >
        {speichert ? 'Wird gespeichert …' : 'Training beenden'}
      </PrimaryButton>

      <div className="mt-4 text-center">
        <TextButton
          tone="negativ"
          onClick={() => {
            if (window.confirm('Training verwerfen? Alle Eingaben gehen verloren.')) {
              setEntwurf(null);
            }
          }}
        >
          Training verwerfen
        </TextButton>
      </div>

      {/* Ziffernblock für Gewicht und Wiederholungen */}
      <SatzEingabe
        offen={eingabe !== null}
        onClose={() => setEingabe(null)}
        uebungsName={aktiveUebung?.name ?? ''}
        satz={aktiverSatz ?? null}
        istAufwaermen={eingabe?.warmup ?? false}
        onSpeichern={(patch) => {
          if (!eingabe) return;
          patchSatz(eingabe.exIndex, eingabe.setIndex, eingabe.warmup, patch);
          setEingabe(null);
        }}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Übungskarte
 * ------------------------------------------------------------------ */

function UebungsKarte({
  uebung,
  verlauf,
  zeigeLetztes,
  onSatzAntippen,
  onAufwaermenHinzu,
  onSatzHinzu,
  onEntfernen,
}: {
  uebung: LoggedExercise;
  verlauf: LogbookEntry[];
  zeigeLetztes: boolean;
  onSatzAntippen: (setIndex: number, warmup: boolean) => void;
  onAufwaermenHinzu: () => void;
  onSatzHinzu: () => void;
  onEntfernen: () => void;
}) {
  const letzte = useMemo(
    () => (zeigeLetztes ? letzteSaetze(verlauf, uebung.name) : null),
    [verlauf, uebung.name, zeigeLetztes],
  );

  return (
    <Card className="mb-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] leading-tight font-extrabold tracking-tight">{uebung.name}</h2>
          {uebung.repRange && (
            <p className="mt-0.5 text-[13px] text-muted">Ziel {uebung.repRange} Wdh</p>
          )}
        </div>
        <IconButton label="Übung entfernen" variant="blank" onClick={onEntfernen}>
          <IconTrash size={18} />
        </IconButton>
      </div>

      {letzte && (
        <p className="mt-2 text-[13px] text-muted">
          Letztes Mal ({letzte.datum}):{' '}
          {letzte.sets.map((s) => `${s.kg}×${s.reps}`).join(' · ')}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {(uebung.warmupSets ?? []).map((s, i) => (
          <SatzZeile key={`w${i}`} satz={s} warmup onClick={() => onSatzAntippen(i, true)} />
        ))}
        {(uebung.sets ?? []).map((s, i) => (
          <SatzZeile
            key={`s${i}`}
            satz={s}
            letzterWert={letzte?.sets[i]}
            onClick={() => onSatzAntippen(i, false)}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <SecondaryButton block onClick={onAufwaermenHinzu}>
          Aufwärmsatz
        </SecondaryButton>
        <SecondaryButton block onClick={onSatzHinzu} icon={<IconPlus size={17} />}>
          Satz
        </SecondaryButton>
      </div>
    </Card>
  );
}

function SatzZeile({
  satz,
  warmup = false,
  letzterWert,
  onClick,
}: {
  satz: LoggedSet;
  warmup?: boolean;
  letzterWert?: LoggedSet | undefined;
  onClick: () => void;
}) {
  const befuellt = satz.kg !== '' && satz.reps !== '';

  return (
    <button
      onClick={onClick}
      aria-label={`${warmup ? 'Aufwärmsatz' : 'Satz'} ${satz.set} eintragen`}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
        befuellt ? 'bg-positive-soft' : 'bg-surface-muted',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
          warmup ? 'text-subtle' : 'bg-surface text-muted',
        )}
      >
        {warmup ? 'W' : satz.set}
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn('tnum block text-[17px] font-bold', !befuellt && 'text-subtle')}>
          {befuellt ? `${satz.kg} kg × ${satz.reps}` : '— kg × —'}
        </span>
        {letzterWert && (
          <span className="tnum mt-0.5 block text-[12px] text-subtle">
            zuletzt {letzterWert.kg} kg × {letzterWert.reps}
          </span>
        )}
      </span>

      {satz.rpe && <Pill>RPE {satz.rpe}</Pill>}
      <IconChevronRight size={17} className="shrink-0 text-subtle" />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Satzeingabe mit Ziffernblock
 * ------------------------------------------------------------------ */

function SatzEingabe({
  offen,
  onClose,
  uebungsName,
  satz,
  istAufwaermen,
  onSpeichern,
}: {
  offen: boolean;
  onClose: () => void;
  uebungsName: string;
  satz: LoggedSet | null;
  istAufwaermen: boolean;
  onSpeichern: (patch: Partial<LoggedSet>) => void;
}) {
  const [kg, setKg] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [feld, setFeld] = useState<'kg' | 'reps'>('kg');

  useEffect(() => {
    if (!offen || !satz) return;
    setKg(satz.kg ?? '');
    setReps(satz.reps ?? '');
    setRpe(satz.rpe ? Number(satz.rpe) : null);
    setFeld(satz.kg ? 'reps' : 'kg');
  }, [offen, satz]);

  if (!satz) return null;

  const gueltig = parseGerman(kg) !== null && parseGerman(reps) !== null;

  return (
    <Sheet
      open={offen}
      onClose={onClose}
      title={uebungsName}
      subtitle={`${istAufwaermen ? 'Aufwärmsatz' : 'Satz'} ${satz.set}`}
      footer={
        <PrimaryButton
          block
          disabled={!gueltig}
          icon={<IconCheck size={20} />}
          onClick={() =>
            onSpeichern({
              kg,
              reps,
              ...(istAufwaermen ? {} : { rpe: rpe === null ? '' : String(rpe) }),
            })
          }
        >
          Satz speichern
        </PrimaryButton>
      }
    >
      <div className="flex gap-3">
        <WertFeld label="Gewicht" unit="kg" value={kg} active={feld === 'kg'} onFocus={() => setFeld('kg')} />
        <WertFeld label="Wiederholungen" value={reps} active={feld === 'reps'} onFocus={() => setFeld('reps')} />
      </div>

      <div className="mt-5">
        <NumericKeypad
          value={feld === 'kg' ? kg : reps}
          onChange={(v) => (feld === 'kg' ? setKg(v) : setReps(v))}
          allowDecimal={feld === 'kg'}
          maxLength={feld === 'kg' ? 6 : 3}
        />
      </div>

      {!istAufwaermen && (
        <div className="mt-2">
          <Slider
            label="RPE"
            value={rpe}
            onChange={setRpe}
            min={5}
            max={10}
            valueLabel={rpe === null ? 'nicht erfasst' : String(rpe)}
            hint="Wie anstrengend war der Satz? 10 = keine Wiederholung mehr möglich."
          />
        </div>
      )}
    </Sheet>
  );
}

function WertFeld({
  label,
  value,
  unit,
  active,
  onFocus,
}: {
  label: string;
  value: string;
  unit?: string;
  active: boolean;
  onFocus: () => void;
}) {
  return (
    <button
      onClick={onFocus}
      className={cn(
        'flex-1 rounded-[var(--radius-card)] bg-surface-muted px-4 py-4 text-left transition-shadow',
        active && 'ring-2 ring-text',
      )}
    >
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            'tnum text-[32px] leading-none font-extrabold tracking-tight',
            value === '' && 'text-subtle',
          )}
        >
          {value === '' ? '0' : value}
        </span>
        {unit && <span className="text-[15px] font-bold text-muted">{unit}</span>}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Trainingsdetail
 * ------------------------------------------------------------------ */

function TrainingDetail({
  entry,
  onClose,
  onDelete,
}: {
  entry: LogbookEntry | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  if (!entry) return null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={entry.planName ? `${entry.planName}${entry.dayName ? ` · ${entry.dayName}` : ''}` : 'Freies Training'}
      subtitle={entry.datum}
      fullHeight
      footer={
        <SecondaryButton
          block
          className="text-negative"
          icon={<IconTrash size={18} />}
          onClick={() => onDelete(entry.id)}
        >
          Training löschen
        </SecondaryButton>
      }
    >
      <div className="mb-5 grid grid-cols-3 gap-2">
        <StatTile value={entry.exercises?.length ?? 0} label="Übungen" />
        <StatTile value={anzahlSaetze(entry)} label="Sätze" />
        <StatTile value={`${Math.round(trainingsVolumen(entry))} kg`} label="Volumen" />
      </div>

      {(entry.exercises ?? []).map((ex, index) => (
        <div key={index} className="mb-4">
          <h3 className="mb-1.5 text-[16px] font-bold tracking-tight">{ex.name}</h3>
          <div className="space-y-1">
            {[...(ex.warmupSets ?? []), ...(ex.sets ?? [])].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-[15px]">
                <span className="w-6 shrink-0 text-[13px] font-bold text-subtle">{s.set}</span>
                <span className="tnum flex-1 font-semibold">
                  {s.kg || '—'} kg × {s.reps || '—'}
                </span>
                {s.rpe && <span className="text-[12px] text-subtle">RPE {s.rpe}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {entry.notes && (
        <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {entry.notes}
        </p>
      )}
    </Sheet>
  );
}
