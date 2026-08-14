import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

/**
 * Bottom-Sheet nach dem Vorbild aus den Screenshots: der Hintergrund wird
 * abgedunkelt und weichgezeichnet, das Blatt fährt mit einer Feder von unten
 * herein und lässt sich am Griff nach unten wegziehen.
 */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Kurzer erklärender Satz unter dem Titel. */
  subtitle?: string;
  children: ReactNode;
  /** Fest am unteren Rand stehender Bereich, z. B. der schwarze Aktionsknopf. */
  footer?: ReactNode;
  /** Sheet füllt den Bildschirm bis oben – für lange Listen. */
  fullHeight?: boolean;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const;

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  fullHeight = false,
}: SheetProps) {
  // Solange das Sheet offen ist, darf die Seite dahinter nicht scrollen.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Zurück-Geste und Escape schließen das Sheet, nicht die ganze Seite.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Weit genug gezogen oder schnell genug geschnippt – beides schließt.
    if (info.offset.y > 120 || info.velocity.y > 700) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 bg-[var(--c-backdrop)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative flex flex-col overflow-hidden bg-surface',
              'rounded-t-[var(--radius-sheet)] shadow-sheet',
              fullHeight ? 'h-[92vh]' : 'max-h-[88vh]',
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Griff – gleichzeitig die Ziehfläche */}
            <div className="flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing">
              <div className="h-1 w-9 rounded-full bg-line-strong" />
            </div>

            {title && (
              <div className="shrink-0 px-6 pt-3 pb-1">
                <h2 className="text-[26px] leading-tight font-extrabold tracking-tight">{title}</h2>
                {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-line px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}

            {!footer && <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
