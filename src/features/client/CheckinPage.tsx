import { useMemo, useState } from 'react';
import { IconCheck, IconChevronRight, IconNote } from '@/components/icons';
import { PrimaryButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Controls';
import { DateField } from '@/components/ui/DateField';
import { TextArea, TextField } from '@/components/ui/Field';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { createCheckin } from '@/db/repo/checkins';
import { CHECKIN_SCALES, type Checkin } from '@/db/types';
import { heute } from '@/domain/dates';
import { hatFeedback } from '@/domain/checkin';
import { useEigeneCheckins, useEigenesProfil } from '@/hooks/useClientData';
import { dateShort } from '@/lib/format';
import { useAuthStore } from '@/state/authStore';
import { toast } from '@/state/uiStore';

/**
 * Wöchentlicher Check-in.
 *
 * Die fünf Bewertungsskalen laufen über die Schieberegler aus dem
 * Logbuch-Design statt über die eckigen roten Regler von vorher. Alles außer
 * dem Gewicht ist freiwillig – ein Check-in soll in zwei Minuten erledigt sein.
 */

const SKALEN_HINWEISE: Record<string, string> = {
  intensitaet: 'Wie hart waren deine Trainings diese Woche?',
  ernscore: 'Wie gut hast du dich an den Plan gehalten?',
  schlaf: 'Wie erholt bist du aufgewacht?',
  energie: 'Wie viel Energie hattest du im Alltag?',
  stress: 'Wie belastet warst du? Hoch bedeutet viel Stress.',
};

interface Formular {
  datum: string;
  kg: string;
  tage: string;
  kcal: string;
  prot: string;
  schlafdauer: string;
  wasser: string;
  schritte: string;
  skalen: Record<string, number | null>;
  highlight: string;
  nichtgut: string;
  gut: string;
  ziel: string;
  fragen: string;
}

function leeresFormular(): Formular {
  return {
    datum: heute(),
    kg: '', tage: '', kcal: '', prot: '', schlafdauer: '', wasser: '', schritte: '',
    skalen: { intensitaet: null, ernscore: null, schlaf: null, energie: null, stress: null },
    highlight: '', nichtgut: '', gut: '', ziel: '', fragen: '',
  };
}

export default function CheckinPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { daten: profil } = useEigenesProfil();
  const { daten: checkins, neuLaden } = useEigeneCheckins();

  const [f, setF] = useState<Formular>(leeresFormular);
  const [laeuft, setLaeuft] = useState(false);
  const [detail, setDetail] = useState<Checkin | null>(null);

  const setze = (patch: Partial<Formular>) => setF((c) => ({ ...c, ...patch }));
  const setzeSkala = (key: string, wert: number) =>
    setF((c) => ({ ...c, skalen: { ...c.skalen, [key]: wert } }));

  const gueltig = f.kg.trim() !== '';

  const letzterCheckin = useMemo(() => (checkins ?? [])[0], [checkins]);

  const absenden = async () => {
    if (!gueltig || !uid || laeuft) return;
    setLaeuft(true);
    try {
      await createCheckin(
        uid,
        {
          datum: f.datum,
          kg: f.kg,
          tage: f.tage,
          kcal: f.kcal,
          prot: f.prot,
          schlafdauer: f.schlafdauer,
          wasser: f.wasser,
          schritte: f.schritte,
          intensitaet: f.skalen['intensitaet'] ?? '',
          ernscore: f.skalen['ernscore'] ?? '',
          schlaf: f.skalen['schlaf'] ?? '',
          energie: f.skalen['energie'] ?? '',
          stress: f.skalen['stress'] ?? '',
          highlight: f.highlight,
          nichtgut: f.nichtgut,
          gut: f.gut,
          ziel: f.ziel,
          fragen: f.fragen,
          clientName: `${profil?.vn ?? ''} ${profil?.nn ?? ''}`.trim(),
          createdAt: new Date().toISOString(),
        },
        `${profil?.vn ?? ''} ${profil?.nn ?? ''}`.trim(),
      );
      setF(leeresFormular());
      neuLaden();
      toast.success('Check-in gesendet. Dein Coach meldet sich.');
    } catch {
      toast.error('Das Senden hat nicht geklappt. Bitte prüfe deine Verbindung.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Screen actionSpace>
      <PageHeader
        title="Check-in"
        subtitle="Wie lief deine Woche? Nur das Gewicht ist Pflicht."
      />

      <Section title="Diese Woche">
        <Card>
          <DateField label="Datum" value={f.datum} onChange={(v) => setze({ datum: v })} />
          <TextField
            label="Gewicht"
            inputMode="decimal"
            suffix="kg"
            value={f.kg}
            onChange={(v) => setze({ kg: v })}
            placeholder={letzterCheckin?.kg ? `zuletzt ${letzterCheckin.kg}` : '—'}
          />
          <TextField
            label="Trainingstage"
            inputMode="numeric"
            value={f.tage}
            onChange={(v) => setze({ tage: v })}
            placeholder="z. B. 4"
          />
        </Card>
      </Section>

      {/* Die fünf Skalen – der Kern des Check-ins */}
      <Section title="Wie war's?">
        <Card>
          {CHECKIN_SCALES.map(({ key, label }) => (
            <Slider
              key={key}
              label={label}
              value={f.skalen[key] ?? null}
              onChange={(wert) => setzeSkala(key, wert)}
              min={1}
              max={10}
              hint={SKALEN_HINWEISE[key]}
            />
          ))}
        </Card>
      </Section>

      <Section title="Zahlen (freiwillig)">
        <Card>
          <div className="grid grid-cols-2 gap-x-3">
            <TextField label="Kalorien Ø" inputMode="numeric" suffix="kcal" value={f.kcal} onChange={(v) => setze({ kcal: v })} placeholder="—" />
            <TextField label="Protein Ø" inputMode="numeric" suffix="g" value={f.prot} onChange={(v) => setze({ prot: v })} placeholder="—" />
            <TextField label="Schlaf Ø" inputMode="decimal" suffix="h" value={f.schlafdauer} onChange={(v) => setze({ schlafdauer: v })} placeholder="—" />
            <TextField label="Wasser Ø" inputMode="decimal" suffix="l" value={f.wasser} onChange={(v) => setze({ wasser: v })} placeholder="—" />
            <TextField label="Schritte Ø" inputMode="numeric" value={f.schritte} onChange={(v) => setze({ schritte: v })} placeholder="—" />
          </div>
        </Card>
      </Section>

      <Section title="Erzähl mal">
        <Card>
          <TextArea label="Was lief richtig gut?" rows={2} value={f.highlight} onChange={(v) => setze({ highlight: v })} />
          <TextArea label="Was lief nicht so gut?" rows={2} value={f.nichtgut} onChange={(v) => setze({ nichtgut: v })} />
          <TextArea label="Was nimmst du dir vor?" rows={2} value={f.ziel} onChange={(v) => setze({ ziel: v })} />
          <TextArea label="Fragen an deinen Coach" rows={2} value={f.fragen} onChange={(v) => setze({ fragen: v })} />
        </Card>
      </Section>

      <PrimaryButton block onClick={absenden} disabled={!gueltig || laeuft} icon={<IconCheck size={20} />}>
        {laeuft ? 'Wird gesendet …' : 'Check-in absenden'}
      </PrimaryButton>
      {!gueltig && (
        <p className="mt-2 text-center text-[13px] text-muted">
          Trag mindestens dein Gewicht ein.
        </p>
      )}

      {/* Verlauf */}
      <Section title="Deine bisherigen Check-ins" className="mt-9">
        {checkins && checkins.length === 0 ? (
          <EmptyState
            icon={<IconNote size={26} />}
            title="Noch kein Check-in"
            description="Dein erster Check-in erscheint hier, sobald du ihn abgeschickt hast."
          />
        ) : (
          <Card padded={false} className="px-4">
            {(checkins ?? []).map((ci, index) => (
              <div key={ci.id}>
                {index > 0 && <Divider />}
                <ListRow
                  title={ci.datum ? dateShort(new Date(`${ci.datum}T12:00:00`).getTime()) : 'Ohne Datum'}
                  subtitle={ci.kg ? `${ci.kg} kg` : undefined}
                  trailing={
                    hatFeedback(ci) ? (
                      <Pill tone={ci.feedbackSeenByClient ? 'neutral' : 'positiv'}>
                        {ci.feedbackSeenByClient ? 'Feedback' : 'Neu'}
                      </Pill>
                    ) : (
                      <Pill>gesendet</Pill>
                    )
                  }
                  onClick={() => setDetail(ci)}
                  chevron
                />
              </div>
            ))}
          </Card>
        )}
      </Section>

      <CheckinDetail checkin={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

function CheckinDetail({ checkin, onClose }: { checkin: Checkin | null; onClose: () => void }) {
  if (!checkin) return null;

  const zahlen: Array<[string, string | undefined]> = [
    ['Gewicht', checkin.kg ? `${checkin.kg} kg` : undefined],
    ['Trainingstage', checkin.tage],
    ['Kalorien Ø', checkin.kcal ? `${checkin.kcal} kcal` : undefined],
    ['Protein Ø', checkin.prot ? `${checkin.prot} g` : undefined],
    ['Schlaf Ø', checkin.schlafdauer ? `${checkin.schlafdauer} h` : undefined],
    ['Wasser Ø', checkin.wasser ? `${checkin.wasser} l` : undefined],
    ['Schritte Ø', checkin.schritte],
  ];

  const texte: Array<[string, string | undefined]> = [
    ['Lief gut', checkin.highlight],
    ['Lief nicht gut', checkin.nichtgut],
    ['Vorgenommen', checkin.ziel],
    ['Fragen', checkin.fragen],
    ['Sonstiges', checkin.gut],
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      title={checkin.datum ?? 'Check-in'}
      subtitle="Dein Check-in"
      fullHeight
    >
      {hatFeedback(checkin) && (
        <Card className="mb-5 bg-positive-soft shadow-none">
          <div className="mb-1.5 flex items-center gap-2">
            <IconChevronRight size={16} className="text-positive-strong" />
            <span className="text-[13px] font-bold text-positive-strong">Feedback von deinem Coach</span>
          </div>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{checkin.coachFeedback}</p>
        </Card>
      )}

      <div className="mb-5 space-y-2">
        {CHECKIN_SCALES.map(({ key, label }) => {
          const wert = Number(checkin[key as keyof Checkin] ?? 0);
          if (!wert) return null;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-[14px] font-semibold">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-text" style={{ width: `${wert * 10}%` }} />
              </div>
              <span className="tnum w-6 shrink-0 text-right text-[14px] font-bold">{wert}</span>
            </div>
          );
        })}
      </div>

      {zahlen.filter(([, v]) => v).length > 0 && (
        <Card padded={false} className="mb-4 px-4">
          {zahlen
            .filter(([, v]) => v)
            .map(([label, wert], index) => (
              <div key={label}>
                {index > 0 && <Divider />}
                <ListRow title={label} trailing={<span className="tnum font-bold">{wert}</span>} />
              </div>
            ))}
        </Card>
      )}

      {texte
        .filter(([, v]) => v?.trim())
        .map(([label, wert]) => (
          <div key={label} className="mb-4">
            <h3 className="mb-1.5 text-[13px] font-bold text-muted">{label}</h3>
            <p className="rounded-2xl bg-surface-muted px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
              {wert}
            </p>
          </div>
        ))}
    </Sheet>
  );
}
