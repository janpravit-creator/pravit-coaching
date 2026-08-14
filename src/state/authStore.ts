import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { create } from 'zustand';
import { auth, isCoachEmail } from '@/lib/firebase';
import { getClient } from '@/db/repo/clients';
import type { Client } from '@/db/types';

/**
 * Anmeldung und Rolle.
 *
 * Die App kennt drei Zustände, und sie zu unterscheiden ist wichtiger, als es
 * aussieht: „lädt noch" ist nicht dasselbe wie „nicht angemeldet". Ohne diese
 * Trennung blitzt beim Neuladen kurz die Login-Maske auf, obwohl man angemeldet
 * ist – ein Fehler, den man in fast jeder Firebase-App sieht.
 */

export type Rolle = 'coach' | 'kunde' | 'unbekannt';

interface AuthState {
  /** `undefined` = noch nicht geprüft, `null` = nicht angemeldet. */
  user: User | null | undefined;
  /** Kundenprofil; beim Coach `null`. */
  profil: Client | null;
  rolle: Rolle;
  /** Angemeldet, aber ohne Kundendokument – die Registrierung ist unfertig. */
  profilFehlt: boolean;

  beobachten: () => () => void;
  anmelden: (email: string, passwort: string) => Promise<void>;
  registrieren: (email: string, passwort: string) => Promise<User>;
  abmelden: () => Promise<void>;
  passwortZuruecksetzen: (email: string) => Promise<void>;
  profilNeuLaden: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: undefined,
  profil: null,
  rolle: 'unbekannt',
  profilFehlt: false,

  beobachten: () =>
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({ user: null, profil: null, rolle: 'unbekannt', profilFehlt: false });
        return;
      }

      if (isCoachEmail(user.email)) {
        set({ user, profil: null, rolle: 'coach', profilFehlt: false });
        return;
      }

      const profil = await getClient(user.uid);
      set({
        user,
        profil,
        rolle: 'kunde',
        // Konto vorhanden, Kundendokument nicht: Registrierung wurde abgebrochen.
        profilFehlt: profil === null,
      });
    }),

  anmelden: async (email, passwort) => {
    await signInWithEmailAndPassword(auth, email.trim(), passwort);
  },

  registrieren: async (email, passwort) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), passwort);
    return cred.user;
  },

  abmelden: async () => {
    await signOut(auth);
    set({ user: null, profil: null, rolle: 'unbekannt', profilFehlt: false });
  },

  passwortZuruecksetzen: async (email) => {
    await sendPasswordResetEmail(auth, email.trim());
  },

  profilNeuLaden: async () => {
    const user = get().user;
    if (!user || isCoachEmail(user.email)) return;
    const profil = await getClient(user.uid);
    set({ profil, profilFehlt: profil === null });
  },
}));

/**
 * Übersetzt die Fehlermeldungen von Firebase in verständliche Sätze.
 * „auth/invalid-credential" hilft niemandem weiter.
 */
export function anmeldeFehlerText(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Diese E-Mail-Adresse sieht nicht richtig aus.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-Mail-Adresse oder Passwort stimmen nicht.';
    case 'auth/too-many-requests':
      return 'Zu viele Versuche. Bitte warte einen Moment.';
    case 'auth/email-already-in-use':
      return 'Für diese E-Mail-Adresse gibt es bereits ein Konto.';
    case 'auth/weak-password':
      return 'Das Passwort muss mindestens sechs Zeichen haben.';
    case 'auth/network-request-failed':
      return 'Keine Verbindung. Bitte prüfe dein Internet.';
    default:
      return 'Das hat leider nicht geklappt. Bitte versuche es erneut.';
  }
}
