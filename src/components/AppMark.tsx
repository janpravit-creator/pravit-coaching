/**
 * Das Markenzeichen: eine Hantel mit gestaffelten Scheiben, schwarz-weiß.
 *
 * Pro Seite zwei eigenständige, vollständig separate Scheiben – die kleine
 * außen, die große innen, mit sichtbarer Lücke dazwischen, durch die die
 * Stange durchscheint. Bewusst nicht überlappend oder ineinander verschmolzen:
 * Zwei unterschiedlich große abgerundete Rechtecke, die sich nur teilweise
 * überlappen, erzeugen an der Nahtstelle eine kleine weiße Stufe/Ecke statt
 * einer glatten Kontur. Ganz getrennte Scheiben vermeiden das vollständig,
 * und sehen nebenbei realistischer aus – auf einer echten Hantel sieht man
 * die einzelnen Scheiben ja auch als eigene Kreise, nicht verschmolzen.
 *
 * Dieselben Formen wie das Home-Bildschirm-Icon (`scripts/make-icons.mjs`,
 * `public/icons/favicon.svg`) – hier als React-Komponente, damit Startbild-
 * schirm und Anmeldemaske exakt dasselbe Zeichen zeigen wie das Icon, statt
 * einer eigenen Nachbildung. Fest schwarz-weiß statt über Farbtoken, weil
 * ein Icon sich nicht mit dem Hell-/Dunkelmodus mitfärben soll – es ist
 * immer dasselbe Bild, so wie auf dem Home-Bildschirm auch.
 *
 * Ändert sich diese Form, müssen make-icons.mjs und favicon.svg von Hand
 * mitgezogen werden – sie werden aus unterschiedlichen Werkzeugen erzeugt
 * (Node-Skript mit Chromium bzw. reine SVG-Datei) und lassen sich nicht
 * automatisch aus dieser Komponente ableiten.
 */
export function AppMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="PRAVIT Coaching"
      className={className}
    >
      <rect width="512" height="512" rx="112" fill="#000000" />
      <rect x="112" y="242" width="288" height="28" rx="14" fill="#FFFFFF" />
      <rect x="100" y="166" width="44" height="180" rx="20" fill="#FFFFFF" />
      <rect x="52" y="206" width="40" height="100" rx="20" fill="#FFFFFF" />
      <rect x="368" y="166" width="44" height="180" rx="20" fill="#FFFFFF" />
      <rect x="420" y="206" width="40" height="100" rx="20" fill="#FFFFFF" />
    </svg>
  );
}
