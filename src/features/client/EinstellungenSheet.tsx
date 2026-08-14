import { useState } from 'react';
import {
  IconBook,
  IconChevronRight,
  IconInfo,
  IconLogout,
  IconMoon,
  IconSun,
  IconUsers,
} from '@/components/icons';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card, Divider, ListRow, Section } from '@/components/ui/Card';
import { PillTabs } from '@/components/ui/Controls';
import { TextArea, TextField } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { updateClient } from '@/db/repo/clients';
import type { Client } from '@/db/types';
import { gespeichertesTheme, setzeTheme, type ThemePreference } from '@/lib/theme';
import { useAuthStore } from '@/state/authStore';
import { toast } from '@/state/uiStore';
import { AGB_TEXT, DATENSCHUTZ_TEXT } from '../auth/rechtstexte';
import { KUNDEN_FELDER, profilWerte } from '../profilFelder';

/**
 * Einstellungen des Kunden.
 *
 * Bisher gab es davon nichts: kein Profil-Bearbeiten, keinen Hell/Dunkel-
 * Umschalter, keinen Weg zu AGB und Datenschutz nach der Registrierung, und
 * die Tour ließ sich nur über ein „?" in der Kopfzeile neu starten. Statt
 * dafür einen sechsten Reiter einzuführen – die fünf Kundenbereiche sind alle
 * täglich in Gebrauch – liegt alles hier hinter dem Zahnrad auf der Startseite.
 */

type Ansicht = 'uebersicht' | 'profil' | 'agb' | 'datenschutz';

export function EinstellungenSheet({
  offen,
  onClose,
  profil,
  onProfilGeaendert,
  onTourStarten,
}: {
  offen: boolean;
  onClose: () => void;
  profil: Client | null | undefined;
  onProfilGeaendert: () => void;
  onTourStarten: () => void;
}) {
  const abmelden = useAuthStore((s) => s.abmelden);
  const [ansicht, setAnsicht] = useState<Ansicht>('uebersicht');
  const [theme, setTheme] = useState<ThemePreference>(gespeichertesTheme);

  const schliessen = () => {
    setAnsicht('uebersicht');
    onClose();
  };

  if (ansicht === 'profil' && profil) {
    return (
      <ProfilSheet
        profil={profil}
        onZurueck={() => setAnsicht('uebersicht')}
        onGespeichert={() => {
          onProfilGeaendert();
          setAnsicht('uebersicht');
        }}
      />
    );
  }

  if (ansicht === 'agb' || ansicht === 'datenschutz') {
    return (
      <Sheet
        open
        onClose={() => setAnsicht('uebersicht')}
        title={ansicht === 'agb' ? 'AGB' : 'Datenschutz'}
        subtitle="PRAVIT Coaching"
        fullHeight
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-muted">
          {ansicht === 'agb' ? AGB_TEXT : DATENSCHUTZ_TEXT}
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={offen}
      onClose={schliessen}
      title="Einstellungen"
      subtitle={profil?.email}
      fullHeight
    >
      <Section title="Dein Profil">
        <Card padded={false} className="px-4">
          <ListRow
            leading={<IconUsers size={20} className="text-muted" />}
            title="Angaben bearbeiten"
            subtitle="Größe, Ziel, Allergien, Verletzungen …"
            onClick={() => setAnsicht('profil')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconBook size={20} className="text-muted" />}
            title="Tour neu ansehen"
            subtitle="Die Einführung von vorn"
            onClick={() => {
              schliessen();
              onTourStarten();
            }}
            chevron
          />
        </Card>
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

      <Section title="Rechtliches">
        <Card padded={false} className="px-4">
          <ListRow
            leading={<IconInfo size={20} className="text-muted" />}
            title="AGB"
            onClick={() => setAnsicht('agb')}
            chevron
          />
          <Divider />
          <ListRow
            leading={<IconInfo size={20} className="text-muted" />}
            title="Datenschutz"
            onClick={() => setAnsicht('datenschutz')}
            chevron
          />
        </Card>
      </Section>

      <SecondaryButton block onClick={() => void abmelden()} icon={<IconLogout size={19} />}>
        Abmelden
      </SecondaryButton>
    </Sheet>
  );
}

function ProfilSheet({
  profil,
  onZurueck,
  onGespeichert,
}: {
  profil: Client;
  onZurueck: () => void;
  onGespeichert: () => void;
}) {
  const [werte, setWerte] = useState<Record<string, string>>(() =>
    profilWerte(profil, KUNDEN_FELDER),
  );
  const [laeuft, setLaeuft] = useState(false);

  return (
    <Sheet
      open
      onClose={onZurueck}
      title="Deine Angaben"
      subtitle="Dein Coach sieht die Änderungen sofort."
      fullHeight
      footer={
        <PrimaryButton
          block
          disabled={laeuft}
          onClick={async () => {
            setLaeuft(true);
            try {
              await updateClient(profil.id, werte as Partial<Client>);
              toast.success('Gespeichert.');
              onGespeichert();
            } catch {
              toast.error('Speichern hat nicht geklappt.');
            } finally {
              setLaeuft(false);
            }
          }}
        >
          {laeuft ? 'Wird gespeichert …' : 'Speichern'}
        </PrimaryButton>
      }
    >
      <button
        onClick={onZurueck}
        className="mb-2 inline-flex items-center gap-1 text-[15px] font-semibold text-muted"
      >
        <IconChevronRight size={16} className="rotate-180" />
        Einstellungen
      </button>

      {/* Paket, Preis und Startdatum stehen bewusst nicht hier – das ist
          Sache des Coaches. */}
      {KUNDEN_FELDER.map(({ key, label, lang }) =>
        lang ? (
          <TextArea
            key={key}
            label={label}
            rows={2}
            value={werte[key] ?? ''}
            onChange={(v) => setWerte((w) => ({ ...w, [key]: v }))}
          />
        ) : (
          <TextField
            key={key}
            label={label}
            value={werte[key] ?? ''}
            onChange={(v) => setWerte((w) => ({ ...w, [key]: v }))}
          />
        ),
      )}
    </Sheet>
  );
}
