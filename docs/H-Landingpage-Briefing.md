# Landingpage — Briefing und Designrichtung

Arbeitsstand für den Neubau der Landingpage. Die alte Fassung unter
`landingpage/index.html` ist **verworfen** — sie wird ersetzt, nicht
weiterentwickelt.

Dieses Dokument existiert, damit der Neubau nicht bei null anfängt: Es hält
die Entscheidungen fest, die schon getroffen sind, und die Fakten, die sonst
neu erfragt werden müssten.

---

## Auftrag

Eine vollständige, sofort nutzbare Landingpage. Nicht ein Entwurf, sondern
etwas, das online gehen kann:

- Anfragen kommen tatsächlich an und laufen nicht ins Leere
- Animationen sauber und zurückhaltend, die Seite reagiert
- Professionell — ausdrücklich **nicht** die übliche KI-Optik
- Ergebnis als ZIP, fertig zum Ablegen bei Netlify

---

## Entscheidungen des Kunden

| Frage | Antwort |
|---|---|
| Anfragen | **WhatsApp-Direktknopf und E-Mail-Formular**, beides |
| WhatsApp / Telefon | **+49 160 5968769** |
| E-Mail | jan.pravit@gmx.de |
| Anschrift | **Hartkrögen 109, 22559 Hamburg** |
| Steuernummer | steht noch aus → Platzhalter lassen |
| Fotos | kommen nach; bis dahin klar markierte Bildplätze |
| Kundenstimmen | Abschnitt vorbereiten, Texte trägt der Kunde nach |

> **Vor dem Livegang:** Steuernummer eintragen und die Beispiel-Kundenstimmen
> ersetzen. Mit Beispieltexten darf die Seite nicht online gehen.

---

## Fakten aus den Repos

**Positionierung.** Personal Training und Online-Coaching, Hamburg.
Zielgruppe sind Menschen, deren Training an etwas gescheitert ist, das ein
Standardplan nicht abbildet: Allergien und Unverträglichkeiten, wenig Zeit,
Wiedereinstieg nach längerer Pause, Plateau, komplexere Gesundheitsprofile
(ADHS, Schilddrüse, Medikation, alte Verletzungen).

**Der Unterschied.** Eine selbst gebaute App statt PDF-Plänen: Logbuch mit
jedem Satz, wöchentlicher Check-in, Ernährung mit echten Nährwerten,
sichtbarer Fortschritt. Angepasst wird aus Daten, nicht aus Bauchgefühl.

**Preise** (Quelle: `src/domain/pakete.ts` — dort stehen sie verbindlich):

| Paket | Preis | Inhalt |
|---|---|---|
| Training | 79 €/Mon. | Trainingsplan, Check-in, App-Zugang |
| Ernährung | 79 €/Mon. | Ernährungsplan, Check-in, App-Zugang |
| Komplett | 129 €/Mon. | Training und Ernährung, prioritäres Feedback |
| Premium | 199 €/Mon. | Komplett plus 4 Einheiten pro Monat vor Ort |

Erstgespräch kostenlos, 15 Minuten. Monatlich kündbar, keine
Mindestlaufzeit. **Bestandspreisgarantie** — wer einsteigt, behält seinen
Preis (technisch abgesichert über das Feld `paketPreis`, siehe
`src/domain/pakete.ts`).

**Tonalität** (aus `docs/C-Content-Paket.md`). Nüchtern, direkt, ehrlich.
Zahlen statt Adjektive. Zwei Regeln aus dem Content-Paket gelten auch hier:

- **Preise nicht verstecken.** Wer nicht sagt, was es kostet, bekommt
  Anfragen von Leuten, die nicht zahlen wollen.
- **Keine Gesundheitsversprechen.** „Heilt Rückenschmerzen" ist heilkundlich
  und nicht zulässig. „Hat bei ihm die Rückenschmerzen gelöst" ist ein
  Bericht und zulässig.

---

## Designrichtung: „Kalibriert"

**Die These.** Jede Fitnessseite sieht gleich aus — schwarz, Neon,
Muskelfotos. Der Unterschied hier ist aber kein Gefühl, sondern Beweis:
jeder Satz protokolliert, jede Woche Zahlen. Also sieht die Seite aus wie
ein **Messinstrument**, nicht wie ein Studioflyer.

**Farben.** Aus kalibrierten Wettkampfscheiben und Kreide — eine Welt, die
jeder Trainierende sofort erkennt.

| Rolle | Hell | Dunkel |
|---|---|---|
| Grund (Kreide) | `#F4F6F7` | `#0E1114` |
| Fläche (Papier) | `#FFFFFF` | `#171B20` |
| Text (Eisen) | `#14171A` | `#EDF0F2` |
| Text leise (Graphit) | `#5A6169` | `#98A1AA` |
| Linie | `#DDE2E6` | `#252B31` |
| **Hantelblau** (20-kg-Scheibe) | `#0B4EA2` | `#5B9BEF` |
| Signalrot (25-kg-Scheibe) | `#C8102E` | `#F2637A` |
| Bestätigung | `#1E7A45` | `#4FB37A` |

Der Grund ist bewusst **kühl** und nicht das warme Creme, das gerade überall
verwendet wird. Blau ist im Fitnessbereich fast unbenutzt — es wirkt sofort
anders und liest sich „wissenschaftlich", was genau die Positionierung ist.
Rot bleibt extrem sparsam, nur für PR-Marker.

**Schrift.** Alle drei liegen bereits unter `landingpage/fonts/` als
Variable Fonts, zusammen 152 KB.

| Rolle | Schrift |
|---|---|
| Überschriften | Archivo 700/800 — technisch, Beschilderungscharakter |
| Fließtext | Public Sans 400/600 |
| Alle Zahlen | JetBrains Mono 500, mit `font-variant-numeric: tabular-nums` |

> **Selbst hosten, nicht per CDN einbinden.** Google Fonts über
> `fonts.googleapis.com` überträgt die IP-Adresse jedes Besuchers an Google.
> Das LG München hat das 2022 als DSGVO-Verstoß gewertet (Az. 3 O 17493/20),
> danach kam eine Abmahnwelle. Die Dateien liegen deshalb lokal.

**Signature-Element.** Statt zu *behaupten* „Anpassung nach deinen Zahlen"
**zeigt** der Aufmacher es: ein anklickbares Check-in-Panel. Der Besucher
wählt eine Woche und sieht die Zahlen und die Konsequenz daraus. Das macht
die unsichtbare Leistung sichtbar — das stärkste Argument der Seite, weil es
das Denken des Coaches zeigt statt es zu beschreiben.

### Inhalt des Panels

Vier Wochen, bewusst mit einer schlechten Woche dazwischen — das ist
glaubwürdiger als vier Wochen Aufwärtstrend und zeigt, dass auch ein
Rückschritt eine Entscheidung auslöst.

**Woche 4** · 82,4 kg (−0,3) · Schlaf 7,4 h · Energie 7/10 · Stress 4/10 · 8.900 Schritte
→ *Bankdrücken 3×8 auf 3×9 bei 72,5 kg.*
„Beide Sätze am oberen Ende, RPE 7. Da geht mehr."

**Woche 5** · 82,1 kg (−0,3) · Schlaf 5,9 h · Energie 4/10 · Stress 8/10 · 6.200 Schritte
→ *Volumen −20 %, Grundübungen bleiben.*
„Zwei Nächte unter sechs Stunden, Stress hoch. Das ist kein Trainingsproblem.
Wir halten die Reize und nehmen das Volumen raus."

**Woche 6** · 81,6 kg (−0,5) · Schlaf 7,8 h · Energie 8/10 · Stress 3/10 · 9.400 Schritte
→ *Kniebeuge 3×5 auf 92,5 kg.* **PR**
„Erholt zurück. Letzte Woche 90 kg bei RPE 9, heute 92,5 bei RPE 8."

**Woche 7** · 81,5 kg (−0,1) · Schlaf 7,6 h · Energie 7/10 · Stress 4/10 · 9.100 Schritte
→ *Kalorien +150.*
„0,1 kg in einer Woche ist Rauschen, aber der Trend über vier Wochen ist
sauber. Wir erhöhen leicht, damit die Kraft nicht wegbricht."

---

## Seitenstruktur

1. **Kopf** — schmal, wird beim Scrollen sichtbar, mit Anfrage-Knopf
2. **Aufmacher** — These plus Check-in-Panel
   H1-Vorschlag: „Dein Plan ändert sich jede Woche. Weil deine Zahlen sich ändern."
3. **Für wen** — die fünf Profile. Beschriftet nach Art (Ernährung, Struktur,
   Progression, Zeit, Gesundheit), **nicht** durchnummeriert — es ist keine
   Reihenfolge
4. **So läuft eine Woche** — der wiederkehrende Kreislauf: trainieren →
   Logbuch → Check-in → Anpassung. Hier sind Nummern richtig, es ist ein Ablauf
5. **Die App** — vier Merkmale plus eine ehrliche Darstellung des Logbuchs
6. **Über mich** — Bildplatz Hochformat 4:5. Werdegang und Lizenz sind
   Platzhalter, die darf niemand erfinden
7. **Pakete** — vier Karten, Preise sichtbar, Bestandspreisgarantie betont
8. **Stimmen** — vorbereitet, deutlich als Platzhalter markiert
9. **Häufige Fragen** — aus den echten Einwänden in `docs/B5-Testkunden-Konversion.md`:
   nicht in Hamburg · was wenn es nicht passt · wenig Zeit · Allergien ·
   Kalorien zählen · Studio nötig · wie schnell geht es los · was kostet das Gespräch
10. **Die ersten 48 Stunden** — kurz, direkt vor dem Formular. Nimmt die
    Unsicherheit genau an der Stelle, an der entschieden wird
11. **Kontakt** — WhatsApp-Knopf und Formular
12. **Fuß** — mit Impressum und Datenschutz als eigene Seiten

---

## Technische Entscheidungen

**Eigene Seiten statt Sprungmarken** für Impressum und Datenschutz. In
Deutschland muss das Impressum von jeder Seite aus in höchstens zwei Klicks
erreichbar sein; eigene Seiten sind sauberer und verlinkbar.

**Formular über Netlify Forms.** `data-netlify="true"` plus verstecktes
`bot-field` gegen Roboter. Zwei Dinge, die leicht vergessen werden:

- `action="/danke.html"` setzen, sonst zeigt Netlify seine eigene, hässliche
  Bestätigungsseite. Die Dankeseite gehört mit ins Bündel.
- Im Netlify-Dashboard unter *Forms → Notifications* die
  E-Mail-Benachrichtigung an jan.pravit@gmx.de einschalten. **Ohne diesen
  Schritt landen Anfragen nur im Dashboard und niemand erfährt davon.**

**WhatsApp-Knopf** auf `https://wa.me/491605968769` mit vorgeschriebenem
Text, damit der Besucher nicht vor einem leeren Feld sitzt.

**Einwilligung** als Pflichtfeld im Formular, mit Verweis auf die
Datenschutzerklärung.

**Bewegung.** Zurückhaltend und begründet:

- Eigene Kurve `cubic-bezier(0.23, 1, 0.32, 1)`, kein `ease-in`
- Alles unter der Oberfläche unter 300 ms
- Knöpfe `scale(0.97)` beim Drücken — sofortige Rückmeldung
- Nie aus `scale(0)` einblenden, nichts entsteht aus dem Nichts
- Hover-Effekte nur hinter `@media (hover: hover) and (pointer: fine)`
- `prefers-reduced-motion` respektieren

> **Erfahrung aus dem ersten Versuch:** Einblenden beim Scrollen per
> `IntersectionObserver` hat ganze Abschnitte unsichtbar gelassen, wenn das
> Skript nicht durchlief. Inhalt darf nie von einer Animation abhängen. Wenn
> eingeblendet wird, dann nur beim Laden per CSS-Animation mit `forwards` —
> die läuft garantiert zu Ende.

---

## Was noch fehlt

- **Fotos.** Für einen Personal Trainer ist ein echtes Bild der stärkste
  Vertrauensanker. Bis dahin klar markierte Bildplätze mit festen Maßen.
- **Steuernummer** fürs Impressum.
- **Werdegang und Lizenz** für „Über mich" — nichts davon erfinden.
- **Kundenstimmen** mit schriftlicher Freigabe.
- **Datenschutzerklärung prüfen lassen.** Das Gerüst ist keine geprüfte
  Fassung.

---

## Dateien

Bereits vorhanden:

```
landingpage/fonts/     Archivo, Public Sans, JetBrains Mono
                       als Variable Fonts, latin + latin-ext, 152 KB
landingpage/icons/     favicon.svg, apple-touch-icon.png
```

Geplant:

```
index.html · danke.html · impressum.html · datenschutz.html
styles.css · script.js
bilder/    Bildplätze
netlify.toml
LIESMICH.md   Anleitung: ablegen, Benachrichtigung einschalten, was ausfüllen
```
