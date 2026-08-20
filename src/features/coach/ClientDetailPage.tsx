import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProgressLineChart } from '@/components/charts/LineChart';
import {
  IconBook,
  IconCheck,
  IconChevronDown,
  IconFlame,
  IconMoney,
  IconPause,
  IconPlay,
  IconTrash,
} from '@/components/icons';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { ConfirmSheet, useConfirm } from '@/components/ui/Confirm';
import { PillTabs } from '@/components/ui/Controls';
import { DateField } from '@/components/ui/DateField';
import { OptionGrid, TextArea, TextField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import {
  deleteClient,
  saveCalorieTarget,
  saveCoachNotes,
  saveMealPlans,
  saveSupplements,
  saveTrainingPlans,
  saveZahlungen,
  updateClient,
} from '@/db/repo/clients';
import { listTemplates, vorlagenArt } from '@/db/repo/library';
import { deleteLogEntry } from '@/db/repo/logbook';
import {
  clientName,
  type Checkin,
  type Client,
  type LogbookEntry,
  type MealPlan,
  type Supplement,
  type Template,
  type TrainingPlan,
} from '@/db/types';
import { PAKETE, WAEHLBARE_PAKETE, aktuellerPreis, paketName, preislage } from '@/domain/pakete';
import { istOffen } from '@/domain/checkin';
import { dieserMonat, parseDatum } from '@/domain/dates';
import { zahl } from '@/domain/nutrition';
import { hatFestenPreis, istBezahlt, monatLabel, setzeZahlung } from '@/domain/payments';
import { anzahlSaetze, trainingsVolumen } from '@/domain/training';
import { useKundeDetail, useLebensmittel, useUebungen } from '@/hooks/useCoachData';
import { cn } from '@/lib/cn';
import { toast } from '@/state/uiStore';
import { PROFIL_FELDER, profilWerte } from '../profilFelder';
import { CheckinSheet, type CheckinMitKunde } from './CheckinSheet';
import { Rechnung } from './Rechnung';
import { CalorieCalculator } from './editors/CalorieCalculator';
import { MealPlanEditor } from './editors/MealPlanEditor';
import { SupplementEditor } from './editors/SupplementEditor';
import { TrainingPlanEditor } from './editors/TrainingPlanEditor';

/**
 * Kundenakte.
 *
 * Bisher lagen hier neun aufklappbare Karten übereinander, jede mit eigenem
 * Speichern-Knopf und eigener Optik. Daraus werden vier Bereiche mit einem
 * Umschalter oben – man arbeitet ohnehin immer nur an einem davon.
 */

type Bereich = 'ueberblick' | 'plaene' | 'checkins' | 'profil';

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { daten, laedt, neuLaden } = useKundeDetail(clientId);
  const [bereich, setBereich] = useState<Bereich>('ueberblick');

  // Nur beim allerersten Laden die Fläche leeren. Beim Nachladen nach dem
  // Speichern bleibt der Bildschirm stehen – sonst verlöre man angefangene
  // Änderungen in den anderen Bereichen.
  if (laedt && daten === undefined) {
    return (
      <Screen>
        <PageHeader title="Kunde" onBack={() => navigate('/coach/kunden')} large={false} />
        <div className="h-40" aria-busy="true" />
      </Screen>
    );
  }

  if (!daten) {
    return (
      <Screen>
        <PageHeader title="Kunde" onBack={() => navigate('/coach/kunden')} large={false} />
        <EmptyState
          title="Kunde nicht gefunden"
          description="Vielleicht wurde das Profil inzwischen gelöscht."
        />
      </Screen>
    );
  }

  const { client, checkins, logbuch } = daten;

  return (
    <Screen>
      <PageHeader
        title={clientName(client)}
        subtitle={[client.email, client.tel].filter(Boolean).join(' · ')}
        onBack={() => navigate('/coach/kunden')}
        large={false}
      />

      <PillTabs
        className="mb-6"
        value={bereich}
        onChange={setBereich}
        options={[
          { value: 'ueberblick', label: 'Überblick' },
          { value: 'plaene', label: 'Pläne' },
          { value: 'checkins', label: 'Check-ins' },
          { value: 'profil', label: 'Profil' },
        ]}
      />

      {bereich === 'ueberblick' && (
        <Ueberblick client={client} checkins={checkins} logbuch={logbuch} onGeaendert={neuLaden} />
      )}
      {bereich === 'plaene' && <Plaene client={client} checkins={checkins} onGeaendert={neuLaden} />}
      {bereich === 'checkins' && (
        <CheckinBereich
          client={client}
          checkins={checkins}
          logbuch={logbuch}
          onGeaendert={neuLaden}
        />
      )}
      {bereich === 'profil' && <Profil client={client} onGeaendert={neuLaden} />}
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Überblick
 * ------------------------------------------------------------------ */

function Ueberblick({
  client,
  checkins,
  logbuch,
  onGeaendert,
}: {
  client: Client;
  checkins: Checkin[];
  logbuch: LogbookEntry[];
  onGeaendert: () => void;
}) {
  const monat = dieserMonat();
  const bezahlt = istBezahlt(client, monat);

  const gewichte = useMemo(
    () =>
      checkins
        .filter((ci) => zahl(ci.kg) > 0)
        .map((ci) => ({ t: parseDatum(ci.datum) ?? 0, value: zahl(ci.kg) }))
        .filter((p) => p.t > 0)
        .sort((a, b) => a.t - b.t),
    [checkins],
  );

  const start = gewichte[0]?.value ?? zahl(client.kg);
  const aktuell = gewichte[gewichte.length - 1]?.value ?? start;
  const veraenderung = Math.round((aktuell - start) * 10) / 10;
  const offene = checkins.filter(istOffen).length;
  const volumen = logbuch.reduce((s, e) => s + trainingsVolumen(e), 0);

  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatTile value={start > 0 ? `${start} kg` : '–'} label="Start" />
        <StatTile value={aktuell > 0 ? `${aktuell} kg` : '–'} label="Aktuell" />
        <StatTile
          value={veraenderung === 0 ? '±0 kg' : `${veraenderung > 0 ? '+' : ''}${veraenderung} kg`}
          label="Veränderung"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone={client.aktiv === false ? 'neutral' : 'positiv'}>
          {client.aktiv === false ? 'Inaktiv' : 'Aktiv'}
        </Pill>
        <Pill>{paketName(client.paket)}</Pill>
        {(client.paketPreis ?? 0) > 0 && <Pill>{client.paketPreis} €/Monat</Pill>}
        {client.startDatum && <Pill>seit {client.startDatum}</Pill>}
        {hatFestenPreis(client) && (
          <Pill tone={bezahlt ? 'positiv' : 'warnung'}>
            {bezahlt ? `${monatLabel(monat)} bezahlt` : `${monatLabel(monat)} offen`}
          </Pill>
        )}
        {offene > 0 && <Pill tone="negativ">{offene} Check-ins offen</Pill>}
      </div>

      {gewichte.length >= 2 && (
        <Section title="Gewichtsverlauf">
          <Card>
            <ProgressLineChart data={gewichte} unit="kg" />
          </Card>
        </Section>
      )}

      <Section title="Training">
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={logbuch.length} label="Trainings" />
          <StatTile value={logbuch.reduce((s, e) => s + anzahlSaetze(e), 0)} label="Sätze" />
          <StatTile
            value={
              volumen >= 10000 ? `${Math.round(volumen / 1000)} t` : `${Math.round(volumen)} kg`
            }
            label="Volumen"
          />
        </div>
      </Section>

      <ZahlungsKarte client={client} onGeaendert={onGeaendert} />
      <NotizenKarte client={client} onGeaendert={onGeaendert} />
    </>
  );
}

function ZahlungsKarte({ client, onGeaendert }: { client: Client; onGeaendert: () => void }) {
  const [rechnungOffen, setRechnungOffen] = useState(false);
  const monat = dieserMonat();
  const bezahlt = istBezahlt(client, monat);

  if (!hatFestenPreis(client)) return null;

  const umschalten = async () => {
    try {
      await saveZahlungen(client.id, setzeZahlung(client, monat, !bezahlt) ?? []);
      toast.success(bezahlt ? 'Als offen markiert.' : 'Als bezahlt markiert.');
      onGeaendert();
    } catch {
      toast.error('Speichern hat nicht geklappt.');
    }
  };

  return (
    <Section title="Zahlung">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[17px] font-bold tracking-tight">{monatLabel(monat)}</div>
            <div className="mt-0.5 text-[14px] text-muted">
              {client.paketPreis ?? 0} € · {paketName(client.paket)}
            </div>
          </div>
          <Pill tone={bezahlt ? 'positiv' : 'warnung'}>{bezahlt ? 'bezahlt' : 'offen'}</Pill>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <PrimaryButton onClick={umschalten} tone={bezahlt ? 'schwarz' : 'positiv'}>
            {bezahlt ? 'Doch offen' : 'Als bezahlt markieren'}
          </PrimaryButton>
          <SecondaryButton onClick={() => setRechnungOffen(true)} icon={<IconMoney size={19} />}>
            Rechnung
          </SecondaryButton>
        </div>
      </Card>

      <Rechnung client={client} open={rechnungOffen} onClose={() => setRechnungOffen(false)} />
    </Section>
  );
}

function NotizenKarte({ client, onGeaendert }: { client: Client; onGeaendert: () => void }) {
  const [text, setText] = useState(client.coachNotes ?? '');
  const [laeuft, setLaeuft] = useState(false);
  const geaendert = text !== (client.coachNotes ?? '');

  return (
    <Section title="Coach-Notizen">
      <Card>
        <TextArea
          rows={5}
          value={text}
          onChange={setText}
          placeholder="Interne Notizen – der Kunde sieht sie nicht."
        />
        {geaendert && (
          <div className="mt-2">
            <PrimaryButton
              block
              disabled={laeuft}
              onClick={async () => {
                setLaeuft(true);
                try {
                  await saveCoachNotes(client.id, text);
                  toast.success('Notizen gespeichert.');
                  onGeaendert();
                } catch {
                  toast.error('Speichern hat nicht geklappt.');
                } finally {
                  setLaeuft(false);
                }
              }}
            >
              Notizen speichern
            </PrimaryButton>
          </div>
        )}
      </Card>
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Pläne
 * ------------------------------------------------------------------ */

function Plaene({
  client,
  checkins,
  onGeaendert,
}: {
  client: Client;
  checkins: Checkin[];
  onGeaendert: () => void;
}) {
  const { daten: uebungen } = useUebungen();
  const { daten: lebensmittel } = useLebensmittel();

  const [plans, setPlans] = useState<TrainingPlan[]>(client.plans ?? []);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(client.mealPlans ?? []);
  const [supplements, setSupplements] = useState<Supplement[]>(client.supplements ?? []);
  const [vorlageFuer, setVorlageFuer] = useState<'training' | 'ernaehrung' | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const mahlzeitenNamen = useMemo(() => {
    const namen = new Set<string>();
    for (const plan of mealPlans) {
      for (const meal of plan.meals ?? []) if (meal.name) namen.add(meal.name);
    }
    return [...namen];
  }, [mealPlans]);

  const speichern = async (was: 'training' | 'ernaehrung' | 'supplements') => {
    setLaeuft(true);
    try {
      if (was === 'training') {
        await saveTrainingPlans(client.id, plans, client.plans);
        toast.success('Trainingspläne gespeichert. Der Kunde sieht sie sofort.');
      } else if (was === 'ernaehrung') {
        await saveMealPlans(client.id, mealPlans, client.mealPlans);
        toast.success('Ernährungspläne gespeichert.');
      } else {
        await saveSupplements(client.id, supplements);
        toast.success('Supplement-Plan gespeichert.');
      }
      onGeaendert();
    } catch {
      toast.error('Speichern hat nicht geklappt.');
    } finally {
      setLaeuft(false);
    }
  };

  const uebernehmen = (vorlage: Template) => {
    // Tiefe Kopie: eine spätere Anpassung beim Kunden darf die Vorlage nie
    // verändern.
    if (vorlagenArt(vorlage) === 'training') {
      setPlans([
        ...plans,
        JSON.parse(JSON.stringify({ name: vorlage.name, days: vorlage.days ?? [] })),
      ]);
    } else {
      setMealPlans([
        ...mealPlans,
        JSON.parse(JSON.stringify({ name: vorlage.name, meals: vorlage.meals ?? [] })),
      ]);
    }
    setVorlageFuer(null);
    toast.info(`„${vorlage.name}" eingefügt – noch nicht gespeichert.`);
  };

  return (
    <>
      <Section title="Trainingspläne">
        <TrainingPlanEditor
          plans={plans}
          onChange={setPlans}
          onVorlage={() => setVorlageFuer('training')}
          uebungsNamen={(uebungen ?? []).map((e) => e.name)}
        />
        <div className="mt-3">
          <PrimaryButton block disabled={laeuft} onClick={() => void speichern('training')}>
            Trainingspläne speichern
          </PrimaryButton>
        </div>
      </Section>

      <Section title="Ernährungspläne">
        <MealPlanEditor
          mealPlans={mealPlans}
          onChange={setMealPlans}
          onVorlage={() => setVorlageFuer('ernaehrung')}
          lebensmittelNamen={(lebensmittel ?? []).map((f) => f.name)}
        />
        <div className="mt-3">
          <PrimaryButton block disabled={laeuft} onClick={() => void speichern('ernaehrung')}>
            Ernährungspläne speichern
          </PrimaryButton>
        </div>
      </Section>

      <Section title="Supplements">
        <Card>
          <SupplementEditor
            supplements={supplements}
            onChange={setSupplements}
            mahlzeitenNamen={mahlzeitenNamen}
          />
        </Card>
        <div className="mt-3">
          <PrimaryButton block disabled={laeuft} onClick={() => void speichern('supplements')}>
            Supplements speichern
          </PrimaryButton>
        </div>
      </Section>

      <Klappkarte titel="Kalorienrechner" icon={<IconFlame size={20} />}>
        <CalorieCalculator
          client={client}
          letzterCheckin={checkins.find((ci) => zahl(ci.kg) > 0)}
          onSpeichern={async (ziel) => {
            try {
              await saveCalorieTarget(client.id, ziel);
              toast.success('Kalorienziel gespeichert.');
              onGeaendert();
            } catch {
              toast.error('Speichern hat nicht geklappt.');
            }
          }}
        />
      </Klappkarte>

      <VorlagenSheet art={vorlageFuer} onClose={() => setVorlageFuer(null)} onWaehlen={uebernehmen} />
    </>
  );
}

function VorlagenSheet({
  art,
  onClose,
  onWaehlen,
}: {
  art: 'training' | 'ernaehrung' | null;
  onClose: () => void;
  onWaehlen: (vorlage: Template) => void;
}) {
  const [vorlagen, setVorlagen] = useState<Template[] | null>(null);

  // Erst beim Öffnen laden – Vorlagen ändern sich selten und würden sonst bei
  // jedem Aufbau der Kundenakte mitgeladen.
  useEffect(() => {
    if (!art) {
      setVorlagen(null);
      return;
    }
    let aktuell = true;
    void listTemplates(art)
      .catch(() => [])
      .then((liste) => {
        if (aktuell) setVorlagen(liste);
      });
    return () => {
      aktuell = false;
    };
  }, [art]);

  return (
    <Sheet
      open={art !== null}
      onClose={onClose}
      title="Vorlage einfügen"
      subtitle={art === 'ernaehrung' ? 'Ernährungspläne' : 'Trainingspläne'}
    >
      {vorlagen === null ? (
        <div className="py-6 text-center text-[15px] text-muted" aria-busy="true">
          Vorlagen werden geladen …
        </div>
      ) : vorlagen.length === 0 ? (
        <EmptyState
          title="Noch keine Vorlage"
          description={'Vorlagen legst du im Bereich „Vorlagen" an.'}
        />
      ) : (
        <Card padded={false} className="px-4">
          {vorlagen.map((vorlage, index) => (
            <div key={vorlage.id}>
              {index > 0 && <Divider />}
              <ListRow
                title={vorlage.name}
                subtitle={
                  vorlagenArt(vorlage) === 'training'
                    ? `${(vorlage.days ?? []).length} Trainingstage`
                    : `${(vorlage.meals ?? []).length} Mahlzeiten`
                }
                onClick={() => onWaehlen(vorlage)}
                chevron
              />
            </div>
          ))}
        </Card>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Check-ins und Logbuch
 * ------------------------------------------------------------------ */

function CheckinBereich({
  client,
  checkins,
  logbuch,
  onGeaendert,
}: {
  client: Client;
  checkins: Checkin[];
  logbuch: LogbookEntry[];
  onGeaendert: () => void;
}) {
  const [offen, setOffen] = useState<CheckinMitKunde | null>(null);
  const [training, setTraining] = useState<LogbookEntry | null>(null);
  const confirm = useConfirm();

  return (
    <>
      <Section title={`Check-ins (${checkins.length})`}>
        {checkins.length === 0 ? (
          <EmptyState
            icon={<IconCheck size={26} />}
            title="Noch kein Check-in"
            description="Sobald der Kunde einen schickt, erscheint er hier."
          />
        ) : (
          <Card padded={false} className="px-4">
            {checkins.map((ci, index) => (
              <div key={ci.id}>
                {index > 0 && <Divider />}
                <ListRow
                  title={ci.datum ?? 'Ohne Datum'}
                  subtitle={[
                    ci.kg ? `${ci.kg} kg` : null,
                    ci.tage ? `${ci.tage} Trainingstage` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={
                    istOffen(ci) ? (
                      <Pill tone="warnung">offen</Pill>
                    ) : (
                      <Pill tone="positiv">erledigt</Pill>
                    )
                  }
                  onClick={() => setOffen({ ...ci, clientId: client.id })}
                  chevron
                />
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={`Logbuch (${logbuch.length})`}>
        {logbuch.length === 0 ? (
          <EmptyState
            icon={<IconBook size={26} />}
            title="Noch kein Training"
            description="Der Kunde hat noch nichts eingetragen."
          />
        ) : (
          <Card padded={false} className="px-4">
            {logbuch.map((eintrag, index) => (
              <div key={eintrag.id}>
                {index > 0 && <Divider />}
                <ListRow
                  title={
                    eintrag.planName
                      ? [eintrag.planName, eintrag.dayName].filter(Boolean).join(' · ')
                      : 'Freies Training'
                  }
                  subtitle={`${eintrag.datum ?? '–'} · ${(eintrag.exercises ?? []).length} Übungen`}
                  onClick={() => setTraining(eintrag)}
                  chevron
                />
              </div>
            ))}
          </Card>
        )}
      </Section>

      <CheckinSheet
        checkin={offen}
        kundenName={clientName(client)}
        onClose={() => setOffen(null)}
        onGeaendert={onGeaendert}
      />

      <TrainingsSheet
        eintrag={training}
        onClose={() => setTraining(null)}
        onLoeschen={() => {
          const zuLoeschen = training;
          if (!zuLoeschen) return;
          confirm.fragen({
            title: 'Training löschen?',
            description: 'Der Eintrag verschwindet auch beim Kunden.',
            confirmLabel: 'Löschen',
            tone: 'negativ',
            onConfirm: async () => {
              await deleteLogEntry(client.id, zuLoeschen.id);
              setTraining(null);
              toast.info('Training gelöscht.');
              onGeaendert();
            },
          });
        }}
      />

      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </>
  );
}

function TrainingsSheet({
  eintrag,
  onClose,
  onLoeschen,
}: {
  eintrag: LogbookEntry | null;
  onClose: () => void;
  onLoeschen: () => void;
}) {
  if (!eintrag) return null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        eintrag.planName
          ? [eintrag.planName, eintrag.dayName].filter(Boolean).join(' · ')
          : 'Freies Training'
      }
      subtitle={eintrag.datum}
      fullHeight
    >
      <div className="mb-5 grid grid-cols-3 gap-2">
        <StatTile value={(eintrag.exercises ?? []).length} label="Übungen" />
        <StatTile value={anzahlSaetze(eintrag)} label="Sätze" />
        <StatTile value={`${Math.round(trainingsVolumen(eintrag))} kg`} label="Volumen" />
      </div>

      {(eintrag.exercises ?? []).map((ex, index) => (
        <Card key={index} className="mb-2.5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[17px] font-bold tracking-tight">{ex.name}</span>
            {ex.repRange && <span className="text-[13px] text-muted">{ex.repRange} Wdh</span>}
          </div>
          <div className="space-y-1">
            {(ex.warmupSets ?? []).map((s, i) => (
              <div key={`w${i}`} className="flex justify-between gap-3 text-[14px] text-muted">
                <span>Aufwärmen {s.set}</span>
                <span className="tnum">
                  {s.kg || '–'} kg × {s.reps || '–'}
                </span>
              </div>
            ))}
            {(ex.sets ?? []).map((s, i) => (
              <div key={`s${i}`} className="flex justify-between gap-3 text-[15px]">
                <span>Satz {s.set}</span>
                <span className="tnum font-semibold">
                  {s.kg || '–'} kg × {s.reps || '–'}
                  {s.rpe ? ` · RPE ${s.rpe}` : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {eintrag.notes && (
        <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {eintrag.notes}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <TextButton tone="negativ" onClick={onLoeschen}>
          <span className="inline-flex items-center gap-1.5">
            <IconTrash size={16} />
            Training löschen
          </span>
        </TextButton>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Profil und Einstellungen
 * ------------------------------------------------------------------ */

function Profil({ client, onGeaendert }: { client: Client; onGeaendert: () => void }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [bearbeiten, setBearbeiten] = useState(false);

  const [paket, setPaket] = useState(client.paket ?? 'komplett');
  // Das aktuelle Paket muss in der Liste stehen, auch wenn es ein
  // Testphasen-Paket ist – sonst stünde die Auswahl bei Bestandskunden leer.
  const paketAuswahl = WAEHLBARE_PAKETE.includes(paket)
    ? WAEHLBARE_PAKETE
    : [paket, ...WAEHLBARE_PAKETE];
  const lage = preislage(client);
  const [preis, setPreis] = useState(String(client.paketPreis ?? 0));
  const [startDatum, setStartDatum] = useState(client.startDatum ?? '');
  const [laeuft, setLaeuft] = useState(false);

  const angaben: Array<[string, string | undefined]> = [
    ['E-Mail', client.email],
    ['Telefon', client.tel],
    ['Geburtsdatum', client.geb],
    ['Alter', client.age ? `${client.age} Jahre` : undefined],
    ['Geschlecht', client.sex],
    ['Größe', client.cm ? `${client.cm} cm` : undefined],
    ['Startgewicht', client.kg ? `${client.kg} kg` : undefined],
    ['Zielgewicht', client.zielgewicht ? `${client.zielgewicht} kg` : undefined],
    ['Ziel', client.ziel],
    ['Beruf', client.job],
    ['Erfahrung', client.exp],
    ['Frequenz', client.freq],
    ['Ernährungsform', client.diet],
    ['Allergien', client.allergie],
    ['Abneigungen', client.abneigung],
    ['Verletzungen', client.verletzung],
    ['Medikamente', client.medi],
    ['Motivation', client.motiv],
    ['Erwartungen', client.erwart],
  ];

  return (
    <>
      <Section title="Betreuung">
        <Card>
          <OptionGrid
            label="Paket"
            value={paket}
            onChange={(wert) => {
              setPaket(wert);
              // Der hinterlegte Preis folgt dem Paket, bleibt aber änderbar –
              // bei „Individuell" wird ohnehin von Hand eingetragen.
              const standard = aktuellerPreis(wert);
              if (standard !== null) setPreis(String(standard));
            }}
            options={paketAuswahl.map((key) => {
              const preis = aktuellerPreis(key);
              return {
                value: key,
                label: PAKETE[key]?.name ?? key,
                description: preis === null ? 'freier Preis' : `${preis} €/Monat`,
              };
            })}
          />

          {lage.bestandsschutz && (
            <p className="-mt-1 mb-3 text-[13px] leading-snug text-muted">
              Bestandspreis: zahlt {lage.preis} €, neu wären {lage.listenpreis} €
              {' '}({lage.ersparnis} € günstiger). Der Preis bleibt, bis du ihn hier änderst.
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-3">
            <TextField
              label="Preis"
              inputMode="numeric"
              suffix="€"
              value={preis}
              onChange={setPreis}
            />
            <DateField label="Startdatum" value={startDatum} onChange={setStartDatum} />
          </div>
          <div className="mt-2">
            <PrimaryButton
              block
              disabled={laeuft}
              onClick={async () => {
                setLaeuft(true);
                try {
                  await updateClient(client.id, {
                    paket,
                    paketPreis: Number(preis) || 0,
                    startDatum,
                  });
                  toast.success('Einstellungen gespeichert.');
                  onGeaendert();
                } catch {
                  toast.error('Speichern hat nicht geklappt.');
                } finally {
                  setLaeuft(false);
                }
              }}
            >
              Einstellungen speichern
            </PrimaryButton>
          </div>
        </Card>
      </Section>

      <Section title="Angaben aus der Registrierung">
        <Card padded={false} className="px-4">
          {angaben
            .filter(([, wert]) => wert)
            .map(([label, wert], index) => (
              <div key={label}>
                {index > 0 && <Divider />}
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="shrink-0 text-[14px] font-semibold text-muted">{label}</span>
                  <span className="min-w-0 text-right text-[15px]">{wert}</span>
                </div>
              </div>
            ))}
        </Card>
        <div className="mt-3">
          <SecondaryButton block onClick={() => setBearbeiten(true)}>
            Angaben bearbeiten
          </SecondaryButton>
        </div>
      </Section>

      <Section title="Konto">
        <Card>
          <SecondaryButton
            block
            icon={client.aktiv === false ? <IconPlay size={19} /> : <IconPause size={19} />}
            onClick={async () => {
              await updateClient(client.id, { aktiv: client.aktiv === false });
              toast.success(
                client.aktiv === false ? 'Kunde ist wieder aktiv.' : 'Kunde auf inaktiv gesetzt.',
              );
              onGeaendert();
            }}
          >
            {client.aktiv === false ? 'Wieder aktiv setzen' : 'Auf inaktiv setzen'}
          </SecondaryButton>

          <div className="mt-4 border-t border-line pt-4">
            <TextButton
              tone="negativ"
              onClick={() =>
                confirm.fragen({
                  title: 'Kunde löschen?',
                  description: `Das Profil von ${clientName(client)} wird endgültig entfernt. Für eine Pause ist „auf inaktiv setzen" der bessere Weg.`,
                  confirmLabel: 'Endgültig löschen',
                  tone: 'negativ',
                  onConfirm: async () => {
                    await deleteClient(client.id);
                    toast.info('Kunde gelöscht.');
                    navigate('/coach/kunden');
                  },
                })
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <IconTrash size={16} />
                Kunde löschen
              </span>
            </TextButton>
          </div>
        </Card>
      </Section>

      <ProfilBearbeitenSheet
        client={client}
        open={bearbeiten}
        onClose={() => setBearbeiten(false)}
        onGespeichert={onGeaendert}
      />
      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </>
  );
}

function ProfilBearbeitenSheet({
  client,
  open,
  onClose,
  onGespeichert,
}: {
  client: Client;
  open: boolean;
  onClose: () => void;
  onGespeichert: () => void;
}) {
  const [werte, setWerte] = useState<Record<string, string>>(() =>
    profilWerte(client, PROFIL_FELDER),
  );
  const [laeuft, setLaeuft] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Angaben bearbeiten"
      subtitle={clientName(client)}
      fullHeight
      footer={
        <PrimaryButton
          block
          disabled={laeuft}
          onClick={async () => {
            setLaeuft(true);
            try {
              await updateClient(client.id, werte as Partial<Client>);
              toast.success('Angaben gespeichert.');
              onGespeichert();
              onClose();
            } catch {
              toast.error('Speichern hat nicht geklappt.');
            } finally {
              setLaeuft(false);
            }
          }}
        >
          Speichern
        </PrimaryButton>
      }
    >
      {PROFIL_FELDER.map(({ key, label, lang }) =>
        lang ? (
          <TextArea
            key={key}
            label={label}
            rows={2}
            value={werte[key] ?? ''}
            onChange={(v) => setWerte((w) => ({ ...w, [key]: v }))}
          />
        ) : (
          <TextField
            key={key}
            label={label}
            value={werte[key] ?? ''}
            onChange={(v) => setWerte((w) => ({ ...w, [key]: v }))}
          />
        ),
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Hilfsbaustein
 * ------------------------------------------------------------------ */

function Klappkarte({
  titel,
  icon,
  children,
}: {
  titel: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const [auf, setAuf] = useState(false);
  return (
    <Card padded={false} className="mb-7 px-5">
      <button
        onClick={() => setAuf(!auf)}
        aria-expanded={auf}
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          {icon && <span className="text-muted">{icon}</span>}
          <span className="text-[17px] font-bold tracking-tight">{titel}</span>
        </span>
        <IconChevronDown
          size={20}
          className={cn('text-subtle transition-transform', auf && 'rotate-180')}
        />
      </button>
      {auf && (
        <div className="pb-5">
          <Divider />
          <div className="pt-3">{children}</div>
        </div>
      )}
    </Card>
  );
}
