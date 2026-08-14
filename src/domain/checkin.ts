import type { Checkin, Client } from '@/db/types';
import { parseDatum, sortiereNeuesteZuerst, tageZwischen } from './dates';

/**
 * Bearbeitungsstand eines Check-ins.
 *
 * Hier saß der Fehler, über den du gestolpert bist. Bisher stammten die beiden
 * Aussagen „Check-in ist abgehakt" und „Check-in taucht in den To-Dos auf" aus
 * *verschiedenen* Feldern:
 *
 *   showTodos:    cis.filter(ci => !ci.coachFeedback)   ← braucht Feedback
 *   markAllSeen:  updateDoc(..., { seenByCoach: true }) ← setzt aber nur „gesehen"
 *
 * Als gesehen markieren räumte die Check-in-Liste auf, ließ die To-Do-Meldung
 * aber stehen. Sie verschwand erst, wenn zu jedem einzelnen Check-in echtes
 * Feedback geschrieben wurde.
 *
 * Jetzt gibt es genau **eine** Quelle für diese Frage: `istErledigt`.
 * Erledigt ist ein Check-in, wenn Feedback geschrieben wurde **oder** er
 * ausdrücklich abgehakt ist. Für Bestandsdaten zählt auch das alte
 * `seenByCoach` als erledigt – denn genau so war es gemeint, wenn du
 * „als gesehen markieren" gedrückt hast. Es wird nichts umgeschrieben; der
 * Zustand wird beim Lesen abgeleitet.
 */

export function hatFeedback(ci: Pick<Checkin, 'coachFeedback'>): boolean {
  return (ci.coachFeedback ?? '').trim() !== '';
}

/** Einzige Quelle dafür, ob ein Check-in noch Arbeit macht. */
export function istErledigt(ci: Checkin): boolean {
  if (ci.erledigt === true) return true;
  if (hatFeedback(ci)) return true;
  // Altdaten: „als gesehen markiert" war immer als „abgehakt" gemeint.
  if (ci.seenByCoach === true) return true;
  return false;
}

export function istOffen(ci: Checkin): boolean {
  return !istErledigt(ci);
}

/** Noch nie geöffnet – steuert nur den roten Punkt, nicht die To-Dos. */
export function istUngelesen(ci: Checkin): boolean {
  return ci.seenByCoach !== true && !hatFeedback(ci) && ci.erledigt !== true;
}

/** Der Kunde hat neues Feedback, das er noch nicht gesehen hat. */
export function hatNeuesFeedbackFuerKunden(ci: Checkin): boolean {
  return hatFeedback(ci) && ci.feedbackSeenByClient !== true;
}

/**
 * Felder, mit denen ein Check-in als erledigt gespeichert wird.
 *
 * `seenByCoach` wird bewusst mitgesetzt: Solange die alte Fassung der App
 * womöglich noch irgendwo offen ist, soll sie denselben Stand sehen.
 */
export function erledigtPatch(now: Date = new Date()): Partial<Checkin> {
  return { erledigt: true, seenByCoach: true, feedbackAt: now.toISOString() };
}

export function feedbackPatch(text: string, now: Date = new Date()): Partial<Checkin> {
  return {
    coachFeedback: text,
    feedbackAt: now.toISOString(),
    feedbackSeenByClient: false,
    seenByCoach: true,
    erledigt: true,
  };
}

/* ------------------------------------------------------------------ *
 * Auswertung je Kunde
 * ------------------------------------------------------------------ */

export interface CheckinLage {
  /** Neuester Check-in – auch wenn ihm das Datum fehlt. */
  letzter: Checkin | null;
  /** Tage seit dem letzten Check-in. `null`, wenn es keinen auswertbaren gibt. */
  tageSeitLetztem: number | null;
  /** Check-ins, die noch Feedback oder ein Abhaken brauchen. */
  offene: Checkin[];
  /** Es gibt überhaupt keinen Check-in. */
  nochNieEingereicht: boolean;
}

/**
 * Fasst die Check-ins eines Kunden zusammen.
 *
 * Sortiert wird **im Speicher**, nicht über `orderBy("datum")`. Firestore lässt
 * bei einer Sortierabfrage alle Dokumente stillschweigend weg, denen das Feld
 * fehlt – ein Check-in ohne `datum` war damit unsichtbar, und der Kunde
 * erschien als „Kein Check-in seit …", obwohl er eingereicht hatte.
 */
export function checkinLage(checkins: Checkin[], now: Date = new Date()): CheckinLage {
  if (checkins.length === 0) {
    return { letzter: null, tageSeitLetztem: null, offene: [], nochNieEingereicht: true };
  }

  const sortiert = sortiereNeuesteZuerst(checkins);
  const letzter = sortiert[0] ?? null;

  // Für „seit wie vielen Tagen" den neuesten mit auswertbarem Datum nehmen –
  // ein Datensatz ohne Datum darf die Rechnung nicht kippen.
  const mitDatum = sortiert.find((ci) => parseDatum(ci.datum) !== null);
  const letztesDatum = mitDatum ? parseDatum(mitDatum.datum) : null;

  return {
    letzter,
    tageSeitLetztem: letztesDatum === null ? null : Math.max(0, tageZwischen(letztesDatum, now.getTime())),
    offene: sortiert.filter(istOffen),
    nochNieEingereicht: false,
  };
}

/* ------------------------------------------------------------------ *
 * To-Dos
 * ------------------------------------------------------------------ */

export type TodoPrio = 'kritisch' | 'wichtig' | 'optional';

export type TodoTyp =
  | 'feedback'
  | 'kein_checkin'
  | 'test_laeuft_ab'
  | 'kein_plan'
  | 'kein_ernaehrungsplan'
  | 'keine_supplements'
  | 'zahlung';

export interface Todo {
  id: string;
  prio: TodoPrio;
  typ: TodoTyp;
  clientId: string;
  clientName: string;
  text: string;
  sub: string;
  /** Für die Sortierung innerhalb einer Dringlichkeit. */
  tage: number;
  checkinId?: string;
}

/** Ab wie vielen Tagen ohne Check-in gemahnt wird. */
export const CHECKIN_FRIST_TAGE = 7;

/**
 * Erzeugt die To-Dos zu einem Kunden.
 *
 * Bewusst eine reine Funktion: Sie lässt sich damit ohne Datenbank prüfen –
 * und genau das tut der zugehörige Test für den oben beschriebenen Fehler.
 */
export function todosFuerKunden(
  client: Client,
  checkins: Checkin[],
  now: Date = new Date(),
): Todo[] {
  const todos: Todo[] = [];
  const name = `${client.vn ?? ''} ${client.nn ?? ''}`.trim() || 'Ohne Namen';
  const lage = checkinLage(checkins, now);

  // 1. Check-ins, die noch Antwort brauchen
  for (const ci of lage.offene) {
    const datumMs = parseDatum(ci.datum);
    const tage = datumMs === null ? 0 : Math.max(0, tageZwischen(datumMs, now.getTime()));
    todos.push({
      id: `feedback-${client.id}-${ci.id}`,
      prio: tage > 3 ? 'kritisch' : 'wichtig',
      typ: 'feedback',
      clientId: client.id,
      clientName: name,
      text: ci.datum ? `Check-in vom ${ci.datum} wartet auf Antwort` : 'Check-in wartet auf Antwort',
      sub: tage === 0 ? 'heute eingegangen' : `seit ${tage} ${tage === 1 ? 'Tag' : 'Tagen'} offen`,
      tage,
      checkinId: ci.id,
    });
  }

  // 2. Kein Check-in seit über einer Woche
  if (lage.nochNieEingereicht) {
    todos.push({
      id: `kein-checkin-${client.id}`,
      prio: 'wichtig',
      typ: 'kein_checkin',
      clientId: client.id,
      clientName: name,
      text: 'Noch kein Check-in eingereicht',
      sub: client.paket ?? 'Kein Paket',
      tage: 999,
    });
  } else if (lage.tageSeitLetztem !== null && lage.tageSeitLetztem > CHECKIN_FRIST_TAGE) {
    todos.push({
      id: `kein-checkin-${client.id}`,
      prio: lage.tageSeitLetztem > 14 ? 'kritisch' : 'wichtig',
      typ: 'kein_checkin',
      clientId: client.id,
      clientName: name,
      // Ausdrücklich auf `null` geprüft: `0` ist ein gültiger Wert und darf
      // nicht als „kein Check-in" durchgehen.
      text: `Kein Check-in seit ${lage.tageSeitLetztem} Tagen`,
      sub: client.paket ?? 'Kein Paket',
      tage: lage.tageSeitLetztem,
    });
  }

  // 3. Test-Paket läuft aus
  if (client.paket === 'test' && client.startDatum) {
    const start = parseDatum(client.startDatum);
    if (start !== null) {
      const restTage = tageZwischen(now.getTime(), start + 14 * 86_400_000);
      if (restTage >= 0 && restTage <= 7) {
        todos.push({
          id: `test-${client.id}`,
          prio: restTage <= 2 ? 'kritisch' : 'wichtig',
          typ: 'test_laeuft_ab',
          clientId: client.id,
          clientName: name,
          text: `Test-Paket läuft in ${restTage} ${restTage === 1 ? 'Tag' : 'Tagen'} ab`,
          sub: 'Paket besprechen',
          tage: restTage,
        });
      }
    }
  }

  // 4. Fehlende Pläne
  if (!client.plans?.length) {
    todos.push({
      id: `kein-plan-${client.id}`,
      prio: 'wichtig',
      typ: 'kein_plan',
      clientId: client.id,
      clientName: name,
      text: 'Noch kein Trainingsplan',
      sub: 'Im Kundenprofil anlegen',
      tage: 0,
    });
  }
  if (!client.mealPlans?.length) {
    todos.push({
      id: `kein-mplan-${client.id}`,
      prio: 'optional',
      typ: 'kein_ernaehrungsplan',
      clientId: client.id,
      clientName: name,
      text: 'Noch kein Ernährungsplan',
      sub: 'Im Kundenprofil anlegen',
      tage: 0,
    });
  }
  if (!client.supplements?.length) {
    todos.push({
      id: `keine-supps-${client.id}`,
      prio: 'optional',
      typ: 'keine_supplements',
      clientId: client.id,
      clientName: name,
      text: 'Noch kein Supplement-Plan',
      sub: 'Im Kundenprofil anlegen',
      tage: 0,
    });
  }

  // 5. Paket ohne Startdatum – Zahlung unklar
  if ((client.paketPreis ?? 0) > 0 && !client.startDatum) {
    todos.push({
      id: `zahlung-${client.id}`,
      prio: 'optional',
      typ: 'zahlung',
      clientId: client.id,
      clientName: name,
      text: 'Kein Startdatum gesetzt',
      sub: `${client.paket ?? ''} · ${client.paketPreis ?? 0} €`,
      tage: 0,
    });
  }

  return todos;
}

const PRIO_ORDER: Record<TodoPrio, number> = { kritisch: 0, wichtig: 1, optional: 2 };

export function sortiereTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const p = PRIO_ORDER[a.prio] - PRIO_ORDER[b.prio];
    return p !== 0 ? p : b.tage - a.tage;
  });
}
