import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBell,
  IconChart,
  IconCheck,
  IconDumbbell,
  IconLogout,
  IconTarget,
  IconUsers,
  IconMoney,
  IconMoon,
  IconSun,
} from '@/components/icons';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section } from '@/components/ui/Card';
import { ConfirmSheet, useConfirm } from '@/components/ui/Confirm';
import { PillTabs } from '@/components/ui/Controls';
import { EmptyState, PageHeader, Pill, Screen } from '@/components/ui/Layout';
import { aufraeumen, markiereAlleGelesen } from '@/db/repo/notifications';
import { sortiereTodos, todosFuerKunden } from '@/domain/checkin';
import { parseDatum } from '@/domain/dates';
import { useHinweise, useKundenMitCheckins } from '@/hooks/useCoachData';
import { dateRelative } from '@/lib/format';
import { gespeichertesTheme, setzeTheme, type ThemePreference } from '@/lib/theme';
import { useAuthStore } from '@/state/authStore';
import { toast } from '@/state/uiStore';

/**
 * „Mehr" – die Wege, die nicht täglich gebraucht werden.
 *
 * Aus sieben gleichrangigen Coach-Reitern sind vier geworden. Was übrig
 * blieb, steht hier: To-Dos, Zahlungen, Einnahmen, Datenbank – plus
 * Darstellung und Abmelden.
 */
export default function MorePage() {
  const navigate = useNavigate();
  const abmelden = useAuthStore((s) => s.abmelden);
  const email = useAuthStore((s) => s.user?.email);
  const confirm = useConfirm();

  // Die Wahl lebt im Gerätespeicher, nicht in der Datenbank – sie gehört zum
  // Gerät, nicht zum Konto.
  const [theme, setTheme] = useState<ThemePreference>(gespeichertesTheme);

  const { daten: kunden } = useKundenMitCheckins();
  const { daten: hinweise, neuLaden: hinweiseNeu } = useHinweise();

  const offeneTodos = useMemo(() => {
    const liste = (kunden ?? []).flatMap(({ client, checkins }) =>
      client.aktiv === false ? [] : todosFuerKunden(client, checkins),
    );
    return sortiereTodos(liste);
  }, [kunden]);

  const dringend = offeneTodos.filter((t) => t.prio === 'kritisch').length;
  const ungelesen = (hinweise ?? []).filter((n) => !n.seen);

  return (
    <Screen>
      <PageHeader title="Mehr" subtitle={email ?? 'Coach-Bereich'} />

      <Section title="Bereiche">
        <Card padded={false} className="px-4">
          <ListRow
            leading={<IconCheck size={20} className="text-muted" />}
            title="To-Dos"
            subtitle={
              offeneTodos.length === 0
                ? 'Nichts offen'
                : `${offeneTodos.length} Aufgaben${dringend > 0 ? `, ${dringend} dringend` : ''}`
            }
            trailing={dringend > 0 ? <Pill tone="negativ">{dringend}</Pill> : undefined}
            onClick={() => navigate('/coach/todos')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconMoney size={20} className="text-muted" />}
            title="Zahlungen"
            subtitle="Monatsübersicht und Rechnungen"
            onClick={() => navigate('/coach/zahlungen')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconChart size={20} className="text-muted" />}
            title="Einnahmen"
            subtitle="Verlauf und wiederkehrender Umsatz"
            onClick={() => navigate('/coach/einnahmen')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconTarget size={20} className="text-muted" />}
            title="Cockpit"
            subtitle="Einnahmen, Netto-Ziel und der Zwei-Jahres-Fahrplan"
            onClick={() => navigate('/coach/cockpit')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconUsers size={20} className="text-muted" />}
            title="Empfehlungen"
            subtitle="Wer hat wen geworben, und was steht dafür an"
            onClick={() => navigate('/coach/empfehlungen')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconDumbbell size={20} className="text-muted" />}
            title="Datenbank"
            subtitle="Übungen und eigene Lebensmittel"
            onClick={() => navigate('/coach/datenbank')}
            chevron
          />
        </Card>
      </Section>

      <Section title="Hinweise">
        {(hinweise ?? []).length === 0 ? (
          <EmptyState
            icon={<IconBell size={26} />}
            title="Keine Hinweise"
            description="Neue Check-ins und Registrierungen erscheinen hier."
          />
        ) : (
          <>
            <Card padded={false} className="px-4">
              {(hinweise ?? []).slice(0, 8).map((n, index) => (
                <div key={n.id}>
                  {index > 0 && <Divider />}
                  <ListRow
                    title={
                      n.type === 'new_client'
                        ? `${n.clientName ?? 'Jemand'} hat sich registriert`
                        : `${n.clientName ?? 'Jemand'} hat einen Check-in geschickt`
                    }
                    subtitle={
                      parseDatum(n.createdAt) !== null
                        ? dateRelative(parseDatum(n.createdAt) as number)
                        : (n.datum ?? '')
                    }
                    trailing={!n.seen ? <Pill tone="info">neu</Pill> : undefined}
                    onClick={
                      n.clientId ? () => navigate(`/coach/kunden/${n.clientId}`) : undefined
                    }
                    chevron={Boolean(n.clientId)}
                  />
                </div>
              ))}
            </Card>

            <div className="mt-3 flex flex-wrap gap-2.5">
              {ungelesen.length > 0 && (
                <SecondaryButton
                  onClick={async () => {
                    await markiereAlleGelesen(hinweise ?? []);
                    hinweiseNeu();
                  }}
                >
                  Alle als gelesen
                </SecondaryButton>
              )}
              <SecondaryButton
                onClick={() =>
                  confirm.fragen({
                    title: 'Alte Hinweise aufräumen?',
                    description:
                      'Gelesene Hinweise, die älter als 30 Tage sind, werden gelöscht. Check-ins und Kundendaten bleiben unberührt.',
                    confirmLabel: 'Aufräumen',
                    onConfirm: async () => {
                      const anzahl = await aufraeumen(hinweise ?? []);
                      toast.success(
                        anzahl === 0
                          ? 'Nichts zum Aufräumen gefunden.'
                          : `${anzahl} alte Hinweise gelöscht.`,
                      );
                      hinweiseNeu();
                    },
                  })
                }
              >
                Aufräumen
              </SecondaryButton>
            </div>
          </>
        )}
      </Section>

      <Section title="Darstellung">
        <Card>
          <PillTabs
            value={theme}
            onChange={(wert) => {
              setTheme(wert);
              setzeTheme(wert);
            }}
            options={[
              { value: 'system', label: 'System' },
              { value: 'hell', label: 'Hell' },
              { value: 'dunkel', label: 'Dunkel' },
            ]}
          />
          <p className="mt-3 flex items-center gap-2 text-[14px] text-muted">
            {theme === 'dunkel' ? <IconMoon size={17} /> : <IconSun size={17} />}
            {theme === 'system'
              ? 'Folgt der Einstellung deines Geräts.'
              : theme === 'hell'
                ? 'Immer hell.'
                : 'Immer dunkel.'}
          </p>
        </Card>
      </Section>

      <PrimaryButton
        block
        onClick={() => void abmelden()}
        icon={<IconLogout size={20} />}
      >
        Abmelden
      </PrimaryButton>

      <ConfirmSheet frage={confirm.frage} onClose={confirm.schliessen} />
    </Screen>
  );
}
