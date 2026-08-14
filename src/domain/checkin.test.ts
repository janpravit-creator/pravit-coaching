import { describe, expect, it } from 'vitest';
import type { Checkin, Client } from '@/db/types';
import { checkinLage, istErledigt, istOffen, istUngelesen, todosFuerKunden } from './checkin';

const JETZT = new Date('2026-08-14T12:00:00Z');

function ci(overrides: Partial<Checkin> = {}): Checkin {
  return { id: Math.random().toString(36).slice(2), datum: '2026-08-14', ...overrides };
}

function kunde(overrides: Partial<Client> = {}): Client {
  return {
    id: 'k1',
    vn: 'Max',
    nn: 'Muster',
    paket: 'lifestyle',
    // Damit die Tests nur den Check-in-Teil betrachten, sind Pläne vorhanden.
    plans: [{ name: 'Plan' }],
    mealPlans: [{ name: 'Ernährung' }],
    supplements: [{ name: 'Kreatin' }],
    ...overrides,
  };
}

function checkinTodos(client: Client, checkins: Checkin[]) {
  return todosFuerKunden(client, checkins, JETZT).filter(
    (t) => t.typ === 'feedback' || t.typ === 'kein_checkin',
  );
}

describe('Bearbeitungsstand eines Check-ins', () => {
  it('ein frischer Check-in ist offen und ungelesen', () => {
    const c = ci();
    expect(istOffen(c)).toBe(true);
    expect(istUngelesen(c)).toBe(true);
  });

  it('geschriebenes Feedback erledigt den Check-in', () => {
    expect(istErledigt(ci({ coachFeedback: 'Stark, weiter so!' }))).toBe(true);
  });

  it('leeres Feedback erledigt nichts', () => {
    expect(istErledigt(ci({ coachFeedback: '   ' }))).toBe(false);
  });

  it('ausdrückliches Abhaken erledigt den Check-in', () => {
    expect(istErledigt(ci({ erledigt: true }))).toBe(true);
  });

  it('Altdaten: „als gesehen markiert" gilt als erledigt', () => {
    // Genau das war die Absicht, wenn früher „als gesehen markieren"
    // gedrückt wurde – die To-Do-Meldung blieb aber trotzdem stehen.
    expect(istErledigt(ci({ seenByCoach: true }))).toBe(true);
  });
});

describe('Der gemeldete Fehler: Meldung trotz eingereichtem Check-in', () => {
  it('ein abgehakter Check-in erzeugt KEINE To-Do-Meldung mehr', () => {
    const todos = checkinTodos(kunde(), [ci({ erledigt: true })]);
    expect(todos).toEqual([]);
  });

  it('auch der alte Weg „als gesehen markieren" räumt die Meldung weg', () => {
    const todos = checkinTodos(kunde(), [ci({ seenByCoach: true })]);
    expect(todos).toEqual([]);
  });

  it('ein unbeantworteter Check-in erscheint dagegen sehr wohl', () => {
    const todos = checkinTodos(kunde(), [ci()]);
    expect(todos).toHaveLength(1);
    expect(todos[0]!.typ).toBe('feedback');
  });

  it('ein Check-in OHNE Datum geht nicht verloren', () => {
    // Die alte Abfrage nutzte orderBy("datum") – Firestore ließ Dokumente ohne
    // dieses Feld stillschweigend weg, und der Kunde galt als säumig.
    const todos = checkinTodos(kunde(), [ci({ datum: undefined, erledigt: true })]);
    expect(todos.some((t) => t.typ === 'kein_checkin')).toBe(false);
  });

  it('ein Check-in von heute gilt nicht als „noch keiner"', () => {
    // `daysSince` war 0 und damit falsch im Sinne von JavaScript.
    const lage = checkinLage([ci({ datum: '2026-08-14' })], JETZT);
    expect(lage.tageSeitLetztem).toBe(0);
    expect(lage.nochNieEingereicht).toBe(false);
    expect(checkinTodos(kunde(), [ci({ datum: '2026-08-14', erledigt: true })])).toEqual([]);
  });

  it('meldet erst nach über einer Woche ohne Check-in', () => {
    const sieben = checkinTodos(kunde(), [ci({ datum: '2026-08-07', erledigt: true })]);
    expect(sieben.some((t) => t.typ === 'kein_checkin')).toBe(false);

    const acht = checkinTodos(kunde(), [ci({ datum: '2026-08-05', erledigt: true })]);
    const meldung = acht.find((t) => t.typ === 'kein_checkin');
    expect(meldung?.text).toBe('Kein Check-in seit 9 Tagen');
  });

  it('meldet, wenn noch nie ein Check-in kam', () => {
    const todos = checkinTodos(kunde(), []);
    expect(todos).toHaveLength(1);
    expect(todos[0]!.text).toBe('Noch kein Check-in eingereicht');
  });
});

describe('Check-in-Lage', () => {
  it('findet den neuesten Check-in', () => {
    const lage = checkinLage(
      [ci({ datum: '2026-08-01' }), ci({ datum: '2026-08-12' }), ci({ datum: '2026-07-20' })],
      JETZT,
    );
    expect(lage.letzter?.datum).toBe('2026-08-12');
    expect(lage.tageSeitLetztem).toBe(2);
  });

  it('kommt mit deutschem Datumsformat in Altdaten klar', () => {
    const lage = checkinLage([ci({ datum: '01.08.2026' })], JETZT);
    expect(lage.tageSeitLetztem).toBe(13);
  });

  it('lässt sich von einem Datensatz ohne Datum nicht aus der Ruhe bringen', () => {
    const lage = checkinLage([ci({ datum: undefined }), ci({ datum: '2026-08-10' })], JETZT);
    expect(lage.tageSeitLetztem).toBe(4);
    expect(lage.nochNieEingereicht).toBe(false);
  });

  it('zählt nur die offenen Check-ins', () => {
    const lage = checkinLage(
      [ci({ erledigt: true }), ci(), ci({ coachFeedback: 'top' }), ci()],
      JETZT,
    );
    expect(lage.offene).toHaveLength(2);
  });
});

describe('Feedback für den Kunden', () => {
  it('erkennt ungelesenes Coach-Feedback', () => {
    const offen = ci({ coachFeedback: 'Super', feedbackSeenByClient: false });
    const gelesen = ci({ coachFeedback: 'Super', feedbackSeenByClient: true });
    expect(istUngelesen(offen)).toBe(false); // für den Coach erledigt
    expect(offen.feedbackSeenByClient).toBe(false); // für den Kunden neu
    expect(gelesen.feedbackSeenByClient).toBe(true);
  });
});
