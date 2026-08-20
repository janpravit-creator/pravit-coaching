import { useState, type ReactNode } from 'react';
import { PrimaryButton, SecondaryButton } from './Button';
import { Sheet } from './Sheet';

/**
 * Rückfrage vor einem Schritt, der sich nicht zurücknehmen lässt.
 *
 * Ersetzt `confirm()` – das sah auf jedem Gerät anders aus, blockierte den
 * Bildschirm und ließ sich nicht beschriften. Hier steht in der Schaltfläche,
 * was passiert („Löschen"), nicht „OK".
 */

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: 'schwarz' | 'negativ';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmSheet({
  frage,
  onClose,
}: {
  frage: ConfirmOptions | null;
  onClose: () => void;
}) {
  const [laeuft, setLaeuft] = useState(false);

  if (!frage) return null;

  return (
    <Sheet
      open
      onClose={laeuft ? () => {} : onClose}
      title={frage.title}
      footer={
        <div className="flex gap-2.5">
          <SecondaryButton className="flex-1" onClick={onClose} disabled={laeuft}>
            Abbrechen
          </SecondaryButton>
          <PrimaryButton
            className="flex-1"
            tone={frage.tone === 'negativ' ? 'negativ' : 'schwarz'}
            disabled={laeuft}
            onClick={async () => {
              setLaeuft(true);
              try {
                await frage.onConfirm();
                onClose();
              } finally {
                setLaeuft(false);
              }
            }}
          >
            {laeuft ? 'Einen Moment …' : frage.confirmLabel}
          </PrimaryButton>
        </div>
      }
    >
      {frage.description && (
        <p className="text-[16px] leading-relaxed text-muted">{frage.description}</p>
      )}
    </Sheet>
  );
}

/** Kleiner Helfer, damit eine Seite nur einen Zustand für alle Rückfragen braucht. */
export function useConfirm() {
  const [frage, setFrage] = useState<ConfirmOptions | null>(null);
  return {
    frage,
    fragen: setFrage,
    schliessen: () => setFrage(null),
  };
}
