import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowRight, IconCheck, IconChevronLeft } from '@/components/icons';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Controls';
import { DateField } from '@/components/ui/DateField';
import { OptionGrid, TextArea, TextField } from '@/components/ui/Field';
import { PageHeader, ProgressBar, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { createClient } from '@/db/repo/clients';
import { createNotification } from '@/db/repo/notifications';
import { PAKETE, type PaketKey } from '@/db/types';
import { heute } from '@/domain/dates';
import { anmeldeFehlerText, useAuthStore } from '@/state/authStore';
import { toast } from '@/state/uiStore';
import { AGB_TEXT, DATENSCHUTZ_TEXT } from './rechtstexte';

/**
 * Registrierung als geführter Fragebogen.
 *
 * Zehn Schritte statt eines langen Formulars – dieselben Felder wie bisher,
 * aber immer nur so viel auf einmal, wie auf einen Handybildschirm passt.
 * Der Fortschrittsbalken zeigt, wie weit es noch ist.
 *
 * Mit `nurProfil` läuft dieselbe Strecke ohne den Konto-Schritt: für den Fall,
 * dass ein Konto besteht, das Kundendokument aber fehlt, weil die Registrierung
 * beim ersten Mal abgebrochen wurde.
 */

interface Formular {
  email: string;
  passwort: string;
  vn: string;
  nn: string;
  tel: string;
  geb: string;
  sex: string;
  kg: string;
  cm: string;
  zielgewicht: string;
  job: string;
  freq: string;
  exp: string;
  ziel: string;
  paket: PaketKey | '';
  diet: string;
  allergie: string;
  abneigung: string;
  verletzung: string;
  medi: string;
  motiv: string;
  erwart: string;
  einverstanden: boolean;
}

const LEER: Formular = {
  email: '', passwort: '', vn: '', nn: '', tel: '', geb: '', sex: 'Männlich',
  kg: '', cm: '', zielgewicht: '', job: '', freq: '', exp: '', ziel: '',
  paket: '', diet: '', allergie: '', abneigung: '', verletzung: '', medi: '',
  motiv: '', erwart: '', einverstanden: false,
};

export default function RegisterPage({ nurProfil = false }: { nurProfil?: boolean }) {
  const navigate = useNavigate();
  const registrieren = useAuthStore((s) => s.registrieren);
  const abmelden = useAuthStore((s) => s.abmelden);
  const profilNeuLaden = useAuthStore((s) => s.profilNeuLaden);
  const user = useAuthStore((s) => s.user);

  const [f, setF] = useState<Formular>({ ...LEER, email: user?.email ?? '' });
  const [schritt, setSchritt] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [rechtstext, setRechtstext] = useState<'agb' | 'datenschutz' | null>(null);

  const setze = (patch: Partial<Formular>) => {
    setF((current) => ({ ...current, ...patch }));
    setFehler(null);
  };

  const schritte = nurProfil ? SCHRITTE.filter((s) => s.id !== 'konto') : SCHRITTE;
  const aktuell = schritte[schritt]!;
  const letzter = schritt === schritte.length - 1;

  const weiter = async () => {
    const problem = aktuell.pruefe?.(f) ?? null;
    if (problem) {
      setFehler(problem);
      return;
    }
    if (!letzter) {
      setSchritt((s) => s + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    await abschliessen();
  };

  const abschliessen = async () => {
    setLaeuft(true);
    setFehler(null);
    try {
      const uid = nurProfil ? user!.uid : (await registrieren(f.email, f.passwort)).uid;
      const paketPreis = f.paket ? PAKETE[f.paket].preis : 0;

      await createClient(uid, {
        email: nurProfil ? (user?.email ?? '') : f.email,
        vn: f.vn.trim(),
        nn: f.nn.trim(),
        tel: f.tel,
        geb: f.geb,
        sex: f.sex,
        kg: f.kg,
        cm: f.cm,
        zielgewicht: f.zielgewicht,
        job: f.job,
        freq: f.freq,
        exp: f.exp,
        ziel: f.ziel,
        paket: f.paket || 'individuell',
        paketPreis,
        diet: f.diet,
        allergie: f.allergie,
        abneigung: f.abneigung,
        verletzung: f.verletzung,
        medi: f.medi,
        motiv: f.motiv,
        erwart: f.erwart,
        createdAt: new Date().toISOString(),
        startDatum: heute(),
        aktiv: true,
        plans: [],
        mealPlans: [],
        supplements: [],
        zahlungen: [],
      });

      await createNotification({
        type: 'new_client',
        clientId: uid,
        clientName: `${f.vn} ${f.nn}`.trim(),
      });

      await profilNeuLaden();
      toast.success('Willkommen bei PRAVIT!');
    } catch (e) {
      setFehler(anmeldeFehlerText(e));
      setLaeuft(false);
    }
  };

  return (
    <Screen>
      <PageHeader
        title={aktuell.titel}
        subtitle={aktuell.hinweis}
        onBack={
          schritt > 0
            ? () => setSchritt((s) => s - 1)
            : nurProfil
              ? undefined
              : () => navigate('/')
        }
        large={false}
      />

      <div className="mb-6">
        <ProgressBar value={(schritt + 1) / schritte.length} />
        <p className="mt-2 text-[12px] font-semibold text-muted">
          Schritt {schritt + 1} von {schritte.length}
        </p>
      </div>

      <Card>
        {aktuell.id === 'konto' && (
          <>
            <TextField label="E-Mail" type="email" inputMode="email" value={f.email} onChange={(v) => setze({ email: v })} placeholder="name@beispiel.de" />
            <TextField label="Passwort" type="password" value={f.passwort} onChange={(v) => setze({ passwort: v })} placeholder="mindestens 6 Zeichen" />
          </>
        )}

        {aktuell.id === 'kontakt' && (
          <>
            <TextField label="Vorname" value={f.vn} onChange={(v) => setze({ vn: v })} placeholder="Max" />
            <TextField label="Nachname" value={f.nn} onChange={(v) => setze({ nn: v })} placeholder="Mustermann" />
            <TextField label="Telefon" type="tel" inputMode="tel" value={f.tel} onChange={(v) => setze({ tel: v })} placeholder="optional" />
            <DateField label="Geburtsdatum" value={f.geb} onChange={(v) => setze({ geb: v })} />
            <OptionGrid
              label="Geschlecht"
              value={f.sex}
              onChange={(v) => setze({ sex: v })}
              options={[
                { value: 'Männlich', label: 'Männlich' },
                { value: 'Weiblich', label: 'Weiblich' },
              ]}
            />
          </>
        )}

        {aktuell.id === 'koerper' && (
          <>
            <TextField label="Aktuelles Gewicht" inputMode="decimal" suffix="kg" value={f.kg} onChange={(v) => setze({ kg: v })} />
            <TextField label="Größe" inputMode="numeric" suffix="cm" value={f.cm} onChange={(v) => setze({ cm: v })} />
            <TextField label="Zielgewicht" inputMode="decimal" suffix="kg" value={f.zielgewicht} onChange={(v) => setze({ zielgewicht: v })} />
          </>
        )}

        {aktuell.id === 'beruf' && (
          <>
            <TextField label="Beruf" value={f.job} onChange={(v) => setze({ job: v })} placeholder="z. B. Büro, Handwerk, Schicht" />
            <OptionGrid
              label="Wie oft trainierst du pro Woche?"
              columns={3}
              value={f.freq}
              onChange={(v) => setze({ freq: v })}
              options={[
                { value: '2', label: '2×' },
                { value: '3', label: '3×' },
                { value: '4', label: '4×' },
                { value: '5', label: '5×' },
                { value: '6', label: '6×' },
                { value: '7', label: 'Täglich' },
              ]}
            />
            <OptionGrid
              label="Erfahrung"
              columns={3}
              value={f.exp}
              onChange={(v) => setze({ exp: v })}
              options={[
                { value: 'Anfänger', label: 'Anfänger' },
                { value: 'Fortgeschritten', label: 'Fortgeschr.' },
                { value: 'Erfahren', label: 'Erfahren' },
              ]}
            />
          </>
        )}

        {aktuell.id === 'ziele' && (
          <TextArea
            label="Was willst du erreichen?"
            rows={5}
            value={f.ziel}
            onChange={(v) => setze({ ziel: v })}
            placeholder="z. B. 8 kg abnehmen bis zum Sommer, dabei Kraft halten"
          />
        )}

        {aktuell.id === 'paket' && (
          <div className="space-y-2.5">
            {(Object.keys(PAKETE) as PaketKey[]).map((key) => {
              const paket = PAKETE[key];
              const aktivPaket = f.paket === key;
              return (
                <button
                  key={key}
                  onClick={() => setze({ paket: key })}
                  className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface-muted px-4 py-4 text-left transition-shadow ${
                    aktivPaket ? 'ring-2 ring-text' : ''
                  }`}
                >
                  <span className="text-[16px] font-bold tracking-tight">{paket.name}</span>
                  <span className="text-[15px] font-bold">
                    {paket.preis > 0 ? `${paket.preis} €/Monat` : 'auf Anfrage'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {aktuell.id === 'ernaehrung' && (
          <>
            <TextField label="Ernährungsweise" value={f.diet} onChange={(v) => setze({ diet: v })} placeholder="z. B. alles, vegetarisch, vegan" />
            <TextArea label="Allergien" rows={2} value={f.allergie} onChange={(v) => setze({ allergie: v })} placeholder="optional" />
            <TextArea label="Was magst du gar nicht?" rows={2} value={f.abneigung} onChange={(v) => setze({ abneigung: v })} placeholder="optional" />
          </>
        )}

        {aktuell.id === 'gesundheit' && (
          <>
            <TextArea label="Verletzungen oder Beschwerden" rows={3} value={f.verletzung} onChange={(v) => setze({ verletzung: v })} placeholder="Auch länger zurückliegende – sie beeinflussen die Übungsauswahl." />
            <TextArea label="Regelmäßige Medikamente" rows={2} value={f.medi} onChange={(v) => setze({ medi: v })} placeholder="optional" />
          </>
        )}

        {aktuell.id === 'motivation' && (
          <>
            <TextArea label="Was motiviert dich?" rows={3} value={f.motiv} onChange={(v) => setze({ motiv: v })} />
            <TextArea label="Was erwartest du vom Coaching?" rows={3} value={f.erwart} onChange={(v) => setze({ erwart: v })} />
          </>
        )}

        {aktuell.id === 'recht' && (
          <>
            <p className="text-[15px] leading-relaxed">
              Damit dein Coach dich betreuen kann, verarbeitet PRAVIT die Angaben aus diesem
              Fragebogen. Details stehen in den beiden Texten.
            </p>
            <div className="mt-4 flex gap-2.5">
              <SecondaryButton block onClick={() => setRechtstext('agb')}>AGB lesen</SecondaryButton>
              <SecondaryButton block onClick={() => setRechtstext('datenschutz')}>Datenschutz</SecondaryButton>
            </div>
            <div className="mt-2">
              <Toggle
                checked={f.einverstanden}
                onChange={(v) => setze({ einverstanden: v })}
                label="Ich stimme zu"
                description="AGB und Datenschutzerklärung gelesen und akzeptiert."
              />
            </div>
          </>
        )}

        {fehler && (
          <p className="mt-3 rounded-2xl bg-negative-soft px-4 py-3 text-[14px] font-semibold text-negative-strong">
            {fehler}
          </p>
        )}
      </Card>

      <div className="mt-5 flex gap-2.5">
        {schritt > 0 && (
          <SecondaryButton block onClick={() => setSchritt((s) => s - 1)} icon={<IconChevronLeft size={18} />}>
            Zurück
          </SecondaryButton>
        )}
        <PrimaryButton
          block
          onClick={weiter}
          disabled={laeuft}
          icon={letzter ? <IconCheck size={20} /> : <IconArrowRight size={20} />}
        >
          {laeuft ? 'Wird angelegt …' : letzter ? 'Konto anlegen' : 'Weiter'}
        </PrimaryButton>
      </div>

      {nurProfil && (
        <div className="mt-6 text-center">
          <TextButton onClick={() => void abmelden()}>Abmelden</TextButton>
        </div>
      )}

      <Sheet
        open={rechtstext !== null}
        onClose={() => setRechtstext(null)}
        title={rechtstext === 'agb' ? 'AGB' : 'Datenschutz'}
        fullHeight
      >
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
          {rechtstext === 'agb' ? AGB_TEXT : DATENSCHUTZ_TEXT}
        </p>
      </Sheet>
    </Screen>
  );
}

interface SchrittDef {
  id: string;
  titel: string;
  hinweis?: string;
  pruefe?: (f: Formular) => string | null;
}

const SCHRITTE: SchrittDef[] = [
  {
    id: 'konto',
    titel: 'Konto anlegen',
    hinweis: 'Damit meldest du dich künftig an.',
    pruefe: (f) => {
      if (!f.email.trim() || !f.passwort) return 'Bitte E-Mail und Passwort eingeben.';
      if (f.passwort.length < 6) return 'Das Passwort braucht mindestens sechs Zeichen.';
      return null;
    },
  },
  {
    id: 'kontakt',
    titel: 'Über dich',
    pruefe: (f) => (!f.vn.trim() || !f.nn.trim() ? 'Bitte Vor- und Nachname eingeben.' : null),
  },
  { id: 'koerper', titel: 'Körperdaten', hinweis: 'Grundlage für deinen Kalorienbedarf.' },
  { id: 'beruf', titel: 'Alltag & Training' },
  { id: 'ziele', titel: 'Dein Ziel', hinweis: 'Je genauer, desto besser der Plan.' },
  {
    id: 'paket',
    titel: 'Coaching-Paket',
    pruefe: (f) => (f.paket === '' ? 'Bitte wähle ein Paket.' : null),
  },
  { id: 'ernaehrung', titel: 'Ernährung' },
  { id: 'gesundheit', titel: 'Gesundheit', hinweis: 'Bleibt zwischen dir und deinem Coach.' },
  { id: 'motivation', titel: 'Motivation' },
  {
    id: 'recht',
    titel: 'Fast geschafft',
    pruefe: (f) => (!f.einverstanden ? 'Bitte stimme AGB und Datenschutz zu.' : null),
  },
];
