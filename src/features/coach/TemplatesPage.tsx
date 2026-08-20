import { useMemo, useState } from 'react';
import { IconCopy, IconList, IconPlus, IconTrash } from '@/components/icons';
import { FloatingAction, PrimaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section } from '@/components/ui/Card';
import { ConfirmSheet, useConfirm } from '@/components/ui/Confirm';
import { PillTabs } from '@/components/ui/Controls';
import { TextField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { deleteTemplate, saveTemplate, vorlagenArt } from '@/db/repo/library';
import type { Meal, PlanDay, Template, TemplateType } from '@/db/types';
import { useLebensmittel, useUebungen, useVorlagen } from '@/hooks/useCoachData';
import { toast } from '@/state/uiStore';
import { MealPlanEditor } from './editors/MealPlanEditor';
import { TrainingPlanEditor } from './editors/TrainingPlanEditor';

/**
 * Plan-Vorlagen.
 *
 * Eine Vorlage trägt ihre Tage bzw. Mahlzeiten unmittelbar. Damit derselbe
 * Editor wie beim Kunden zum Einsatz kommt, wird sie beim Öffnen kurz in die
 * Plan-Form gebracht und beim Speichern wieder ausgepackt – der Kunde bekommt
 * so garantiert genau das zu sehen, was hier steht.
 */
export default function TemplatesPage() {
  const { daten: vorlagen, laedt, neuLaden } = useVorlagen();
  const { daten: uebungen } = useUebungen();
  const { daten: lebensmittel } = useLebensmittel();
  const confirm = useConfirm();

  const [art, setArt] = useState<TemplateType>('training');
  const [bearbeitet, setBearbeitet] = useState<Template | null>(null);

  const gefiltert = useMemo(
    () => (vorlagen ?? []).filter((t) => vorlagenArt(t) === art),
    [vorlagen, art],
  );

  const neu = () =>
    setBearbeitet({
      id: `tpl_${Date.now()}`,
      name: art === 'training' ? 'Neuer Trainingsplan' : 'Neuer Ernährungsplan',
      type: art,
      days: [],
      meals: [],
    });

  const duplizieren = async (vorlage: Template) => {
    try {
      await saveTemplate({
        name: `${vorlage.name} (Kopie)`,
        type: vorlagenArt(vorlage),
        days: vorlage.days ?? [],
        meals: vorlage.meals ?? [],
      });
      toast.success('Vorlage dupliziert.');
      neuLaden();
    } catch {
      toast.error('Duplizieren hat nicht geklappt.');
    }
  };

  return (
    <Screen actionSpace>
      <PageHeader
        title="Vorlagen"
        subtitle="Einmal aufbauen, bei jedem Kunden einsetzen."
      />

      <PillTabs
        className="mb-5"
        value={art}
        onChange={setArt}
        options={[
          { value: 'training', label: 'Training' },
          { value: 'ernaehrung', label: 'Ernährung' },
        ]}
      />

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : gefiltert.length === 0 ? (
        <EmptyState
          icon={<IconList size={28} />}
          title="Noch keine Vorlage"
          description={
            art === 'training'
              ? 'Leg einen Trainingsplan an, den du immer wieder brauchst.'
              : 'Leg einen Ernährungsplan an, den du immer wieder brauchst.'
          }
          action={
            <PrimaryButton onClick={neu} icon={<IconPlus size={20} />}>
              Vorlage anlegen
            </PrimaryButton>
          }
        />
      ) : (
        <Section>
          <Card padded={false} className="px-4">
            {gefiltert.map((vorlage, index) => (
              <div key={vorlage.id}>
                {index > 0 && <Divider />}
                <ListRow
                  title={vorlage.name}
                  subtitle={
                    vorlagenArt(vorlage) === 'training'
                      ? `${(vorlage.days ?? []).length} Trainingstage`
                      : `${(vorlage.meals ?? []).length} Mahlzeiten`
                  }
                  trailing={
                    <span className="flex items-center gap-1">
                      <button
                        aria-label={`${vorlage.name} duplizieren`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void duplizieren(vorlage);
                        }}
                        className="rounded-full p-2 text-subtle"
                      >
                        <IconCopy size={18} />
                      </button>
                      <button
                        aria-label={`${vorlage.name} löschen`}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirm.fragen({
                            title: 'Vorlage löschen?',
                            description: `„${vorlage.name}" wird entfernt. Bereits eingesetzte Pläne bei Kunden bleiben unberührt.`,
                            confirmLabel: 'Löschen',
                            tone: 'negativ',
                            onConfirm: async () => {
                              await deleteTemplate(vorlage.id);
                              toast.info('Vorlage gelöscht.');
                              neuLaden();
                            },
                          });
                        }}
                        className="rounded-full p-2 text-subtle"
                      >
                        <IconTrash size={18} />
                      </button>
                    </span>
                  }
                  onClick={() => setBearbeitet(vorlage)}
                />
              </div>
            ))}
          </Card>
          <p className="mt-2 px-1 text-[13px] text-muted">
            Beim Kunden fügst du eine Vorlage über „Aus Vorlage" ein. Änderungen dort wirken nie
            auf die Vorlage zurück.
          </p>
        </Section>
      )}

      {gefiltert.length > 0 && (
        <FloatingAction onClick={neu} icon={<IconPlus size={20} />}>
          Neue Vorlage
        </FloatingAction>
      )}

      <VorlagenEditor
        vorlage={bearbeitet}
        uebungsNamen={(uebungen ?? []).map((e) => e.name)}
        lebensmittelNamen={(lebensmittel ?? []).map((f) => f.name)}
        onClose={() => setBearbeitet(null)}
        onGespeichert={() => {
          setBearbeitet(null);
          neuLaden();
        }}
      />

      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </Screen>
  );
}

function VorlagenEditor({
  vorlage,
  uebungsNamen,
  lebensmittelNamen,
  onClose,
  onGespeichert,
}: {
  vorlage: Template | null;
  uebungsNamen: string[];
  lebensmittelNamen: string[];
  onClose: () => void;
  onGespeichert: () => void;
}) {
  const [name, setName] = useState(vorlage?.name ?? '');
  const [days, setDays] = useState<PlanDay[]>(vorlage?.days ?? []);
  const [meals, setMeals] = useState<Meal[]>(vorlage?.meals ?? []);
  const [laeuft, setLaeuft] = useState(false);

  // Beim Wechsel auf eine andere Vorlage die Felder neu setzen. Ohne Schlüssel
  // am Sheet bliebe sonst der Inhalt der vorigen stehen.
  const schluessel = vorlage?.id ?? '';
  const [zuletzt, setZuletzt] = useState(schluessel);
  if (schluessel !== zuletzt) {
    setZuletzt(schluessel);
    setName(vorlage?.name ?? '');
    setDays(vorlage?.days ?? []);
    setMeals(vorlage?.meals ?? []);
  }

  if (!vorlage) return null;

  const art = vorlagenArt(vorlage);

  const speichern = async () => {
    setLaeuft(true);
    try {
      await saveTemplate({
        id: vorlage.id,
        name: name.trim() || 'Vorlage',
        type: art,
        days: art === 'training' ? days : [],
        meals: art === 'ernaehrung' ? meals : [],
        ...(vorlage.createdAt ? { createdAt: vorlage.createdAt } : {}),
      });
      toast.success('Vorlage gespeichert.');
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
      title="Vorlage"
      subtitle={art === 'training' ? 'Trainingsplan' : 'Ernährungsplan'}
      fullHeight
      footer={
        <div className="flex gap-2.5">
          <TextButton onClick={onClose}>Abbrechen</TextButton>
          <PrimaryButton className="flex-1" disabled={laeuft} onClick={speichern}>
            {laeuft ? 'Wird gespeichert …' : 'Vorlage speichern'}
          </PrimaryButton>
        </div>
      }
    >
      <TextField label="Name der Vorlage" value={name} onChange={setName} />

      <div className="mt-3">
        {art === 'training' ? (
          // Die Vorlage wird als Plan mit einem einzigen Eintrag dargestellt,
          // damit derselbe Editor wie beim Kunden greift.
          <TrainingPlanEditor
            plans={[{ name: name || 'Vorlage', days }]}
            onChange={(plans) => setDays(plans[0]?.days ?? [])}
            onVorlage={() => toast.info('Vorlagen lassen sich nicht ineinander einfügen.')}
            uebungsNamen={uebungsNamen}
          />
        ) : (
          <MealPlanEditor
            mealPlans={[{ name: name || 'Vorlage', meals }]}
            onChange={(plans) => setMeals(plans[0]?.meals ?? [])}
            onVorlage={() => toast.info('Vorlagen lassen sich nicht ineinander einfügen.')}
            lebensmittelNamen={lebensmittelNamen}
          />
        )}
      </div>
    </Sheet>
  );
}
