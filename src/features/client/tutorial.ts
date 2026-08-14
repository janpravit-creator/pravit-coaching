/**
 * Die Einführungstour für neue Kunden.
 *
 * Der Wortlaut ist aus der bisherigen App übernommen. Weggefallen ist nur die
 * Hervorhebung einzelner Bildschirmelemente (`target`, `position`): Sie setzte
 * voraus, dass genau dieses Element gerade sichtbar ist und an derselben
 * Stelle steht – auf dem Handy saß der Rahmen deshalb regelmäßig daneben oder
 * über einem Element, das man erst wegscrollen musste. Die Tour erklärt jetzt
 * einfach, was wo zu finden ist.
 */

export interface TourSchritt {
  titel: string;
  text: string;
  /** Reiter, auf den der Schritt zeigt – nur zur Beschriftung. */
  bereich?: string;
}

export const TOUR_SCHRITTE: TourSchritt[] = [
  {
    titel: 'Willkommen bei PRAVIT!',
    text: 'Ich bin dein persönlicher Coach. Diese kurze Tour zeigt dir die wichtigsten Funktionen – es dauert nur zwei Minuten.',
  },
  {
    titel: 'Dein Start',
    text: 'Hier siehst du immer deinen aktuellen Stand: dein Gewicht, dein Ziel und deinen Fortschritt. Außerdem sofort, wenn es neues Feedback von mir gibt.',
    bereich: 'Start',
  },
  {
    titel: 'Trainingsplan & Ernährung',
    text: 'Ich stelle dir einen persönlichen Trainings- und Ernährungsplan zusammen. Beides findest du auf der Startseite, wenn du nach unten scrollst – deinen Supplement-Plan ebenfalls.',
    bereich: 'Start',
  },
  {
    titel: 'Wöchentlicher Check-in',
    text: 'Einmal pro Woche trägst du hier ein, wie es lief: Gewicht, Trainingstage und fünf kurze Einschätzungen per Schieberegler. Danach bekommst du persönliches Feedback von mir.',
    bereich: 'Check-in',
  },
  {
    titel: 'Dein Logbuch',
    text: 'Hier trägst du jede Trainingseinheit ein. Wähle deinen Plan, dann Gewicht und Wiederholungen über den Ziffernblock. Der Schalter oben zeigt oder versteckt die Werte vom letzten Mal – so trainierst du, ohne dich von alten Zahlen bremsen zu lassen.',
    bereich: 'Logbuch',
  },
  {
    titel: 'Fortschritt verfolgen',
    text: 'Im Fortschritt siehst du deinen Gewichtsverlauf über die Zeit. Du kannst außerdem einzelne Übungen auswählen und ihre Entwicklung als Kurve verfolgen.',
    bereich: 'Fortschritt',
  },
  {
    titel: 'Wiki & Supplements',
    text: 'Im Wiki steht das Wichtigste zu Training, Ernährung, Regeneration und Phasen. Unter Supplements findest du die Produkte, die ich selbst nehme und empfehle – mit Links.',
    bereich: 'Wiki',
  },
  {
    titel: 'Los geht’s',
    text: 'Das war die Tour. Fang am besten gleich mit deinem ersten Check-in an. Bei Fragen bin ich immer für dich da.',
  },
];

/**
 * Ob die Tour für dieses Konto schon gelaufen ist.
 *
 * Der Schlüssel ist derselbe wie in der bisherigen App – Bestandskunden, die
 * die Tour bereits gesehen haben, bekommen sie dadurch nicht noch einmal.
 */
const schluessel = (uid: string) => `pravit_tut_done_${uid}`;

export function tourErledigt(uid: string): boolean {
  try {
    return localStorage.getItem(schluessel(uid)) !== null;
  } catch {
    // Privater Modus ohne Gerätespeicher: lieber keine Tour als ein Absturz.
    return true;
  }
}

export function merkeTourErledigt(uid: string): void {
  try {
    localStorage.setItem(schluessel(uid), '1');
  } catch {
    /* ohne Gerätespeicher läuft die Tour beim nächsten Mal eben erneut */
  }
}

export function setzeTourZurueck(uid: string): void {
  try {
    localStorage.removeItem(schluessel(uid));
  } catch {
    /* nichts zu tun */
  }
}
