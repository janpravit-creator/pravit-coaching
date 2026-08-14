import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, SecondaryButton, TextButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Layout';
import { Sheet } from '@/components/ui/Sheet';
import { IconArrowRight } from '@/components/icons';
import { anmeldeFehlerText, useAuthStore } from '@/state/authStore';
import { toast } from '@/state/uiStore';

/** Anmeldung. Der erste Bildschirm, den jeder sieht – entsprechend ruhig. */
export default function LoginPage() {
  const navigate = useNavigate();
  const anmelden = useAuthStore((s) => s.anmelden);

  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [passwortSheet, setPasswortSheet] = useState(false);

  const gueltig = email.trim() !== '' && passwort !== '';

  const absenden = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!gueltig || laeuft) return;

    setLaeuft(true);
    setFehler(null);
    try {
      await anmelden(email, passwort);
    } catch (e) {
      setFehler(anmeldeFehlerText(e));
      setLaeuft(false);
    }
  };

  return (
    <Screen className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-sm py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-end justify-center gap-1.5 rounded-3xl bg-action p-3.5">
            <span className="h-[35%] w-2 rounded-full bg-white/55" />
            <span className="h-[60%] w-2 rounded-full bg-white/80" />
            <span className="h-[95%] w-2 rounded-full bg-positive" />
          </div>
          <h1 className="text-[32px] font-extrabold tracking-[0.18em]">PRAVIT</h1>
          <p className="mt-1.5 text-[15px] text-muted">Coaching</p>
        </div>

        <Card>
          <form onSubmit={absenden}>
            <TextField
              label="E-Mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="name@beispiel.de"
            />
            <TextField
              label="Passwort"
              type="password"
              autoComplete="current-password"
              value={passwort}
              onChange={setPasswort}
              placeholder="••••••••"
            />

            {fehler && (
              <p className="mt-2 rounded-2xl bg-negative-soft px-4 py-3 text-[14px] font-semibold text-negative">
                {fehler}
              </p>
            )}

            <div className="mt-4">
              <PrimaryButton
                block
                type="submit"
                disabled={!gueltig || laeuft}
                icon={<IconArrowRight size={20} />}
              >
                {laeuft ? 'Anmelden …' : 'Anmelden'}
              </PrimaryButton>
            </div>
          </form>

          <div className="mt-3 text-center">
            <TextButton onClick={() => setPasswortSheet(true)}>Passwort vergessen?</TextButton>
          </div>
        </Card>

        <div className="mt-5">
          <SecondaryButton block onClick={() => navigate('/registrieren')}>
            Neu hier? Konto anlegen
          </SecondaryButton>
        </div>
      </div>

      <PasswortSheet open={passwortSheet} onClose={() => setPasswortSheet(false)} vorbelegt={email} />
    </Screen>
  );
}

function PasswortSheet({
  open,
  onClose,
  vorbelegt,
}: {
  open: boolean;
  onClose: () => void;
  vorbelegt: string;
}) {
  const zuruecksetzen = useAuthStore((s) => s.passwortZuruecksetzen);
  const [email, setEmail] = useState(vorbelegt);
  const [laeuft, setLaeuft] = useState(false);

  const senden = async () => {
    if (email.trim() === '' || laeuft) return;
    setLaeuft(true);
    try {
      await zuruecksetzen(email);
      // Bewusst dieselbe Meldung, ob die Adresse existiert oder nicht – sonst
      // ließe sich hier ausprobieren, wer ein Konto hat.
      toast.success('Wenn es ein Konto gibt, ist die E-Mail unterwegs.');
      onClose();
    } catch {
      toast.error('Das hat nicht geklappt. Bitte prüfe die Adresse.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Passwort zurücksetzen"
      subtitle="Wir schicken dir einen Link zum Neusetzen."
      footer={
        <PrimaryButton block onClick={senden} disabled={email.trim() === '' || laeuft}>
          Link schicken
        </PrimaryButton>
      }
    >
      <TextField
        label="E-Mail"
        type="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
        placeholder="name@beispiel.de"
      />
    </Sheet>
  );
}
