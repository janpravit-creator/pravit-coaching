import { useEffect, useRef, useState } from 'react';
import { IconPlus, IconSearch } from '@/components/icons';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card, Divider } from '@/components/ui/Card';
import { SearchField, TextField } from '@/components/ui/Field';
import { EmptyState, Pill } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { sucheLebensmittel } from '@/db/foodSearch';
import { upsertCustomFood } from '@/db/repo/library';
import { ausTreffer, type Lebensmitteltreffer } from '@/domain/lebensmittel';
import type { MealFood } from '@/db/types';
import { toast } from '@/state/uiStore';

/**
 * Lebensmittel suchen und übernehmen.
 *
 * Drei Stufen (eigene Datenbank, Open Food Facts, USDA) stecken in
 * `db/foodSearch.ts`. Hier steht nur die Bedienung: suchen, Treffer wählen,
 * Menge eintragen, übernehmen – und falls nichts passt, selbst anlegen.
 */
export function FoodSearchSheet({
  startwert,
  onUebernehmen,
  onClose,
}: {
  startwert?: string;
  onUebernehmen: (food: MealFood) => void;
  onClose: () => void;
}) {
  const [frage, setFrage] = useState(startwert ?? '');
  const [treffer, setTreffer] = useState<Lebensmitteltreffer[] | null>(null);
  const [hinweis, setHinweis] = useState<string | undefined>();
  const [laeuft, setLaeuft] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<Lebensmitteltreffer | null>(null);
  const [eigenesOffen, setEigenesOffen] = useState(false);

  // Eine laufende Suche abbrechen, wenn eine neue startet oder das Sheet
  // zugeht – sonst überschreibt eine langsame alte Antwort die neue.
  const laufend = useRef<AbortController | null>(null);
  useEffect(() => () => laufend.current?.abort(), []);

  const suchen = async () => {
    const q = frage.trim();
    if (!q) return;

    laufend.current?.abort();
    const controller = new AbortController();
    laufend.current = controller;

    setLaeuft(true);
    setTreffer(null);
    setHinweis(undefined);

    try {
      const ergebnis = await sucheLebensmittel(q, controller.signal);
      if (controller.signal.aborted) return;
      setTreffer(ergebnis.treffer);
      setHinweis(ergebnis.hinweis);
    } catch {
      if (!controller.signal.aborted) {
        setTreffer([]);
        setHinweis('Die Suche ist fehlgeschlagen.');
      }
    } finally {
      if (!controller.signal.aborted) setLaeuft(false);
    }
  };

  if (gewaehlt) {
    return (
      <MengeSheet
        treffer={gewaehlt}
        onZurueck={() => setGewaehlt(null)}
        onUebernehmen={(food) => {
          onUebernehmen(food);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (eigenesOffen) {
    return (
      <EigenesSheet
        name={frage}
        onZurueck={() => setEigenesOffen(false)}
        onUebernehmen={(food) => {
          onUebernehmen(food);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <Sheet open onClose={onClose} title="Lebensmittel suchen" fullHeight>
      <div className="flex items-end gap-2.5">
        <div className="min-w-0 flex-1">
          <SearchField
            value={frage}
            onChange={setFrage}
            placeholder="z. B. Haferflocken, Banane"
          />
        </div>
        <PrimaryButton disabled={!frage.trim() || laeuft} onClick={() => void suchen()}>
          {laeuft ? '…' : 'Suchen'}
        </PrimaryButton>
      </div>

      <p className="px-1 pt-2 text-[13px] leading-relaxed text-muted">
        Zuerst wird eure eigene Datenbank durchsucht, danach Open Food Facts (verpackte Produkte)
        und USDA (frisches Obst und Gemüse).
      </p>

      {laeuft && (
        <p className="px-1 pt-6 text-center text-[14px] text-muted">Suche läuft …</p>
      )}

      {!laeuft && treffer !== null && treffer.length === 0 && (
        <div className="pt-4">
          <EmptyState
            icon={<IconSearch size={30} />}
            title="Keine Treffer"
            description={
              hinweis
                ? `Weder in eurer Datenbank noch im Netz gefunden (${hinweis}).`
                : 'Weder in eurer Datenbank noch bei Open Food Facts oder USDA.'
            }
          />
          <SecondaryButton block icon={<IconPlus size={18} />} onClick={() => setEigenesOffen(true)}>
            Selbst anlegen
          </SecondaryButton>
        </div>
      )}

      {!laeuft && treffer !== null && treffer.length > 0 && (
        <div className="pt-4">
          {hinweis && (
            <p className="mb-3 px-1 text-[13px] text-muted">
              Nur eigene Treffer – das Netz war nicht erreichbar ({hinweis}).
            </p>
          )}

          <Card padded={false} className="px-4">
            {treffer.slice(0, 12).map((t, i) => (
              <div key={`${t.name}-${i}`}>
                {i > 0 && <Divider />}
                <button
                  onClick={() => setGewaehlt(t)}
                  className="w-full py-3.5 text-left"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-tight">
                      {t.name}
                    </span>
                    {t.herkunft === 'Eigene Datenbank' && <Pill tone="positiv">eigen</Pill>}
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    {Math.round(t.kcal)} kcal · P {Math.round(t.prot)} g · F {Math.round(t.fat)} g ·
                    KH {Math.round(t.carbs)} g
                    <span className="text-subtle">
                      {' '}
                      ({t.basis === 'stueck' ? 'pro Stück' : 'pro 100 g'})
                    </span>
                  </div>
                  {t.herkunft !== 'Eigene Datenbank' && (
                    <div className="mt-0.5 truncate text-[12px] text-subtle">{t.herkunft}</div>
                  )}
                </button>
              </div>
            ))}
          </Card>

          <div className="mt-3">
            <TextButton onClick={() => setEigenesOffen(true)}>
              <span className="inline-flex items-center gap-1.5">
                <IconPlus size={16} />
                Nichts passendes? Selbst anlegen
              </span>
            </TextButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ *
 * Menge zum gewählten Treffer
 * ------------------------------------------------------------------ */

function MengeSheet({
  treffer,
  onZurueck,
  onUebernehmen,
  onClose,
}: {
  treffer: Lebensmitteltreffer;
  onZurueck: () => void;
  onUebernehmen: (food: MealFood) => void;
  onClose: () => void;
}) {
  const stueck = treffer.basis === 'stueck';
  const [menge, setMenge] = useState(stueck ? '1' : '100');

  const zahl = Number(menge.replace(',', '.'));
  const gueltig = Number.isFinite(zahl) && zahl > 0;
  const faktor = gueltig ? (stueck ? zahl : zahl / 100) : 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title={treffer.name}
      subtitle={treffer.herkunft}
      footer={
        <div className="flex gap-2.5">
          <SecondaryButton onClick={onZurueck}>Zurück</SecondaryButton>
          <PrimaryButton
            className="flex-1"
            disabled={!gueltig}
            onClick={() => onUebernehmen(ausTreffer(treffer, zahl))}
          >
            Übernehmen
          </PrimaryButton>
        </div>
      }
    >
      <TextField
        label={stueck ? 'Anzahl Stück' : 'Menge in Gramm'}
        value={menge}
        onChange={setMenge}
        inputMode="decimal"
        suffix={stueck ? 'Stk' : 'g'}
      />

      <Card className="mt-3">
        <p className="mb-2 text-[13px] font-semibold text-muted">Das ergibt</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Wert zahl={treffer.kcal * faktor} label="kcal" />
          <Wert zahl={treffer.prot * faktor} label="Protein" einheit="g" />
          <Wert zahl={treffer.fat * faktor} label="Fett" einheit="g" />
          <Wert zahl={treffer.carbs * faktor} label="Carbs" einheit="g" />
        </div>
      </Card>
    </Sheet>
  );
}

function Wert({ zahl, label, einheit }: { zahl: number; label: string; einheit?: string }) {
  return (
    <div>
      <div className="text-[18px] font-extrabold tracking-tight">
        {Math.round(zahl)}
        {einheit && <span className="text-[13px] font-bold"> {einheit}</span>}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Eigenes Lebensmittel anlegen
 * ------------------------------------------------------------------ */

function EigenesSheet({
  name: startName,
  onZurueck,
  onUebernehmen,
  onClose,
}: {
  name: string;
  onZurueck: () => void;
  onUebernehmen: (food: MealFood) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(startName);
  const [basis, setBasis] = useState<'100g' | 'stueck'>('100g');
  const [kcal, setKcal] = useState('');
  const [prot, setProt] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [menge, setMenge] = useState('100');
  const [speichert, setSpeichert] = useState(false);

  const z = (t: string) => {
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const gueltig = name.trim() !== '' && z(kcal) > 0 && z(menge) > 0;

  const uebernehmen = async () => {
    if (!gueltig) return;
    setSpeichert(true);

    const treffer: Lebensmitteltreffer = {
      name: name.trim(),
      herkunft: 'Eigene Datenbank',
      basis,
      kcal: z(kcal),
      prot: z(prot),
      fat: z(fat),
      carbs: z(carbs),
    };

    // In die eigene Datenbank legen, damit es beim nächsten Mal sofort in
    // Stufe 1 der Suche auftaucht. Scheitert das (etwa ohne Netz), wird das
    // Lebensmittel trotzdem übernommen – der Plan ist wichtiger.
    try {
      await upsertCustomFood({
        name: treffer.name,
        basis,
        kcal: treffer.kcal,
        protein: treffer.prot,
        fat: treffer.fat,
        carbs: treffer.carbs,
      });
      toast.success('In eure Datenbank aufgenommen.');
    } catch {
      toast.error('Konnte nicht in die Datenbank – im Plan ist es trotzdem drin.');
    }

    onUebernehmen(ausTreffer(treffer, z(menge)));
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Eigenes Lebensmittel"
      fullHeight
      footer={
        <div className="flex gap-2.5">
          <SecondaryButton onClick={onZurueck}>Zurück</SecondaryButton>
          <PrimaryButton
            className="flex-1"
            disabled={!gueltig || speichert}
            onClick={() => void uebernehmen()}
          >
            {speichert ? 'Einen Moment …' : 'Anlegen und übernehmen'}
          </PrimaryButton>
        </div>
      }
    >
      <TextField label="Name" value={name} onChange={setName} placeholder="z. B. Haferflocken" />

      <div className="py-2">
        <span className="mb-1.5 block text-[14px] font-semibold text-muted">Werte gelten</span>
        <div className="flex gap-1.5">
          {(
            [
              { wert: '100g' as const, text: 'je 100 g' },
              { wert: 'stueck' as const, text: 'je Stück' },
            ]
          ).map((o) => (
            <button
              key={o.wert}
              onClick={() => setBasis(o.wert)}
              className={[
                'flex-1 rounded-xl bg-surface-muted py-2.5 text-[14px] font-bold transition-shadow',
                basis === o.wert && 'ring-2 ring-text',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {o.text}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="kcal" value={kcal} onChange={setKcal} inputMode="decimal" />
        <TextField label="Protein" value={prot} onChange={setProt} inputMode="decimal" suffix="g" />
        <TextField label="Fett" value={fat} onChange={setFat} inputMode="decimal" suffix="g" />
        <TextField label="Carbs" value={carbs} onChange={setCarbs} inputMode="decimal" suffix="g" />
      </div>

      <TextField
        label={basis === 'stueck' ? 'Anzahl für diesen Plan' : 'Menge für diesen Plan'}
        value={menge}
        onChange={setMenge}
        inputMode="decimal"
        suffix={basis === 'stueck' ? 'Stk' : 'g'}
      />
    </Sheet>
  );
}
