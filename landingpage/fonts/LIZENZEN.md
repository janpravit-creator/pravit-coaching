# Schriftlizenzen

Alle drei Schriften stehen unter der **SIL Open Font License 1.1**. Sie dürfen
kostenlos verwendet, eingebettet und selbst gehostet werden, auch gewerblich.
Die einzige Auflage: Der Lizenzhinweis bleibt erhalten, und die Schriften
werden nicht für sich allein verkauft.

| Schrift | Urheber | Lizenz |
|---|---|---|
| Archivo | Omnibus-Type | SIL OFL 1.1 |
| Public Sans | US General Services Administration | SIL OFL 1.1 |
| JetBrains Mono | JetBrains s.r.o. | SIL OFL 1.1 |

## Warum die Dateien hier liegen und nicht per Google geladen werden

Bindet man Google Fonts über `fonts.googleapis.com` ein, wird bei jedem
Seitenaufruf die IP-Adresse des Besuchers an Google übertragen — ohne dass
der Besucher zustimmen konnte. Das Landgericht München I hat darin 2022 einen
Verstoß gegen die DSGVO gesehen (Urteil vom 20.01.2022, Az. 3 O 17493/20) und
Schadenersatz zugesprochen. Danach kam eine Welle von Abmahnschreiben.

Selbst gehostet stellt sich die Frage nicht: Es geht keine Anfrage an Google
hinaus. Deshalb liegen die Dateien im Projekt.

## Format

Variable Fonts im Format `woff2`, aufgeteilt nach `latin` und `latin-ext`.
Der Browser lädt nur den Zeichensatz, den er wirklich braucht. Zusammen
152 KB für drei Schriften über alle Schnitte hinweg.

Eingebunden werden sie über `schriften.css` — die Datei enthält die fertigen
`@font-face`-Regeln samt `unicode-range`.
