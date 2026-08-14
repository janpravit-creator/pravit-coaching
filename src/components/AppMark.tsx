/**
 * Das Markenzeichen: eine vereinfachte Hantelstange, schwarz-weiß.
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
      <rect x="72" y="132" width="64" height="248" rx="32" fill="#FFFFFF" />
      <rect x="376" y="132" width="64" height="248" rx="32" fill="#FFFFFF" />
      <rect x="96" y="236" width="320" height="40" rx="20" fill="#FFFFFF" />
    </svg>
  );
}
