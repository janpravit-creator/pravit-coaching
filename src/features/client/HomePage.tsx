import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconChevronRight,
  IconPill,
  IconSettings,
  IconTarget,
} from '@/components/icons';
import { IconButton, PrimaryButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section, StatTile, TapCard } from '@/components/ui/Card';
import { PillTabs } from '@/components/ui/Controls';
import { EmptyState, PageHeader, Pill, ProgressBar, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { markiereFeedbackGelesen } from '@/db/repo/checkins';
import type { MealPlan, TrainingPlan } from '@/db/types';
import { hatNeuesFeedbackFuerKunden } from '@/domain/checkin';
import { makrosEinerMahlzeit, makrosEinesPlans, zahl } from '@/domain/nutrition';
import { zielFortschritt } from '@/domain/training';
import { useEigeneCheckins, useEigenesProfil } from '@/hooks/useClientData';
import { useAuthStore } from '@/state/authStore';
import { EinstellungenSheet } from './EinstellungenSheet';
import { TutorialOverlay } from './TutorialOverlay';
import { merkeTourErledigt, setzeTourZurueck, tourErledigt } from './tutorial';

/**
 * Startseite des Kunden.
 *
 * Reihenfolge nach Dringlichkeit: neues Coach-Feedback zuerst, dann der
 * Zielfortschritt, dann die Pläne. Alles, was der Kunde täglich braucht,
 * ohne Scrollen erreichbar.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const uid = useAuthStore((s) => s.user?.uid);
  const { daten: profil, laedt, neuLaden: profilNeuLaden } = useEigenesProfil();
  const { daten: checkins, neuLaden } = useEigeneCheckins();

  const [planIndex, setPlanIndex] = useState(0);
  const [mealIndex, setMealIndex] = useState(0);
  const [planSheet, setPlanSheet] = useState<TrainingPlan | null>(null);
  const [einstellungen, setEinstellungen] = useState(false);
  const [tour, setTour] = useState(false);

  // Die Tour startet erst, wenn das Profil da ist – sonst liefe sie über einer
  // leeren Seite. Bestandskunden haben die Markierung längst gesetzt und
  // bekommen sie deshalb nicht erneut.
  useEffect(() => {
    if (!uid || laedt || !profil) return;
    if (!tourErledigt(uid)) setTour(true);
  }, [uid, laedt, profil]);

  const neuesFeedback = useMemo(
    () => (checkins ?? []).filter(hatNeuesFeedbackFuerKunden),
    [checkins],
  );

  const gewicht = useMemo(() => {
    const mitGewicht = (checkins ?? []).find((ci) => zahl(ci.kg) > 0);
    const aktuell = mitGewicht ? zahl(mitGewicht.kg) : zahl(profil?.kg);
    const start = zahl(profil?.kg);
    const ziel = zahl(profil?.zielgewicht);
    return { aktuell, start, ziel, fortschritt: zielFortschritt(start, aktuell, ziel) };
  }, [checkins, profil]);

  /** Gewichtsveränderung zur Vorwoche. */
  const vorwoche = useMemo(() => {
    const grenze = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const alt = (checkins ?? []).find((ci) => zahl(ci.kg) > 0 && (ci.datum ?? '') <= grenze);
    if (!alt || gewicht.aktuell === 0) return null;
    return Math.round((gewicht.aktuell - zahl(alt.kg)) * 10) / 10;
  }, [checkins, gewicht.aktuell]);

  if (laedt) return <Screen><div className="h-40" /></Screen>;

  const plans = profil?.plans ?? [];
  const mealPlans = profil?.mealPlans ?? [];
  const supplements = profil?.supplements ?? [];
  const aktuellerPlan = plans[planIndex];
  const aktuellerMealPlan = mealPlans[mealIndex];

  return (
    <Screen>
      <PageHeader
        title={`Hey, ${profil?.vn ?? ''}!`}
        subtitle={profil?.ziel || 'PRAVIT Coaching'}
        trailing={
          <IconButton label="Einstellungen" onClick={() => setEinstellungen(true)}>
            <IconSettings size={20} />
          </IconButton>
        }
      />

      {/* Neues Feedback – das Wichtigste zuerst */}
      {neuesFeedback.length > 0 && (
        <TapCard
          className="mb-6 bg-action"
          onClick={async () => {
            const uid = useAuthStore.getState().user?.uid;
            if (uid) await markiereFeedbackGelesen(uid, neuesFeedback.map((ci) => ci.id));
            neuLaden();
            navigate('/check-in');
          }}
        >
          <div className="flex items-center gap-4 text-[var(--c-action-text)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
              <IconBell size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-extrabold tracking-tight">
                {neuesFeedback.length === 1
                  ? 'Neues Feedback von deinem Coach'
                  : `${neuesFeedback.length} neue Rückmeldungen`}
              </div>
              <div className="mt-0.5 text-[14px] opacity-70">Antippen zum Lesen</div>
            </div>
            <IconChevronRight size={20} className="shrink-0 opacity-70" />
          </div>
        </TapCard>
      )}

      {/* Zielfortschritt */}
      {gewicht.ziel > 0 && (
        <Section title="Dein Ziel">
          <Card>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-muted">Start {gewicht.start} kg</span>
              <span className="tnum text-[24px] font-extrabold tracking-tight">
                {gewicht.aktuell} kg
              </span>
              <span className="text-[13px] text-muted">Ziel {gewicht.ziel} kg</span>
            </div>
            <ProgressBar value={(gewicht.fortschritt ?? 0) / 100} />
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted">
                {gewicht.fortschritt ?? 0} % erreicht
              </span>
              {vorwoche !== null && (
                <Pill tone={vorwoche === 0 ? 'neutral' : richtungPasst(vorwoche, gewicht) ? 'positiv' : 'negativ'}>
                  {vorwoche > 0 ? '+' : ''}
                  {vorwoche} kg zur Vorwoche
                </Pill>
              )}
            </div>
          </Card>
        </Section>
      )}

      {/* Trainingspläne */}
      <Section title="Trainingsplan">
        {plans.length === 0 ? (
          <Card>
            <p className="text-[15px] text-muted">
              Dein Coach stellt deinen Plan gerade zusammen.
            </p>
          </Card>
        ) : (
          <>
            {plans.length > 1 && (
              <PillTabs
                className="mb-3"
                value={planIndex}
                onChange={setPlanIndex}
                options={plans.map((p, i) => ({ value: i, label: p.name }))}
              />
            )}
            <Card padded={false} className="px-4">
              {(aktuellerPlan?.days ?? []).map((day, index) => (
                <div key={`${day.name}-${index}`}>
                  {index > 0 && <Divider />}
                  <ListRow
                    title={day.name}
                    subtitle={`${day.exercises?.length ?? 0} Übungen`}
                    onClick={() => setPlanSheet({ name: aktuellerPlan!.name, days: [day] })}
                    chevron
                  />
                </div>
              ))}
            </Card>
            <div className="mt-3">
              <PrimaryButton block onClick={() => navigate('/logbuch')}>
                Training eintragen
              </PrimaryButton>
            </div>
          </>
        )}
      </Section>

      {/* Ernährungspläne */}
      {mealPlans.length > 0 && aktuellerMealPlan && (
        <Section title="Ernährungsplan">
          {mealPlans.length > 1 && (
            <PillTabs
              className="mb-3"
              value={mealIndex}
              onChange={setMealIndex}
              options={mealPlans.map((p, i) => ({ value: i, label: p.name }))}
            />
          )}
          <MakroKacheln plan={aktuellerMealPlan} />
          <Card padded={false} className="mt-2.5 px-4">
            {(aktuellerMealPlan.meals ?? []).map((meal, index) => {
              const m = makrosEinerMahlzeit(meal);
              return (
                <div key={`${meal.name}-${index}`}>
                  {index > 0 && <Divider />}
                  <div className="py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[16px] font-bold tracking-tight">
                        {meal.name || `Mahlzeit ${index + 1}`}
                      </span>
                      <span className="tnum shrink-0 text-[14px] font-bold text-muted">
                        {Math.round(m.kcal)} kcal
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {(meal.foods ?? []).map((food, fi) => (
                        <div key={fi} className="flex justify-between gap-3 text-[14px]">
                          <span className="min-w-0 flex-1 truncate">{food.name}</span>
                          <span className="shrink-0 text-muted">{food.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        </Section>
      )}

      {/* Supplements */}
      {supplements.length > 0 && (
        <Section title="Supplements">
          <Card padded={false} className="px-4">
            {supplements.map((s, index) => (
              <div key={`${s.name}-${index}`}>
                {index > 0 && <Divider />}
                <ListRow
                  leading={<IconPill size={20} className="text-muted" />}
                  title={s.name}
                  subtitle={s.dose}
                  trailing={s.time ? <Pill>{s.time}</Pill> : undefined}
                />
              </div>
            ))}
          </Card>
        </Section>
      )}

      {plans.length === 0 && mealPlans.length === 0 && (
        <EmptyState
          icon={<IconTarget size={28} />}
          title="Dein Coach ist dran"
          description="Sobald deine Pläne stehen, erscheinen sie hier. Du kannst schon jetzt deinen ersten Check-in schicken."
          action={<PrimaryButton onClick={() => navigate('/check-in')}>Zum Check-in</PrimaryButton>}
        />
      )}

      <Sheet
        open={planSheet !== null}
        onClose={() => setPlanSheet(null)}
        title={planSheet?.days?.[0]?.name ?? ''}
        subtitle={planSheet?.name}
        fullHeight
      >
        {(planSheet?.days?.[0]?.exercises ?? []).map((ex, index) => (
          <div key={index}>
            {index > 0 && <Divider />}
            <ListRow
              title={ex.name}
              subtitle={`${ex.sets ?? '3'} Sätze${ex.reps ? ` · ${ex.reps} Wdh` : ''}`}
            />
          </div>
        ))}
        {planSheet?.days?.[0]?.note && (
          <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-3.5 text-[14px] leading-relaxed">
            {planSheet.days[0].note}
          </p>
        )}
      </Sheet>

      <EinstellungenSheet
        offen={einstellungen}
        onClose={() => setEinstellungen(false)}
        profil={profil}
        onProfilGeaendert={profilNeuLaden}
        onTourStarten={() => {
          if (uid) setzeTourZurueck(uid);
          setTour(true);
        }}
      />

      <TutorialOverlay
        offen={tour}
        onFertig={() => {
          setTour(false);
          if (uid) merkeTourErledigt(uid);
        }}
      />
    </Screen>
  );
}

/** Zeigt Abnehmen als grün, wenn das Ziel unter dem Startgewicht liegt. */
function richtungPasst(diff: number, g: { start: number; ziel: number }): boolean {
  if (g.ziel === g.start) return true;
  return g.ziel < g.start ? diff < 0 : diff > 0;
}

function MakroKacheln({ plan }: { plan: MealPlan }) {
  const m = makrosEinesPlans(plan);
  return (
    <div className="grid grid-cols-4 gap-2">
      <StatTile value={Math.round(m.kcal)} label="kcal" />
      <StatTile value={`${Math.round(m.prot)} g`} label="Protein" />
      <StatTile value={`${Math.round(m.fat)} g`} label="Fett" />
      <StatTile value={`${Math.round(m.carbs)} g`} label="Carbs" />
    </div>
  );
}
