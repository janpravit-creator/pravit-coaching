import { useMemo, useState } from 'react';
import { IconDumbbell, IconPlus, IconSalad, IconTrash } from '@/components/icons';
import { FloatingAction, PrimaryButton } from '@/components/ui/Button';
import { Card, Divider, Section } from '@/components/ui/Card';
import { ConfirmSheet, useConfirm } from '@/components/ui/Confirm';
import { PillTabs } from '@/components/ui/Controls';
import { OptionGrid, SearchField, TextField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import {
  deleteCustomFood,
  deleteExercise,
  updateExercise,
  upsertCustomFood,
  upsertExercise,
} from '@/db/repo/library';
import {
  GERAETE,
  MUSKELGRUPPEN,
  type CustomFood,
  type LibraryExercise,
} from '@/db/types';
import { useLebensmittel, useUebungen } from '@/hooks/useCoachData';
import { toast } from '@/state/uiStore';

/**
 * Datenbank: Übungen und eigene Lebensmittel.
 *
 * Beide Listen füllen die Vorschläge in den Plan-Editoren. Übungen entstehen
 * meist von selbst, wenn du sie in einen Plan schreibst – hier ordnest du sie
 * nachträglich Muskelgruppe und Gerät zu, damit das Wiki sie gruppieren kann.
 */

type Bereich = 'uebungen' | 'lebensmittel';

export default function LibraryPage() {
  const [bereich, setBereich] = useState<Bereich>('uebungen');

  return (
    <Screen actionSpace>
      <PageHeader title="Datenbank" subtitle="Übungen und eigene Lebensmittel." />

      <PillTabs
        className="mb-5"
        value={bereich}
        onChange={setBereich}
        options={[
          { value: 'uebungen', label: 'Übungen' },
          { value: 'lebensmittel', label: 'Lebensmittel' },
        ]}
      />

      {bereich === 'uebungen' ? <Uebungen /> : <Lebensmittel />}
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Übungen
 * ------------------------------------------------------------------ */

function Uebungen() {
  const { daten, laedt, neuLaden } = useUebungen();
  const confirm = useConfirm();

  const [suche, setSuche] = useState('');
  const [gruppe, setGruppe] = useState('');
  const [bearbeitet, setBearbeitet] = useState<LibraryExercise | null>(null);
  const [neueOffen, setNeueOffen] = useState(false);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return (daten ?? []).filter((e) => {
      if (q && !(e.name ?? '').toLowerCase().includes(q)) return false;
      if (gruppe && e.muscleGroup !== gruppe) return false;
      return true;
    });
  }, [daten, suche, gruppe]);

  return (
    <>
      <SearchField value={suche} onChange={setSuche} placeholder="Übung suchen …" className="mb-3" />

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

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={<IconDumbbell size={28} />}
          title={suche || gruppe ? 'Keine Übung gefunden' : 'Noch keine Übung'}
          description={
            suche || gruppe
              ? 'Versuch einen anderen Filter.'
              : 'Übungen erscheinen automatisch, sobald du sie in einem Plan verwendest.'
          }
          action={
            <PrimaryButton onClick={() => setNeueOffen(true)} icon={<IconPlus size={20} />}>
              Übung anlegen
            </PrimaryButton>
          }
        />
      ) : (
        <Section title={`${gefiltert.length} Übungen`}>
          <Card padded={false} className="px-4">
            {gefiltert.map((ex, index) => (
              <div key={ex.id}>
                {index > 0 && <Divider />}
                <button
                  onClick={() => setBearbeitet(ex)}
                  className="flex w-full items-center gap-3 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-bold tracking-tight">
                      {ex.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {[ex.muscleGroup, ex.equipment].filter(Boolean).join(' · ') ||
                        'noch nicht zugeordnet'}
                    </span>
                  </span>
                  {(ex.usageCount ?? 0) > 0 && (
                    <span className="tnum shrink-0 text-[13px] text-subtle">
                      {ex.usageCount}×
                    </span>
                  )}
                </button>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {gefiltert.length > 0 && (
        <FloatingAction onClick={() => setNeueOffen(true)} icon={<IconPlus size={20} />}>
          Übung
        </FloatingAction>
      )}

      <UebungSheet
        uebung={bearbeitet}
        neu={neueOffen}
        onClose={() => {
          setBearbeitet(null);
          setNeueOffen(false);
        }}
        onGespeichert={() => {
          setBearbeitet(null);
          setNeueOffen(false);
          neuLaden();
        }}
        onLoeschen={(ex) =>
          confirm.fragen({
            title: 'Übung löschen?',
            description: `„${ex.name}" verschwindet aus den Vorschlägen und aus dem Wiki. Pläne, die sie enthalten, bleiben unverändert.`,
            confirmLabel: 'Löschen',
            tone: 'negativ',
            onConfirm: async () => {
              await deleteExercise(ex.id);
              toast.info('Übung gelöscht.');
              setBearbeitet(null);
              neuLaden();
            },
          })
        }
      />

      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </>
  );
}

function UebungSheet({
  uebung,
  neu,
  onClose,
  onGespeichert,
  onLoeschen,
}: {
  uebung: LibraryExercise | null;
  neu: boolean;
  onClose: () => void;
  onGespeichert: () => void;
  onLoeschen: (ex: LibraryExercise) => void;
}) {
  const offen = neu || uebung !== null;

  const [name, setName] = useState('');
  const [gruppe, setGruppe] = useState('');
  const [geraet, setGeraet] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const schluessel = neu ? 'neu' : (uebung?.id ?? '');
  const [zuletzt, setZuletzt] = useState(schluessel);
  if (schluessel !== zuletzt) {
    setZuletzt(schluessel);
    setName(neu ? '' : (uebung?.name ?? ''));
    setGruppe(neu ? '' : (uebung?.muscleGroup ?? ''));
    setGeraet(neu ? '' : (uebung?.equipment ?? ''));
  }

  if (!offen) return null;

  const speichern = async () => {
    const sauber = name.trim();
    if (sauber === '') return;
    setLaeuft(true);
    try {
      if (uebung && sauber === uebung.name) {
        // Nur die Zuordnung geändert – die Kennung bleibt, damit Vorschläge
        // und Wiki-Verknüpfungen erhalten bleiben.
        await updateExercise(uebung.id, { muscleGroup: gruppe, equipment: geraet });
      } else {
        await upsertExercise({
          name: sauber,
          muscleGroup: gruppe,
          equipment: geraet,
          ...(uebung?.usageCount === undefined ? {} : { usageCount: uebung.usageCount }),
          ...(uebung?.createdAt === undefined ? {} : { createdAt: uebung.createdAt }),
        });
        // Beim Umbenennen entsteht eine neue Kennung; die alte muss weg,
        // sonst steht die Übung doppelt in der Liste.
        if (uebung && uebung.name !== sauber) await deleteExercise(uebung.id);
      }
      toast.success('Übung gespeichert.');
      onGespeichert();
    } catch {
      toast.error('Speichern hat nicht geklappt.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={neu ? 'Neue Übung' : 'Übung bearbeiten'}
      fullHeight
      footer={
        <PrimaryButton block disabled={laeuft || name.trim() === ''} onClick={speichern}>
          Speichern
        </PrimaryButton>
      }
    >
      <TextField label="Name" value={name} onChange={setName} placeholder="z. B. Bankdrücken" />

      <OptionGrid
        label="Muskelgruppe"
        columns={3}
        value={gruppe}
        onChange={setGruppe}
        options={MUSKELGRUPPEN.map((g) => ({ value: g, label: g }))}
      />

      <OptionGrid
        label="Gerät"
        columns={3}
        value={geraet}
        onChange={setGeraet}
        options={GERAETE.map((g) => ({ value: g, label: g }))}
      />

      {uebung && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onLoeschen(uebung)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] font-semibold text-negative-strong"
          >
            <IconTrash size={16} />
            Übung löschen
          </button>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Lebensmittel
 * ------------------------------------------------------------------ */

function Lebensmittel() {
  const { daten, laedt, neuLaden } = useLebensmittel();
  const confirm = useConfirm();

  const [suche, setSuche] = useState('');
  const [bearbeitet, setBearbeitet] = useState<CustomFood | null>(null);
  const [neuOffen, setNeuOffen] = useState(false);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return (daten ?? []).filter((f) => q === '' || (f.name ?? '').toLowerCase().includes(q));
  }, [daten, suche]);

  return (
    <>
      <SearchField
        value={suche}
        onChange={setSuche}
        placeholder="Lebensmittel suchen …"
        className="mb-5"
      />

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={<IconSalad size={28} />}
          title={suche ? 'Nichts gefunden' : 'Noch kein Lebensmittel'}
          description={
            suche
              ? 'Versuch einen anderen Suchbegriff.'
              : 'Leg Lebensmittel an, die du oft einsetzt – sie erscheinen dann als Vorschlag im Ernährungsplan.'
          }
          action={
            <PrimaryButton onClick={() => setNeuOffen(true)} icon={<IconPlus size={20} />}>
              Lebensmittel anlegen
            </PrimaryButton>
          }
        />
      ) : (
        <Section title={`${gefiltert.length} Lebensmittel`}>
          <Card padded={false} className="px-4">
            {gefiltert.map((food, index) => (
              <div key={food.id}>
                {index > 0 && <Divider />}
                <button
                  onClick={() => setBearbeitet(food)}
                  className="flex w-full items-center gap-3 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-bold tracking-tight">
                      {food.name}
                    </span>
                    <span className="tnum mt-0.5 block text-[13px] text-muted">
                      {food.kcal || 0} kcal · {food.protein || 0} g P · {food.fat || 0} g F ·{' '}
                      {food.carbs || 0} g KH
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] text-subtle">
                    {food.basis === 'stueck' ? 'pro Stück' : 'pro 100 g'}
                  </span>
                </button>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {gefiltert.length > 0 && (
        <FloatingAction onClick={() => setNeuOffen(true)} icon={<IconPlus size={20} />}>
          Lebensmittel
        </FloatingAction>
      )}

      <LebensmittelSheet
        food={bearbeitet}
        neu={neuOffen}
        onClose={() => {
          setBearbeitet(null);
          setNeuOffen(false);
        }}
        onGespeichert={() => {
          setBearbeitet(null);
          setNeuOffen(false);
          neuLaden();
        }}
        onLoeschen={(food) =>
          confirm.fragen({
            title: 'Lebensmittel löschen?',
            description: `„${food.name}" verschwindet aus den Vorschlägen. Bereits eingetragene Mahlzeiten bleiben unverändert.`,
            confirmLabel: 'Löschen',
            tone: 'negativ',
            onConfirm: async () => {
              await deleteCustomFood(food.id);
              toast.info('Lebensmittel gelöscht.');
              setBearbeitet(null);
              neuLaden();
            },
          })
        }
      />

      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </>
  );
}

function LebensmittelSheet({
  food,
  neu,
  onClose,
  onGespeichert,
  onLoeschen,
}: {
  food: CustomFood | null;
  neu: boolean;
  onClose: () => void;
  onGespeichert: () => void;
  onLoeschen: (food: CustomFood) => void;
}) {
  const offen = neu || food !== null;

  const [werte, setWerte] = useState({
    name: '',
    basis: '100g',
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
  });
  const [laeuft, setLaeuft] = useState(false);

  const schluessel = neu ? 'neu' : (food?.id ?? '');
  const [zuletzt, setZuletzt] = useState(schluessel);
  if (schluessel !== zuletzt) {
    setZuletzt(schluessel);
    setWerte({
      name: neu ? '' : (food?.name ?? ''),
      basis: neu ? '100g' : (food?.basis ?? '100g'),
      kcal: neu ? '' : String(food?.kcal ?? ''),
      protein: neu ? '' : String(food?.protein ?? ''),
      fat: neu ? '' : String(food?.fat ?? ''),
      carbs: neu ? '' : String(food?.carbs ?? ''),
    });
  }

  if (!offen) return null;

  const setze = (patch: Partial<typeof werte>) => setWerte((w) => ({ ...w, ...patch }));

  const speichern = async () => {
    const sauber = werte.name.trim();
    if (sauber === '') return;
    setLaeuft(true);
    try {
      await upsertCustomFood({
        ...(food && food.name === sauber ? { id: food.id } : {}),
        name: sauber,
        basis: werte.basis,
        kcal: Number(werte.kcal.replace(',', '.')) || 0,
        protein: Number(werte.protein.replace(',', '.')) || 0,
        fat: Number(werte.fat.replace(',', '.')) || 0,
        carbs: Number(werte.carbs.replace(',', '.')) || 0,
        ...(food?.createdAt === undefined ? {} : { createdAt: food.createdAt }),
      });
      if (food && food.name !== sauber) await deleteCustomFood(food.id);
      toast.success('Lebensmittel gespeichert.');
      onGespeichert();
    } catch {
      toast.error('Speichern hat nicht geklappt.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={neu ? 'Neues Lebensmittel' : 'Lebensmittel bearbeiten'}
      fullHeight
      footer={
        <PrimaryButton block disabled={laeuft || werte.name.trim() === ''} onClick={speichern}>
          Speichern
        </PrimaryButton>
      }
    >
      <TextField
        label="Name"
        value={werte.name}
        onChange={(name) => setze({ name })}
        placeholder="z. B. Magerquark"
      />

      <OptionGrid
        label="Werte gelten"
        value={werte.basis}
        onChange={(basis) => setze({ basis })}
        options={[
          { value: '100g', label: 'pro 100 g' },
          { value: 'stueck', label: 'pro Stück' },
        ]}
      />

      <div className="grid grid-cols-2 gap-x-3">
        <TextField
          label="Kalorien"
          inputMode="decimal"
          suffix="kcal"
          value={werte.kcal}
          onChange={(kcal) => setze({ kcal })}
        />
        <TextField
          label="Protein"
          inputMode="decimal"
          suffix="g"
          value={werte.protein}
          onChange={(protein) => setze({ protein })}
        />
        <TextField
          label="Fett"
          inputMode="decimal"
          suffix="g"
          value={werte.fat}
          onChange={(fat) => setze({ fat })}
        />
        <TextField
          label="Kohlenhydrate"
          inputMode="decimal"
          suffix="g"
          value={werte.carbs}
          onChange={(carbs) => setze({ carbs })}
        />
      </div>

      {food && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onLoeschen(food)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] font-semibold text-negative-strong"
          >
            <IconTrash size={16} />
            Lebensmittel löschen
          </button>
        </div>
      )}
    </Sheet>
  );
}
