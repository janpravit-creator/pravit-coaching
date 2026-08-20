import { useEffect, useState } from 'react';
import { IconCheck, IconTrash } from '@/components/icons';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider, ListRow } from '@/components/ui/Card';
import { TextArea } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import {
  deleteCheckin,
  markiereErledigt,
  speichereFeedback,
  updateCheckin,
} from '@/db/repo/checkins';
import { CHECKIN_SCALES, type Checkin } from '@/db/types';
import { istErledigt, istUngelesen } from '@/domain/checkin';
import { toast } from '@/state/uiStore';

/**
 * Check-in-Ansicht des Coaches – Werte lesen, Feedback schreiben, abhaken.
 *
 * Erledigen und Feedback schreiben setzen denselben Zustand. Genau das fehlte
 * bisher: „Als gesehen markieren" schrieb `seenByCoach`, die To-Do-Liste fragte
 * aber `coachFeedback` ab, und die Meldung blieb stehen. Beide Knöpfe hier
 * laufen über `markiereErledigt` bzw. `speichereFeedback`, die den Zustand
 * gemeinsam führen.
 */

export interface CheckinMitKunde extends Checkin {
  clientId: string;
}

export function CheckinSheet({
  checkin,
  kundenName,
  onClose,
  onGeaendert,
}: {
  checkin: CheckinMitKunde | null;
  kundenName?: string;
  onClose: () => void;
  onGeaendert: () => void;
}) {
  const [text, setText] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    setText(checkin?.coachFeedback ?? '');
  }, [checkin?.id, checkin?.coachFeedback]);

  // Öffnen heißt gelesen. Läuft im Hintergrund: schlägt es fehl, ist der
  // Check-in weiterhin sichtbar – schlimmer wäre ein blockiertes Sheet.
  useEffect(() => {
    if (!checkin || !istUngelesen(checkin)) return;
    void updateCheckin(checkin.clientId, checkin.id, { seenByCoach: true }).catch(() => {});
  }, [checkin?.id]);

  if (!checkin) return null;

  const speichern = async () => {
    if (laeuft) return;
    setLaeuft(true);
    try {
      await speichereFeedback(checkin.clientId, checkin.id, text.trim());
      toast.success('Feedback gespeichert. Der Kunde sieht es sofort.');
      onGeaendert();
      onClose();
    } catch {
      toast.error('Speichern hat nicht geklappt.');
    } finally {
      setLaeuft(false);
    }
  };

  const abhaken = async () => {
    if (laeuft) return;
    setLaeuft(true);
    try {
      await markiereErledigt(checkin.clientId, checkin.id);
      toast.success('Check-in abgehakt.');
      onGeaendert();
      onClose();
    } catch {
      toast.error('Abhaken hat nicht geklappt.');
    } finally {
      setLaeuft(false);
    }
  };

  const loeschen = async () => {
    if (laeuft) return;
    setLaeuft(true);
    try {
      await deleteCheckin(checkin.clientId, checkin.id);
      toast.info('Check-in gelöscht.');
      onGeaendert();
      onClose();
    } catch {
      toast.error('Löschen hat nicht geklappt.');
    } finally {
      setLaeuft(false);
    }
  };

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
    ['Fragen an dich', checkin.fragen],
    ['Sonstiges', checkin.gut],
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      title={kundenName ?? checkin.clientName ?? 'Check-in'}
      subtitle={checkin.datum ? `Check-in vom ${checkin.datum}` : 'Check-in ohne Datum'}
      fullHeight
      footer={
        <div className="flex gap-2.5">
          {!istErledigt(checkin) && (
            <SecondaryButton onClick={abhaken} disabled={laeuft} icon={<IconCheck size={19} />}>
              Abhaken
            </SecondaryButton>
          )}
          <PrimaryButton
            className="flex-1"
            onClick={speichern}
            disabled={laeuft || text.trim() === ''}
          >
            {checkin.coachFeedback ? 'Feedback ändern' : 'Feedback senden'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {istErledigt(checkin) ? <Pill tone="positiv">Erledigt</Pill> : <Pill tone="warnung">Offen</Pill>}
        {checkin.coachFeedback && (
          <Pill tone={checkin.feedbackSeenByClient ? 'neutral' : 'info'}>
            {checkin.feedbackSeenByClient ? 'Feedback gelesen' : 'Feedback ungelesen'}
          </Pill>
        )}
      </div>

      {/* Die fünf Skalen als Balken – auf einen Blick vergleichbar */}
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

      {zahlen.some(([, v]) => v) && (
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

      <div className="mt-6">
        <TextArea
          label="Dein Feedback"
          rows={6}
          value={text}
          onChange={setText}
          placeholder="Was lief gut, was passt du an?"
        />
      </div>

      <div className="mt-2 flex justify-end">
        <TextButton tone="negativ" onClick={loeschen} disabled={laeuft}>
          <span className="inline-flex items-center gap-1.5">
            <IconTrash size={16} />
            Check-in löschen
          </span>
        </TextButton>
      </div>
    </Sheet>
  );
}
