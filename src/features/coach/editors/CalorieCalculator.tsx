import { useMemo, useState } from 'react';
import { PrimaryButton } from '@/components/ui/Button';
import { StatTile } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Controls';
import { OptionGrid, TextField } from '@/components/ui/Field';
import type { CalorieTarget, Checkin, Client } from '@/db/types';
import {
  AKTIVITAET_STUFEN,
  STANDARD_KALORIEN,
  berechneKalorien,
  zahl,
} from '@/domain/nutrition';

/**
 * Kalorienrechner.
 *
 * Rechnet bei jeder Änderung neu, statt erst auf einen Knopf zu warten – man
 * sieht dadurch sofort, was ein Prozent Defizit ausmacht. Gespeichert wird
 * erst auf Wunsch; das Ergebnis landet als `calorieTarget` beim Kunden, in
 * derselben Form wie bisher.
 */
export function CalorieCalculator({
  client,
  letzterCheckin,
  onSpeichern,
}: {
  client: Client;
  letzterCheckin: Checkin | undefined;
  onSpeichern: (ziel: CalorieTarget) => Promise<void>;
}) {
  // Das Gewicht aus dem jüngsten Check-in ist aktueller als das aus der
  // Registrierung – deshalb hat es Vorrang.
  const startGewicht = zahl(letzterCheckin?.kg) || zahl(client.kg);

  const [kg, setKg] = useState(String(startGewicht || ''));
  const [cm, setCm] = useState(String(zahl(client.cm) || ''));
  const [alter, setAlter] = useState(String(zahl(client.age) || ''));
  const [geschlecht, setGeschlecht] = useState(
    (client.sex ?? '').toLowerCase().startsWith('w') ? 'Weiblich' : 'Männlich',
  );
  const [aktivitaet, setAktivitaet] = useState(
    client.calorieTarget?.activityFactor ?? STANDARD_KALORIEN.aktivitaet,
  );
  const [anpassung, setAnpassung] = useState(
    client.calorieTarget?.adjustmentPct ?? STANDARD_KALORIEN.anpassungProzent,
  );
  const [proteinProKg, setProteinProKg] = useState(
    client.calorieTarget?.proteinPerKg ?? STANDARD_KALORIEN.proteinProKg,
  );
  const [fettProKg, setFettProKg] = useState(
    client.calorieTarget?.fatPerKg ?? STANDARD_KALORIEN.fettProKg,
  );
  const [laeuft, setLaeuft] = useState(false);

  const ergebnis = useMemo(
    () =>
      berechneKalorien({
        kg: zahl(kg),
        cm: zahl(cm),
        alter: zahl(alter),
        geschlecht,
        aktivitaet,
        anpassungProzent: anpassung,
        proteinProKg,
        fettProKg,
      }),
    [kg, cm, alter, geschlecht, aktivitaet, anpassung, proteinProKg, fettProKg],
  );

  const vollstaendig = zahl(kg) > 0 && zahl(cm) > 0 && zahl(alter) > 0;

  const aktivitaetIndex = Math.max(
    0,
    AKTIVITAET_STUFEN.findIndex((s) => s.wert === aktivitaet),
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-x-3">
        <TextField label="Gewicht" inputMode="decimal" suffix="kg" value={kg} onChange={setKg} />
        <TextField label="Größe" inputMode="numeric" suffix="cm" value={cm} onChange={setCm} />
        <TextField label="Alter" inputMode="numeric" value={alter} onChange={setAlter} />
      </div>

      <OptionGrid
        label="Geschlecht"
        value={geschlecht}
        onChange={setGeschlecht}
        options={[
          { value: 'Männlich', label: 'Männlich' },
          { value: 'Weiblich', label: 'Weiblich' },
        ]}
      />

      <Slider
        label="Aktivität"
        value={aktivitaetIndex}
        min={0}
        max={AKTIVITAET_STUFEN.length - 1}
        onChange={(i) => setAktivitaet(AKTIVITAET_STUFEN[i]?.wert ?? STANDARD_KALORIEN.aktivitaet)}
        valueLabel={String(aktivitaet)}
        hint={AKTIVITAET_STUFEN[aktivitaetIndex]?.label}
      />

      <Slider
        label="Anpassung"
        value={anpassung}
        min={-30}
        max={30}
        step={1}
        onChange={setAnpassung}
        valueLabel={`${anpassung > 0 ? '+' : ''}${anpassung} %`}
        hint={
          anpassung < 0
            ? 'Defizit – Abnehmen'
            : anpassung > 0
              ? 'Überschuss – Aufbau'
              : 'Erhaltung'
        }
      />

      <Slider
        label="Protein"
        value={Math.round(proteinProKg * 10)}
        min={12}
        max={35}
        onChange={(v) => setProteinProKg(v / 10)}
        valueLabel={`${proteinProKg.toFixed(1).replace('.', ',')} g/kg`}
      />

      <Slider
        label="Fett"
        value={Math.round(fettProKg * 10)}
        min={4}
        max={15}
        onChange={(v) => setFettProKg(v / 10)}
        valueLabel={`${fettProKg.toFixed(1).replace('.', ',')} g/kg`}
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatTile value={ergebnis.bmr} label="Grundumsatz" />
        <StatTile value={ergebnis.tdee} label="Gesamtumsatz" />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <StatTile value={ergebnis.targetKcal} label="kcal Ziel" />
        <StatTile value={`${ergebnis.protein} g`} label="Protein" />
        <StatTile value={`${ergebnis.fat} g`} label="Fett" />
        <StatTile value={`${ergebnis.carbs} g`} label="Carbs" />
      </div>

      {!vollstaendig && (
        <p className="mt-2 text-[13px] text-muted">
          Gewicht, Größe und Alter fehlen – ohne sie ist die Rechnung nur ein Näherungswert.
        </p>
      )}

      <div className="mt-4">
        <PrimaryButton
          block
          disabled={!vollstaendig || laeuft}
          onClick={async () => {
            setLaeuft(true);
            try {
              await onSpeichern(ergebnis);
            } finally {
              setLaeuft(false);
            }
          }}
        >
          {laeuft ? 'Wird gespeichert …' : 'Als Ziel speichern'}
        </PrimaryButton>
      </div>
    </div>
  );
}
