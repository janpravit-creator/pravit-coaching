import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/state/uiStore';
import { IconUndo } from '../icons';

/**
 * Hinweise am unteren Rand. Tragen die „Rückgängig"-Aktion, mit der jedes
 * Löschen in der App zurückgenommen werden kann – möglich, weil nichts hart
 * gelöscht wird, sondern nur als gelöscht markiert.
 */
export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3.5 shadow-raised',
              item.tone === 'negativ'
                ? 'bg-negative text-white'
                : item.tone === 'positiv'
                  ? 'bg-positive text-white'
                  : 'bg-action text-[var(--c-action-text)]',
            )}
          >
            <span className="min-w-0 flex-1 text-[15px] leading-snug font-semibold">
              {item.message}
            </span>

            {item.action && (
              <button
                onClick={() => {
                  item.action?.run();
                  dismiss(item.id);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[14px] font-bold"
              >
                <IconUndo size={16} />
                {item.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
