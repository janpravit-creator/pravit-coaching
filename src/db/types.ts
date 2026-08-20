/**
 * Das Datenmodell – exakt so, wie es in Firestore liegt.
 *
 * Sämtliche Feldnamen sind aus der bestehenden App übernommen und dürfen sich
 * **nicht** ändern: dieselbe Datenbank bedient weiterhin die alte Fassung, und
 * jeder Bestandsdatensatz muss unverändert lesbar bleiben. Deutsche Kürzel wie
 * `vn`, `nn` oder `kg` bleiben deshalb stehen, auch wo ein sprechender Name
 * schöner wäre.
 *
 * Fast alles ist optional. Über die Jahre sind Felder dazugekommen, und alte
 * Dokumente haben sie schlicht nicht – wer hier Pflichtfelder deklariert, baut
 * sich Abstürze bei genau den Kunden ein, die am längsten dabei sind.
 */

/* ------------------------------------------------------------------ *
 * Pakete
 * ------------------------------------------------------------------ */

/**
 * Paketdefinitionen, Preisphasen und der Bestandsschutz stehen in
 * `@/domain/pakete` – dort, wo auch die Regeln dazu getestet sind. Hier bleibt
 * nur der Schlüsseltyp, weil `Client.paket` ihn braucht.
 */
export type PaketKey = string;

/* ------------------------------------------------------------------ *
 * Empfehlungen
 * ------------------------------------------------------------------ */

/**
 * Eine Empfehlung: Wer hat wen geworben.
 *
 * Entsteht, sobald ein Neukunde einen Empfehlungscode angibt. `gewaehrt` merkt
 * sich, dass die Gutschrift verrechnet wurde – sonst stünde derselbe Anspruch
 * jeden Monat erneut offen.
 */
export interface Referral {
  id: string;
  /** Der Code, über den geworben wurde. */
  code?: string;
  werberId?: string;
  werberName?: string;
  geworbenerId?: string;
  geworbenerName?: string;
  /** Gewährt am – als ISO-Datum. Leer, solange offen. */
  gewaehrt?: string;
  /** Was gewährt wurde, für die Nachvollziehbarkeit. */
  gewaehrtArt?: string;
  gewaehrtBetrag?: number;
  createdAt?: string;
}

/* ------------------------------------------------------------------ *
 * Rechnungen
 * ------------------------------------------------------------------ */

/**
 * Eine vergebene Rechnungsnummer.
 *
 * Wird gespeichert, sobald eine Rechnung erzeugt wurde – § 14 UStG verlangt
 * fortlaufende, nachvollziehbare Nummern. Die Kennung ist
 * `{clientId}_{monat}`, damit derselbe Monat nie zwei Belege bekommt.
 */
export interface Invoice {
  id: string;
  nummer?: string;
  clientId?: string;
  clientName?: string;
  /** Abrechnungsmonat als `YYYY-MM`. */
  monat?: string;
  /** Alle abgerechneten Monate – bei Rückstand mehrere. */
  monate?: string[];
  betrag?: number;
  paket?: string;
  /** Rechnungsdatum als `YYYY-MM-DD`. */
  datum?: string;
  faelligAm?: string;
  createdAt?: string;
}

/* ------------------------------------------------------------------ *
 * Trainingsplan
 * ------------------------------------------------------------------ */

export interface PlanExercise {
  name: string;
  /** Als Zeichenkette gespeichert, nicht als Zahl – historisch gewachsen. */
  sets?: string;
  /** Wiederholungen bzw. Bereich, z. B. „8-12". Beide Felder tragen denselben Wert. */
  reps?: string;
  repRange?: string;
}

export interface PlanDay {
  name: string;
  note?: string;
  exercises?: PlanExercise[];
}

export interface TrainingPlan {
  name: string;
  days?: PlanDay[];
}

/* ------------------------------------------------------------------ *
 * Ernährungsplan
 * ------------------------------------------------------------------ */

/**
 * Bezugsgröße der hinterlegten Nährwerte.
 *
 * `100g` – die Werte gelten je 100 Gramm und skalieren mit der Menge.
 * `stueck` – die Werte gelten je Stück und werden mit der Anzahl multipliziert.
 */
export type NaehrwertBasis = '100g' | 'stueck';

/**
 * Ein Lebensmittel in einer Mahlzeit.
 *
 * **Zu den Feldnamen:** Die Nährwerte liegen als *Bezugswerte* vor
 * (`kcalPer100` und Geschwister), nicht als fertige Werte für die eingetragene
 * Menge – genau so, wie die bisherige App sie geschrieben hat. Daraus rechnet
 * `makrosEinesLebensmittels` in `domain/lebensmittel.ts` den tatsächlichen
 * Beitrag aus. `amount` ist der frei getippte Text („150g", „2 Stück"),
 * `grams` die daraus gezogene Zahl, mit der gerechnet wird.
 */
export interface MealFood {
  name: string;
  /** Menge als freier Text, z. B. „150 g" oder „2 Stück". */
  amount?: string;
  /** Die Zahl aus `amount` – Gramm bei Basis `100g`, Stückzahl bei `stueck`. */
  grams?: string | number;
  basis?: NaehrwertBasis;
  kcalPer100?: string | number;
  protPer100?: string | number;
  fatPer100?: string | number;
  carbsPer100?: string | number;
}

export interface Meal {
  name?: string;
  kcal?: string | number;
  prot?: string | number;
  fat?: string | number;
  carbs?: string | number;
  foods?: MealFood[];
}

export interface MealPlan {
  name: string;
  meals?: Meal[];
}

/* ------------------------------------------------------------------ *
 * Supplements und Zahlungen
 * ------------------------------------------------------------------ */

export interface Supplement {
  name: string;
  dose?: string;
  /** Einnahmezeitpunkt als freier Text, z. B. „morgens". */
  time?: string;
}

export interface Zahlung {
  /** Monat im Format `YYYY-MM`. */
  monat: string;
  bezahlt: boolean;
  updatedAt?: string;
}

/* ------------------------------------------------------------------ *
 * Kunde
 * ------------------------------------------------------------------ */

export interface Client {
  /** Dokument-Kennung = Firebase-Konto-Kennung. */
  id: string;
  uid?: string;
  email?: string;

  /* Stammdaten */
  vn?: string;
  nn?: string;
  tel?: string;
  geb?: string;
  age?: string | number;
  sex?: string;
  job?: string;

  /* Körper und Ziel */
  kg?: string | number;
  cm?: string | number;
  zielgewicht?: string | number;
  ziel?: string;
  freq?: string;
  exp?: string;

  /* Anamnese */
  medi?: string;
  diet?: string;
  allergie?: string;
  abneigung?: string;
  verletzung?: string;
  motiv?: string;
  erwart?: string;

  /* Betreuung */
  paket?: string;
  paketPreis?: number;
  startDatum?: string;
  aktiv?: boolean;
  createdAt?: string;
  coachNotes?: string;
  calorieTarget?: CalorieTarget | null;

  /* Pläne – die Mehrzahlformen sind die gültigen. `plan` und `mealPlan`
     stammen aus der Registrierung und werden nur noch gelesen. */
  plans?: TrainingPlan[];
  mealPlans?: MealPlan[];
  plan?: unknown[];
  mealPlan?: unknown[];
  supplements?: Supplement[];
  zahlungen?: Zahlung[];
}

/**
 * Ergebnis des Kalorienrechners, wie es beim Kunden hinterlegt wird.
 *
 * Die Feldnamen stammen aus der bestehenden App und bleiben englisch. Alles
 * ist optional, weil ältere Einträge nur einen Teil davon tragen.
 */
export interface CalorieTarget {
  bmr?: number;
  tdee?: number;
  targetKcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  activityFactor?: number;
  adjustmentPct?: number;
  proteinPerKg?: number;
  fatPerKg?: number;
  calculatedAt?: string;
}

export function clientName(c: Pick<Client, 'vn' | 'nn'>): string {
  return `${c.vn ?? ''} ${c.nn ?? ''}`.trim() || 'Ohne Namen';
}

/* ------------------------------------------------------------------ *
 * Check-in
 * ------------------------------------------------------------------ */

export interface Checkin {
  id: string;

  /** Tagesdatum `YYYY-MM-DD`. Kann in Altdaten fehlen. */
  datum?: string;
  createdAt?: string;
  clientName?: string;

  /* Messwerte – durchgehend als Zeichenketten gespeichert */
  kg?: string;
  tage?: string;
  kcal?: string;
  prot?: string;
  schlafdauer?: string;
  wasser?: string;
  schritte?: string;

  /* Bewertungsskalen 1–10 */
  intensitaet?: string | number;
  ernscore?: string | number;
  schlaf?: string | number;
  energie?: string | number;
  stress?: string | number;

  /* Freitext */
  highlight?: string;
  nichtgut?: string;
  gut?: string;
  ziel?: string;
  fragen?: string;

  /* Bearbeitungsstand */
  seenByCoach?: boolean;
  coachFeedback?: string;
  feedbackAt?: string;
  feedbackSeenByClient?: boolean;
  /** Neu: ausdrücklich als erledigt markiert, auch ohne geschriebenes Feedback. */
  erledigt?: boolean;
}

export const CHECKIN_SCALES = [
  { key: 'intensitaet', label: 'Trainingsintensität' },
  { key: 'ernscore', label: 'Ernährung' },
  { key: 'schlaf', label: 'Schlafqualität' },
  { key: 'energie', label: 'Energie' },
  { key: 'stress', label: 'Stress' },
] as const;

export type CheckinScaleKey = (typeof CHECKIN_SCALES)[number]['key'];

/* ------------------------------------------------------------------ *
 * Trainings-Logbuch
 * ------------------------------------------------------------------ */

export interface LoggedSet {
  /** Satznummer, bei Aufwärmsätzen „W1", „W2" … */
  set: number | string;
  kg?: string;
  reps?: string;
  rpe?: string;
}

export interface LoggedExercise {
  name: string;
  targetReps?: string;
  repRange?: string;
  warmupSets?: LoggedSet[];
  sets?: LoggedSet[];
}

export interface LogbookEntry {
  id: string;
  datum?: string;
  exercises?: LoggedExercise[];
  notes?: string;
  planName?: string;
  dayName?: string;
  durationMin?: string | number;
  createdAt?: string;
}

/* ------------------------------------------------------------------ *
 * Verlauf, Vorlagen, Bibliotheken, Hinweise
 * ------------------------------------------------------------------ */

/** Frühere Trainings- bzw. Ernährungspläne eines Kunden. */
export interface PlanHistoryEntry {
  id: string;
  plans?: TrainingPlan[];
  mealPlans?: MealPlan[];
  archivedAt?: string;
  createdAt?: string;
}

export type TemplateType = 'training' | 'ernaehrung';

/**
 * Plan-Vorlage.
 *
 * Eine Vorlage trägt ihre Tage bzw. Mahlzeiten **direkt** – nicht als `plans[]`
 * wie beim Kunden. Beim Einsetzen entsteht daraus ein Plan mit dem Namen der
 * Vorlage. `type` entscheidet, welches der beiden Felder gefüllt ist.
 */
export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  days?: PlanDay[];
  meals?: Meal[];
  createdAt?: string;
}

/** Muskelgruppen und Gerätearten der Übungsdatenbank – Reihenfolge wie bisher. */
export const MUSKELGRUPPEN = [
  'Brust', 'Trapez', 'Latissimus', 'Schulter', 'Bizeps', 'Trizeps',
  'Quadrizeps', 'Hamstrings', 'Adduktoren', 'Abduktoren', 'Gluteus',
  'Waden', 'Bauch', 'Unterarme', 'Ganzkörper',
] as const;

export const GERAETE = [
  'Langhantel', 'Kurzhantel', 'Kabelzug', 'Maschine', 'Multipresse',
  'Körpergewicht', 'Kettlebell', 'Widerstandsband', 'Sonstiges',
] as const;

/** Übungsdatenbank des Coaches. Die Kennung ist ein Bezeichner aus dem Namen. */
export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  equipment?: string;
  usageCount?: number;
  createdAt?: string;
}

/** Eigenes Lebensmittel. `basis` sagt, worauf sich die Werte beziehen. */
export interface CustomFood {
  id: string;
  name: string;
  basis?: '100g' | 'stueck' | string;
  kcal?: string | number;
  /** Ausgeschrieben – anders als im Ernährungsplan, wo `prot` steht. */
  protein?: string | number;
  fat?: string | number;
  carbs?: string | number;
  usageCount?: number;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  type?: 'checkin' | 'new_client' | string;
  clientName?: string;
  clientId?: string;
  datum?: string;
  createdAt?: string;
  seen?: boolean;
}
