# PRAVIT Coaching

Coach-Arbeitsplatz und Kundenbereich als Web-App. Neuaufbau der bisherigen
Anwendung – **gleicher Funktionsumfang, gleiche Datenbank, neuer Aufbau**.

Vorher lag alles in einer einzigen `index.html` mit 5.118 Zeilen: HTML, CSS und
JavaScript inline, 167 Funktionen am `window`-Objekt, Zustand in globalen
Variablen und DOM-Attributen. Hier ist daraus ein getipptes React-Projekt
geworden, dessen Rechenlogik ohne Browser prüfbar ist.

---

## Loslegen

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5174
```

| Befehl | Wofür |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Prüft die Typen und baut nach `dist/` |
| `npm run preview` | Liefert den gebauten Stand aus – genau das, was bei Netlify landet |
| `npm run test` | Unit-Tests der Rechenlogik |
| `npm run e2e` | End-to-End-Tests gegen den gebauten Stand |
| `npm run icons` | Erzeugt die App-Icons neu |

---

## Aufbau

```
src/
├── db/          Firestore: Typen, Pfade, ein Repository je Sammlung
├── domain/      Reine Rechenlogik – ohne React, ohne Firebase, unit-getestet
├── state/       Anmeldung und Rolle, kurzlebige Hinweise
├── hooks/       Datenabfragen für Kunden- und Coach-Bereich
├── components/  Design-System (Karten, Sheets, Regler, Ziffernblock, Diagramme)
└── features/
    ├── auth/    Anmelden, Registrieren, Passwort, Rechtstexte
    ├── client/  Start · Check-in · Logbuch · Fortschritt · Wiki
    └── coach/   Kunden · Check-ins · Vorlagen · Mehr (To-Dos, Zahlungen,
                 Einnahmen, Datenbank)
```

Zwei Regeln tragen den Rest:

**`domain/` kennt weder React noch Firebase.** Der Check-in-Zustand, die
Makro- und Kalorienrechnung, die Trainingsauswertung und die Zahlungslogik sind
dadurch ohne Browser prüfbar – vorher steckten sie in Render-Funktionen und
waren nur von Hand testbar.

**Sammlungspfade stehen an genau einer Stelle** (`src/db/firestore.ts`).
Vorher war `collection(db, "clients", id, "checkins")` über 55 Stellen verteilt,
und ein Tippfehler fiel erst zur Laufzeit auf.

---

## Datenbank

Dasselbe Firebase-Projekt wie bisher (`coaching-2f33a`), dieselben Sammlungen,
dieselben Feldnamen. Bestandskunden melden sich mit ihren bisherigen
Zugangsdaten an und sehen ihre Daten unverändert.

```
clients/{uid}                   Stammdaten, plans[], mealPlans[], supplements[],
                                zahlungen[], paket, paketPreis, startDatum, aktiv
clients/{uid}/checkins/{id}     datum, kg, tage, die fünf Skalen, Freitexte,
                                seenByCoach, coachFeedback, feedbackAt, erledigt
clients/{uid}/logbook/{id}      datum, exercises[], notes, planName, dayName
clients/{uid}/planHistory/{id}  frühere Trainingspläne
clients/{uid}/mealHistory/{id}  frühere Ernährungspläne
notifications/{id}              Hinweise für den Coach
templates/{id}                  Plan-Vorlagen: name, type, days[] | meals[]
exercises/{id}                  Übungen: name, muscleGroup, equipment, usageCount
customFoods/{id}                Lebensmittel: name, basis, kcal, protein, fat, carbs
```

Einziges neues Feld: `erledigt` auf einem Check-in (siehe unten). Es ist
optional – alte Datensätze funktionieren unverändert weiter, es gibt **keine**
Schreibmigration.

Die Firebase-Web-Konfiguration in `src/lib/firebase.ts` ist kein Geheimnis: Sie
steckt in jedem ausgelieferten Bündel und benennt nur das Projekt. Geschützt
wird ausschließlich über die Firestore-Sicherheitsregeln.

---

## Der behobene Fehler

Gemeldet als: *„Die Meldung sagt, Check-ins seien nicht eingereicht – dabei sind
sie längst da."*

Ursache waren zwei Stellen, die dieselbe Frage aus **verschiedenen Feldern**
beantworteten:

```js
// To-Do-Liste: offen, solange kein Feedback geschrieben ist
const openCI = cis.filter(ci => !ci.coachFeedback);

// „Als gesehen markieren": setzt aber nur seenByCoach
updateDoc(ref, { seenByCoach: true });
```

Abhaken räumte die Check-in-Liste auf und ließ die To-Do-Meldung stehen. Sie
verschwand erst, wenn zu jedem einzelnen Check-in echtes Feedback geschrieben
wurde.

Dazu zwei stille Folgefehler:

- `orderBy("datum")` – Firestore lässt Dokumente **ohne** das Sortierfeld
  stillschweigend weg. Ein Check-in ohne `datum` war unsichtbar, und der Kunde
  erschien als säumig, obwohl er eingereicht hatte.
- `daysSince ? … : "Noch kein Check-in"` – `0` gilt als falsch, ein Check-in von
  heute ging damit als „noch keiner" durch.

**Jetzt** beantwortet `istErledigt` in `src/domain/checkin.ts` die Frage als
einzige Quelle; Abhaken und Feedback schreiben setzen denselben Zustand. Die
Abfragen laufen ohne `orderBy` und sortieren im Speicher mit robuster
Datumsauswertung (`src/domain/dates.ts`, versteht auch `TT.MM.JJJJ`).
Bestandsdaten werden beim Lesen aus `seenByCoach`/`coachFeedback` abgeleitet.

Festgehalten in `src/domain/checkin.test.ts`, unter anderem:
*„ein abgehakter Check-in erzeugt KEINE To-Do-Meldung mehr"*, *„auch der alte Weg
‚als gesehen markieren' räumt die Meldung weg"*, *„ein Check-in OHNE Datum geht
nicht verloren"*, *„ein Check-in von heute gilt nicht als ‚noch keiner'"*.

### Mitbehoben

- `(b.datum > a.datum ? 1 : -1)` gab nie `0` zurück und war damit keine gültige
  Sortierfunktion – bei gleichem Datum war die Reihenfolge zufällig, und damit
  auch das angezeigte „aktuelle Gewicht".
- Die Sammlung `notifications` wuchs unbegrenzt und wurde bei jedem Start
  vollständig geladen. „Mehr → Aufräumen" löscht gelesene Hinweise ab 30 Tagen.
- Der To-Do-Bereich lud für jeden Kunden alle Check-ins einzeln nach. Kunden-,
  Check-in-, To-Do- und Mehr-Seite teilen sich die Abfrage jetzt
  (`src/hooks/useCoachData.ts`).

---

## Tests

```bash
npm run test    # Rechenlogik, ohne Browser und ohne Netz
npm run e2e     # gegen den gebauten Stand
```

Die End-to-End-Tests in `e2e/anmeldung.spec.ts` laufen ohne Einrichtung:
Anmeldemaske, verständliche Fehlermeldungen statt `auth/…`-Codes, direkter
Aufruf einer Unterseite (prüft die SPA-Weiterleitung), der mehrstufige
Fragebogen und der Dunkelmodus.

Die beiden übrigen brauchen ein **Wegwerf-Konto** – sie legen einen echten
Check-in und einen echten Logbuch-Eintrag an. Ohne Zugangsdaten überspringen
sie sich selbst:

```bash
cp .env.example .env.e2e     # E2E_EMAIL und E2E_PASSWORT eintragen
npm run e2e
```

`.env.e2e` ist in `.gitignore` gesperrt.

Für `e2e/coach-todo.spec.ts` – die Abnahme des oben beschriebenen Fehlers am
laufenden System – muss derselbe Testzugang den Coach-Arbeitsplatz sehen:

```bash
VITE_COACH_EMAIL=dein-testkonto@example.com npm run build
npm run e2e
```

Ohne diese Variable gilt die echte Coach-Adresse. Der Auslieferungs-Build ist
davon unberührt – ein echtes Coach-Passwort ist nirgends nötig.

---

## Veröffentlichen

```bash
npm run build     # erzeugt dist/
npm run preview   # vorher lokal gegenprüfen – identischer Stand
```

`dist/` wie bisher bei Netlify hochladen. `netlify.toml` und `public/_redirects`
leiten alle Pfade auf `index.html`, damit ein Neuladen auf `/coach/kunden` nicht
in einen 404 läuft.

> **Vor dem ersten Hochladen:** Firestore einmal sichern (Firebase-Konsole →
> Firestore → Export). Die neue App schreibt in dieselben Sammlungen wie die
> alte; beide könnten sogar parallel laufen.
