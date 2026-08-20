# Skalierung: von einem Trainer zu mehreren

Zwei Fragen: Was ist technisch nötig, damit PRAVIT von anderen Trainern
genutzt werden kann (F1) — und lohnt sich das überhaupt gegenüber den
Alternativen (F2).

---

## F1 · Was mandantenfähig werden muss

### Wo es heute klemmt

Die App geht an einer Stelle davon aus, dass es **einen** Coach gibt:

```
clients/{uid}          ← alle Kunden in einer Sammlung
exercises/{id}         ← eine Übungsdatenbank
customFoods/{id}       ← eine Lebensmitteldatenbank
templates/{id}         ← ein Satz Vorlagen
invoices/{id}          ← ein Nummernkreis
notifications/{id}     ← ein Posteingang
settings/cockpit       ← ein Cockpit
```

Wer Coach ist, entscheidet eine einzige E-Mail-Adresse in `src/lib/firebase.ts`.
Käme ein zweiter Trainer dazu, sähe er alle Kunden des ersten. Das ist kein
Feinschliff, sondern der Kern der Arbeit.

### Der Umbau

**1. Mandant als oberste Ebene** — der invasivste Teil.

```
trainer/{trainerId}/clients/{uid}
trainer/{trainerId}/exercises/{id}
trainer/{trainerId}/customFoods/{id}
trainer/{trainerId}/templates/{id}
trainer/{trainerId}/invoices/{id}
trainer/{trainerId}/settings/{bereich}
```

Der gute Teil: Alle Zugriffe laufen bereits über `src/db/firestore.ts` und
die Repositories. Die Pfade stehen an **einer** Stelle, nicht an 55 — das war
beim Neuaufbau die richtige Entscheidung und zahlt sich hier aus. Praktisch
bekommen alle `paths.*`-Funktionen ein `trainerId`-Argument.

**2. Rollen statt einer E-Mail-Adresse.**

```
nutzer/{uid} = { rolle: 'trainer' | 'kunde', trainerId: '…' }
```

Beim Anmelden wird dieses Dokument gelesen, und daraus ergibt sich, welchen
Mandanten man sieht. Die Prüfung gegen `VITE_COACH_EMAIL` fällt weg.

**3. Sicherheitsregeln.** Der eigentlich kritische Punkt. Heute reicht
„angemeldet und Coach". Künftig muss jede Regel prüfen, ob der Zugreifende
zu **diesem** Mandanten gehört. Ein Fehler hier bedeutet, dass Trainer A die
Kunden von Trainer B sieht — der Fehler, der ein solches Produkt beendet.

**4. Lizenzverwaltung.** Ein eigener Bereich, in dem du Trainer anlegst,
sperrst und abrechnest. Am einfachsten über Stripe-Abos, wie bei den Kunden
— die Anbindung steht ja schon.

**5. Was pro Trainer eigen sein muss.** Rechnungsnummernkreis (jeder braucht
seinen eigenen, lückenlosen), Geschäftsangaben, Preise, Cockpit-Zahlen. Die
Übungsdatenbank könnte man teilen — besser nicht: Wer eine Übung umbenennt,
ändert sie sonst bei allen.

### Aufwand

| Baustein | Aufwand | Risiko |
|---|---|---|
| Pfade auf Mandanten umstellen | 2–3 Tage | mittel, aber gut testbar |
| Rollen und Anmeldung | 1–2 Tage | niedrig |
| Sicherheitsregeln + Tests | 2–3 Tage | **hoch** — hier entstehen Datenlecks |
| Lizenzverwaltung | 3–4 Tage | niedrig |
| Umzug der Bestandsdaten | 1 Tag | mittel, einmalig, nur mit Sicherung |
| Oberfläche für Trainer | 2–3 Tage | niedrig |

**Summe: 11–16 Arbeitstage** für eine belastbare Fassung, nicht für einen
Prototyp. Realistisch also sechs bis acht Wochen nebenher.

### Was du vorher wissen solltest

- **Erst ab echter Nachfrage bauen.** Nicht „falls jemand fragt", sondern
  „zwei Trainer haben gefragt und würden zahlen". Vorher ist es Arbeit auf
  Verdacht.
- **Ab dem ersten fremden Trainer bist du Auftragsverarbeiter.** Es braucht
  einen AV-Vertrag nach Art. 28 DSGVO, weil du Daten *seiner* Kunden
  verarbeitest. Das ist Papier, aber es ist Pflicht.
- **Support wird zur Aufgabe.** Ein fremder Trainer, dem die App am
  Sonntagabend nicht läuft, schreibt dir. Das ist der Teil, den man beim
  Rechnen vergisst.

---

## F2 · Die drei Optionen im Vergleich

| | PRAVIT-Lizenz | Freelance-Coding | Wissensprodukt |
|---|---|---|---|
| Vorlauf | 11–16 Tage Bau | wenige Tage | 3–6 Wochen |
| Ertrag realistisch | 30–80 €/Trainer/Monat | 40–70 €/Stunde | 200–800 € je Start |
| Ab wann Geld | Monat 3–6 | sofort | Monat 2–3 |
| Skaliert? | ja, stark | nein | ja, mittel |
| Laufender Aufwand | Support, Wartung | linear zur Zeit | Marketing |
| Lenkt es von PRAVIT ab? | **nein, es ist PRAVIT** | **ja, stark** | teilweise |
| Risiko | Nachfrage könnte fehlen | keins außer Zeit | Aufwand ohne Abnehmer |

### PRAVIT-Lizenz

**Dafür:** Es ist dasselbe Produkt. Jede Stunde fließt in etwas, das du
ohnehin brauchst — auch wenn nie ein Trainer lizenziert. Das ist der
entscheidende Unterschied zu den anderen beiden.

**Dagegen:** Zahlt frühestens in Monat 3–6 etwas aus, und die Nachfrage ist
unbewiesen. Zehn Trainer zu 50 € sind 500 € im Monat — das entspricht knapp
vier Coaching-Kunden, die du ohne Bauzeit auch bekommen könntest.

**Urteil:** Richtig ab Monat 18, wenn deine eigene Kapazität voll ist. Vorher
ist Kundenakquise die bessere Investition derselben Zeit.

### Freelance-Coding im Fitnessumfeld

**Dafür:** Sofort Geld, guter Stundensatz, und du kannst es nachweislich.

**Dagegen:** Der gefährlichste Punkt im ganzen Plan. Coding-Aufträge bezahlen
kurzfristig besser als Coaching-Kunden — und genau deshalb verdrängen sie es.
Nach einem Jahr bist du dann Entwickler mit einem Trainerschein statt Trainer
mit einer App.

**Urteil:** Nur als Notlösung, wenn ein Monat finanziell nicht aufgeht. Nicht
als Standbein. Wenn doch: harte Obergrenze, etwa 20 Stunden im Monat.

### Wissensprodukt

**Dafür:** Passt zur Content-Strategie — du produzierst ohnehin
Erklärformate. Ein Kurs „Trainingsplanung für Wiedereinsteiger" ist
gebündelter Content.

**Dagegen:** Der Markt ist voll, und ohne Reichweite verkauft sich nichts.
Bei deiner heutigen Reichweite wäre der Start wahrscheinlich enttäuschend.

**Urteil:** Frühestens ab etwa 5.000 Follower. Vorher fließt die Zeit besser
in den Content selbst.

### Empfehlung

**Bis Monat 12: keine der drei.** Kunden gewinnen. Jede Stunde in Akquise
bringt momentan mehr als jede Stunde in einem Nebenprodukt — du bist bei zwei
Kunden, nicht bei zwanzig.

**Ab Monat 12–18**, wenn 15–20 Kunden stehen: die **Lizenz** vorbereiten. Nicht
weil sie schnell Geld bringt, sondern weil sie das Einzige der drei ist, das
deine eigene App besser macht.

**Freelance-Coding** bleibt der Notnagel für einen schlechten Monat — mit
Obergrenze, damit es nicht zum Hauptberuf wird.
