# Übergabe

Was fertig ist, was du tun musst, und in welcher Reihenfolge.

---

## Was du in der Hand hast

| Was | Wo | Zustand |
|---|---|---|
| Coaching-App | dieses Repository, `npm run build` → `dist/` | läuft, 166 Tests grün |
| Landingpage | `landingpage/` | fertig, Impressum als Gerüst |
| Stripe-Anbindung | `netlify/functions/` | gebaut, wartet auf deine Schlüssel |
| Video-Notebook | `notebooks/PRAVIT_Video_Pipeline.ipynb` | gehärtet, Anbieter anzupassen |
| Storyboards | `docs/D-Storyboards.md` | 4 Stück, mit Prompts |
| Content-Paket | `docs/C-Content-Paket.md` | 4 Wochen Plan, 20 Beiträge |
| Testkunden-Gespräch | `docs/B5-Testkunden-Konversion.md` | Leitfaden mit Einwänden |
| Skalierung | `docs/F-Skalierung.md` | Aufwand und Empfehlung |

---

## Reihenfolge

### Diese Woche — ohne das geht nichts

**1. Geschäftsangaben ausfüllen.** `src/lib/geschaeft.ts`, die vier Felder mit
`AUSFÜLLEN`: Straße, PLZ/Ort, Steuernummer, IBAN. Ohne sie warnt die App vor
jedem Rechnungsdruck, und die Rechnung wäre nach § 14 UStG nicht gültig.

Alternativ ohne Codeänderung über Netlify-Umgebungsvariablen:
`VITE_FIRMA_STRASSE`, `VITE_FIRMA_PLZ_ORT`, `VITE_FIRMA_STEUERNUMMER`,
`VITE_FIRMA_IBAN`.

**2. App neu ausliefern.** `npm run build`, dann `dist/` bei Netlify ablegen.

**3. Testkunden ansprechen.** `docs/B5-Testkunden-Konversion.md`. Einen nach
dem anderen, nicht beide am selben Tag.

### Diesen Monat

**4. Landingpage online bringen.**
- Impressum ausfüllen — alles, was auf der Seite grau hinterlegt erscheint
- Datenschutzerklärung prüfen lassen (das Gerüst ist keine geprüfte Fassung)
- `landingpage/` als eigenes Netlify-Projekt ablegen
- Im Fußbereich die Adresse der App eintragen

**5. Google-Business-Profil anlegen.** Texte stehen fertig in
`docs/C-Content-Paket.md`.

**6. Content starten.** Woche 1 des Redaktionsplans. Fünf Beiträge, nicht
sieben — was du nicht durchhältst, brauchst du nicht anzufangen.

### Wenn Zeit ist

**7. Stripe scharf schalten** — siehe unten.
**8. Videos erzeugen** — Notebook, aber zuerst Abschnitt 7 (Rettung).

---

## Stripe in Betrieb nehmen

Alles ist gebaut. Es fehlen nur deine Schlüssel.

**1. Im Stripe-Dashboard** vier Produkte anlegen, jedes mit einem
**wiederkehrenden** monatlichen Preis:

| Produkt | Preis |
|---|---|
| PRAVIT Training | 79 € / Monat |
| PRAVIT Ernährung | 79 € / Monat |
| PRAVIT Komplett | 129 € / Monat |
| PRAVIT Premium | 199 € / Monat |

Jeder Preis hat eine Kennung (`price_…`). Die brauchst du gleich.

**2. Webhook einrichten:** Dashboard → Developers → Webhooks → Endpoint
hinzufügen.

- Adresse: `https://DEINE-APP.netlify.app/.netlify/functions/stripe-webhook`
- Ereignisse: `checkout.session.completed`, `invoice.paid`,
  `invoice.payment_failed`, `customer.subscription.deleted`
- Danach das Signaturgeheimnis (`whsec_…`) kopieren

**3. Firebase-Dienstkonto:** Firebase-Konsole → Projekteinstellungen →
Dienstkonten → „Neuen privaten Schlüssel erzeugen". Die JSON-Datei
herunterladen und **als eine einzige Zeile** in die Umgebungsvariable
einfügen.

> Dieser Schlüssel ist Vollzugriff auf deine Datenbank. Er gehört
> ausschließlich in die Netlify-Variablen — niemals ins Repository, niemals
> in eine Nachricht.

**4. In Netlify eintragen** (Site settings → Environment variables):

```
STRIPE_GEHEIM            sk_test_…   (zum Üben erst der Testschlüssel)
STRIPE_WEBHOOK_GEHEIM    whsec_…
STRIPE_PREIS_TRAINING    price_…
STRIPE_PREIS_ERNAEHRUNG  price_…
STRIPE_PREIS_KOMPLETT    price_…
STRIPE_PREIS_PREMIUM     price_…
FIREBASE_DIENSTKONTO     {"type":"service_account",…}
SEITEN_URL               https://deine-app.netlify.app
```

**5. Im Testmodus durchspielen.** Testkarte `4242 4242 4242 4242`, beliebiges
künftiges Ablaufdatum, beliebige Prüfziffer. Es fließt kein Geld.

Danach prüfen: Steht der Monat beim Kunden in der App als bezahlt? Wenn ja,
funktioniert die ganze Kette. Erst dann auf `sk_live_…` wechseln.

---

## Testanleitung

Nach jeder Auslieferung durchgehen. Zehn Minuten, erspart peinliche Anrufe.

### Als Kunde
- [ ] Anmelden — Startseite erscheint mit Plänen
- [ ] Check-in absenden — steht danach im Verlauf
- [ ] Training im Logbuch erfassen, **Seite neu laden** — Entwurf ist noch da,
      Timer läuft an der richtigen Stelle weiter
- [ ] Fortschritt — Kurven zeichnen sich
- [ ] Wiki — Übungen erscheinen, Filterreihe scrollt sauber durch

### Als Coach
- [ ] Kunde öffnen, Trainingsplan ändern, speichern → als Kunde nachsehen
- [ ] Ernährungsplan: **Lebensmittel suchen** — einmal „Skyr" (verpackt,
      Open Food Facts) und einmal „Banane" (frisch, USDA)
- [ ] Menge tippen — Werte rechnen live mit
- [ ] `Σ Nährwerte berechnen` — Summe übernimmt die Lebensmittel
- [ ] Paket setzen — Preis steht auf dem aktuellen Listenpreis
- [ ] Rechnung öffnen — fortlaufende Nummer, keine `AUSFÜLLEN`-Warnung mehr
- [ ] Check-in als erledigt markieren → Meldung verschwindet, **auch nach dem
      Neuladen**
- [ ] Cockpit — Nebeneinnahmen eintragen, speichern, neu laden, noch da
- [ ] Empfehlungen — Empfehlung eintragen

### Auf dem iPhone
- [ ] „Zum Home-Bildschirm hinzufügen" — Hantel-Icon erscheint, nicht „P"
- [ ] Datumsfelder öffnen das Rad-Sheet
- [ ] Filterreihen: grauer Grund läuft durch, bricht nicht ab

---

## Wo was steht

```
src/domain/      Reine Logik, ohne React und Firebase – hier sind die Tests
  pakete.ts        Preise und Bestandsschutz     ← Preise ändern
  rechnung.ts      Nummernkreis, Zahlungsziel
  empfehlung.ts    Empfehlungsstufen
  cockpit.ts       Netto-Ziel, Rücklage, Meilensteine
  stripe.ts        reine Stripe-Hilfslogik
src/db/          Typen und Repositories je Sammlung
src/features/    Oberfläche: auth · client · coach
netlify/functions/  Stripe-Checkout und Webhook
landingpage/     Eigenständige Werbeseite
docs/            Diese Dokumente
notebooks/       Video-Pipeline
```

**Preise ändern:** `src/domain/pakete.ts`, Feld `preis` je Paket. Es gibt
bewusst keine Automatik — wann erhöht wird, entscheidest du. Bestandskunden
behalten ihren Preis, weil er beim Anlegen in `paketPreis` festgeschrieben
wurde.

**Befehle:**

```
npm run dev        Entwicklungsserver
npm run test       166 Tests
npm run build      erzeugt dist/
npm run preview    dist/ lokal ansehen
```

---

## Was ich nicht prüfen konnte

Ehrlich, damit du weißt, wo du selbst hinschauen musst:

**Die externen Lebensmittel-Datenbanken.** Open Food Facts und USDA sind vom
Netz dieses Containers gesperrt (403 am Proxy). Auswertung und Reihenfolge
sind durch 12 Tests mit aufgezeichneten Antworten abgesichert, die Adressen
stammen wörtlich aus deiner alten App — aber **ob die Dienste antworten,
siehst nur du auf dem Gerät**.

**Stripe.** Kein Konto, kein Netz. Die Funktionen typprüfen gegen die
offiziellen Stripe-Typen, die reine Logik ist getestet, aber ein echter
Zahlungsdurchlauf ist ungetestet. Deshalb der Testmodus als Pflichtschritt.

**Das Video-Notebook.** Welcher Anbieter genutzt wurde, weiß ich nicht.
Adresse und Feldnamen sind als anzupassen markiert. Die Struktur — Absicherung
je Szene, Fortschritt auf Drive, Protokoll vor dem Warten — funktioniert
unabhängig davon.

**Firebase-Schreibvorgänge.** Ohne Anmeldedaten konnte ich nichts gegen die
echte Datenbank laufen lassen. Der Testlauf oben ist der Ersatz dafür.

---

## Was ich nicht mache

- **Keine Steuer- oder Rechtsberatung.** Das Rechnungssystem folgt dem, was
  im Konzept steht (Freiberufler, § 19 UStG). Bestätigen muss das ein
  Steuerberater. Impressum und Datenschutz sind ein Gerüst, keine geprüfte
  Fassung — vor der Veröffentlichung prüfen lassen.
- **Keine Zahlungsdaten in meiner Hand.** Stripe-Konto und Schlüssel kommen
  von dir. Das ist Absicht.

---

## Ein Hinweis zum Schluss

Der Plan enthält deutlich mehr, als du in den nächsten Wochen umsetzen
kannst. Wenn du nur drei Dinge machst, dann diese:

1. **Die zwei Testkunden umstellen.** Das ist der schnellste echte Umsatz.
2. **Die Landingpage online bringen.** Ohne sie hat jede Anfrage nirgends
   hinzugehen.
3. **Vier Wochen Content durchziehen.** Nicht perfekt, sondern konsistent.

Stripe, Videos und Lizenzmodell können warten. Kunden nicht.
