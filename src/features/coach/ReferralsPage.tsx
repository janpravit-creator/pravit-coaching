import { useMemo, useState } from 'react';
import { IconCheck, IconPlus, IconUsers } from '@/components/icons';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section, StatTile } from '@/components/ui/Card';
import { ConfirmSheet, useConfirm } from '@/components/ui/Confirm';
import { OptionGrid } from '@/components/ui/Field';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { gutschriftGewaehrt, upsertReferral } from '@/db/repo/referrals';
import { clientName, type Client } from '@/db/types';
import {
  bezahlteMonate,
  empfehlungsCode,
  empfehlungsStand,
  offeneGutschriften,
  stufeFuer,
  stufenLabel,
  UPGRADE_AB,
} from '@/domain/empfehlung';
import { euro } from '@/domain/rechnung';
import { useEmpfehlungen, useKunden } from '@/hooks/useCoachData';
import { toast } from '@/state/uiStore';

/**
 * Empfehlungsprogramm (Konzept Kap. 11).
 *
 * Zeigt je Kunde seinen Code, wen er geworben hat und was ihm zusteht. Eine
 * Gutschrift entsteht erst, wenn der Geworbene drei Monate **bezahlt** hat —
 * nicht schon bei der Anmeldung, sonst gäbe es Rabatt für einen Ausfall.
 */
export default function ReferralsPage() {
  const { daten: kunden, laedt } = useKunden();
  const { daten: empfehlungen, neuLaden } = useEmpfehlungen();
  const confirm = useConfirm();
  const [neuOffen, setNeuOffen] = useState(false);

  const alle = kunden ?? [];
  const refs = empfehlungen ?? [];

  /** Werber mit offenen Ansprüchen, die stärksten zuerst. */
  const werber = useMemo(() => {
    return alle
      .map((k) => ({
        kunde: k,
        stand: empfehlungsStand(k, refs, alle),
        offen: offeneGutschriften(k, refs, alle),
      }))
      .filter((w) => w.stand.gesamt > 0)
      .sort((a, b) => b.stand.offenerBetrag - a.stand.offenerBetrag);
  }, [alle, refs]);

  const gesamtOffen = werber.reduce((s, w) => s + w.stand.offenerBetrag, 0);
  const gesamtErfolg = werber.reduce((s, w) => s + w.stand.erfolgreiche, 0);

  const gewaehren = async (referralId: string, art: string, betrag: number) => {
    await gutschriftGewaehrt(referralId, art, betrag);
    toast.info('Als gewährt vermerkt.');
    neuLaden();
  };

  return (
    <Screen actionSpace>
      <PageHeader
        title="Empfehlungen"
        subtitle="Wer hat wen geworben – und was steht dafür an."
      />

      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatTile value={refs.length} label="Empfehlungen" />
        <StatTile value={gesamtErfolg} label="Erfolgreich" tone="positiv" />
        <StatTile value={euro(gesamtOffen)} label="Offen" tone={gesamtOffen > 0 ? 'negativ' : 'neutral'} />
      </div>

      {laedt ? (
        <div className="h-40" aria-busy="true" />
      ) : werber.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={28} />}
          title="Noch keine Empfehlung"
          description="Trag eine Empfehlung ein, sobald ein Neukunde über einen Bestandskunden kommt. Ab drei bezahlten Monaten entsteht daraus eine Gutschrift."
          action={
            <PrimaryButton onClick={() => setNeuOffen(true)} icon={<IconPlus size={20} />}>
              Empfehlung eintragen
            </PrimaryButton>
          }
        />
      ) : (
        werber.map(({ kunde, stand, offen }) => (
          <Section key={kunde.id} title={clientName(kunde)}>
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pill>{empfehlungsCode(clientName(kunde), kunde.id)}</Pill>
                <Pill tone={stand.erfolgreiche > 0 ? 'positiv' : 'info'}>
                  {stand.erfolgreiche} von {stand.gesamt} erfolgreich
                </Pill>
                {stand.upgradeVerdient && <Pill tone="positiv">Premium-Upgrade verdient</Pill>}
                {!stand.upgradeVerdient && stand.erfolgreiche > 0 && (
                  <Pill tone="info">
                    noch {stand.bisUpgrade} bis zum Upgrade
                  </Pill>
                )}
              </div>

              {refs
                .filter((r) => r.werberId === kunde.id)
                .map((r, index) => {
                  const geworbener = alle.find((c) => c.id === r.geworbenerId);
                  const monate = geworbener ? bezahlteMonate(geworbener) : 0;
                  const stufe = stufeFuer(monate);
                  const offener = offen.find((o) => o.referralId === r.id);

                  return (
                    <div key={r.id}>
                      {index > 0 && <Divider />}
                      <ListRow
                        title={
                          r.geworbenerName ??
                          (geworbener ? clientName(geworbener) : 'Code noch offen')
                        }
                        subtitle={
                          r.gewaehrt
                            ? `Gewährt am ${r.gewaehrt}${r.gewaehrtBetrag ? ` · ${euro(r.gewaehrtBetrag)}` : ''}`
                            : geworbener
                              ? `${monate} bezahlte Monate${stufe ? ` · ${stufenLabel(stufe)}` : ' · noch kein Anspruch'}`
                              : 'Noch nicht eingelöst'
                        }
                        trailing={
                          offener ? (
                            <SecondaryButton
                              icon={<IconCheck size={16} />}
                              onClick={() =>
                                void gewaehren(r.id, stufenLabel(offener.stufe), offener.betrag)
                              }
                            >
                              {euro(offener.betrag)}
                            </SecondaryButton>
                          ) : r.gewaehrt ? (
                            <Pill tone="positiv">erledigt</Pill>
                          ) : undefined
                        }
                      />
                    </div>
                  );
                })}
            </Card>
          </Section>
        ))
      )}

      {werber.length > 0 && (
        <div className="mt-2">
          <SecondaryButton block icon={<IconPlus size={18} />} onClick={() => setNeuOffen(true)}>
            Empfehlung eintragen
          </SecondaryButton>
        </div>
      )}

      <EmpfehlungSheet
        open={neuOffen}
        kunden={alle}
        onClose={() => setNeuOffen(false)}
        onGespeichert={() => {
          setNeuOffen(false);
          neuLaden();
        }}
      />

      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </Screen>
  );
}

function EmpfehlungSheet({
  open,
  kunden,
  onClose,
  onGespeichert,
}: {
  open: boolean;
  kunden: Client[];
  onClose: () => void;
  onGespeichert: () => void;
}) {
  const [werberId, setWerberId] = useState('');
  const [geworbenerId, setGeworbenerId] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  if (!open) return null;

  const auswahl = kunden.map((k) => ({ value: k.id, label: clientName(k) }));
  const gleich = werberId !== '' && werberId === geworbenerId;

  const speichern = async () => {
    if (!werberId || !geworbenerId || gleich) return;
    setLaeuft(true);
    try {
      const werber = kunden.find((k) => k.id === werberId);
      const geworbener = kunden.find((k) => k.id === geworbenerId);
      await upsertReferral({
        code: werber ? empfehlungsCode(clientName(werber), werber.id) : undefined,
        werberId,
        werberName: werber ? clientName(werber) : undefined,
        geworbenerId,
        geworbenerName: geworbener ? clientName(geworbener) : undefined,
      });
      toast.info('Empfehlung eingetragen.');
      onGespeichert();
    } catch (e) {
      toast.info(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Empfehlung eintragen"
      subtitle={`Ab ${UPGRADE_AB} erfolgreichen Empfehlungen gibt es ein Premium-Upgrade.`}
      footer={
        <PrimaryButton
          block
          disabled={laeuft || !werberId || !geworbenerId || gleich}
          onClick={() => void speichern()}
        >
          Eintragen
        </PrimaryButton>
      }
    >
      <OptionGrid label="Wer hat geworben" value={werberId} onChange={setWerberId} options={auswahl} />
      <OptionGrid
        label="Wer wurde geworben"
        value={geworbenerId}
        onChange={setGeworbenerId}
        options={auswahl}
      />
      {gleich && (
        <p className="text-[13px] font-semibold text-negative">
          Ein Kunde kann sich nicht selbst werben.
        </p>
      )}
    </Sheet>
  );
}
