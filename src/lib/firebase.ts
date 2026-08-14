import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Zugang zum bestehenden Firebase-Projekt.
 *
 * Es ist dasselbe Projekt wie bisher (`coaching-2f33a`) – dieselben Sammlungen,
 * dieselben Konten. Bestandskunden melden sich unverändert mit ihren
 * bisherigen Zugangsdaten an.
 *
 * Diese Werte sind **kein Geheimnis**: eine Firebase-Web-Konfiguration steckt
 * in jedem ausgelieferten Bündel und identifiziert nur das Projekt. Der Schutz
 * der Daten liegt ausschließlich in den Firestore-Sicherheitsregeln – die
 * bleiben unverändert.
 *
 * Über Umgebungsvariablen lässt sich das Projekt überschreiben (etwa für eine
 * Testumgebung); ohne sie greifen die Werte unten, damit ein Build nie an
 * einer vergessenen Variable scheitert.
 */
const config = {
  apiKey: import.meta.env['VITE_FB_API_KEY'] ?? 'AIzaSyC_7hQPcP1SMH0CqHUJp8cHH2yaoSjbkyE',
  authDomain: import.meta.env['VITE_FB_AUTH_DOMAIN'] ?? 'coaching-2f33a.firebaseapp.com',
  projectId: import.meta.env['VITE_FB_PROJECT_ID'] ?? 'coaching-2f33a',
  storageBucket: import.meta.env['VITE_FB_STORAGE_BUCKET'] ?? 'coaching-2f33a.firebasestorage.app',
  messagingSenderId: import.meta.env['VITE_FB_SENDER_ID'] ?? '106904692661',
  appId: import.meta.env['VITE_FB_APP_ID'] ?? '1:106904692661:web:162e01d4b411e358069bfc',
};

export const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Das Coach-Konto. Genau diese Adresse sieht den Coach-Arbeitsplatz, alle
 * anderen Konten den Kundenbereich – dieselbe Regel wie bisher.
 *
 * Die Unterscheidung über die E-Mail-Adresse ist bequem, aber schwach: Sie
 * steuert nur, welche Oberfläche erscheint. Wer die Kundendaten wirklich
 * lesen darf, entscheiden ausschließlich die Firestore-Sicherheitsregeln.
 *
 * `VITE_COACH_EMAIL` überschreibt die Adresse. Das ist für den End-to-End-Test
 * gedacht: Er kann damit denselben Testzugang einmal als Kunde und einmal als
 * Coach durchlaufen, ohne dass irgendwo ein echtes Coach-Passwort auftaucht.
 * Ohne die Variable gilt die Adresse unten – der Auslieferungs-Build ist also
 * unverändert.
 */
export const COACH_EMAIL = (import.meta.env['VITE_COACH_EMAIL'] ?? 'jan.pravit@gmx.de')
  .trim()
  .toLowerCase();

export function isCoachEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === COACH_EMAIL;
}
