import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconArrowRight } from '@/components/icons';
import { PrimaryButton, TextButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Layout';
import { cn } from '@/lib/cn';
import { TOUR_SCHRITTE } from './tutorial';

/**
 * Die Einführungstour als Karte über der App.
 *
 * Bewusst mittig statt an ein Element geheftet: Die alte Fassung zeichnete
 * einen Rahmen um einen CSS-Treffer, der auf dem Handy oft gar nicht sichtbar
 * war. Eine ruhige Karte, die man mit einem Daumen durchblättert, erklärt
 * dasselbe zuverlässiger.
 */
export function TutorialOverlay({
  offen,
  onFertig,
}: {
  offen: boolean;
  onFertig: () => void;
}) {
  const [index, setIndex] = useState(0);
  const schritt = TOUR_SCHRITTE[index];
  const letzter = index === TOUR_SCHRITTE.length - 1;

  if (!offen || !schritt) return null;

  const weiter = () => {
    if (letzter) {
      setIndex(0);
      onFertig();
      return;
    }
    setIndex(index + 1);
  };

  const ueberspringen = () => {
    setIndex(0);
    onFertig();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Einführung"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={ueberspringen}
      />

      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        className="relative w-full max-w-md rounded-[var(--radius-card)] bg-surface p-6 shadow-card"
      >
        {schritt.bereich && (
          <div className="mb-3">
            <Pill tone="info">{schritt.bereich}</Pill>
          </div>
        )}

        {/* `key` erzwingt das Überblenden bei jedem Schritt. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="text-[24px] leading-tight font-extrabold tracking-tight">
              {schritt.titel}
            </h2>
            <p className="mt-2.5 text-[16px] leading-relaxed text-muted">{schritt.text}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden="true">
          {TOUR_SCHRITTE.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-5 bg-text' : 'w-1.5 bg-line-strong',
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-[13px] text-subtle">
          Schritt {index + 1} von {TOUR_SCHRITTE.length}
        </p>

        <div className="mt-5 flex items-center gap-2">
          {index > 0 ? (
            <TextButton onClick={() => setIndex(index - 1)}>Zurück</TextButton>
          ) : (
            <TextButton onClick={ueberspringen}>Überspringen</TextButton>
          )}
          <PrimaryButton
            className="flex-1"
            onClick={weiter}
            icon={letzter ? undefined : <IconArrowRight size={19} />}
          >
            {letzter ? 'Los geht’s' : 'Weiter'}
          </PrimaryButton>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
