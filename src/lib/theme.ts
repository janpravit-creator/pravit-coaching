export type ThemePreference = 'system' | 'hell' | 'dunkel';

const KEY = 'pravit_theme';

export function gespeichertesTheme(): ThemePreference {
  const raw = localStorage.getItem(KEY);
  return raw === 'hell' || raw === 'dunkel' || raw === 'system' ? raw : 'system';
}

export function setzeTheme(theme: ThemePreference): void {
  localStorage.setItem(KEY, theme);
  wendeAn(theme);
}

/**
 * Setzt das Farbschema am Wurzelelement.
 * Bei „system" wird die Systemeinstellung ausgelesen, statt das Attribut zu
 * entfernen – so steht der Wert für die Adressleisten-Farbe unten bereit.
 */
export function wendeAn(theme: ThemePreference = gespeichertesTheme()): void {
  const root = document.documentElement;
  const dunkel =
    theme === 'dunkel' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.dataset['theme'] = dunkel ? 'dark' : 'light';

  const farbe = getComputedStyle(root).getPropertyValue('--c-page').trim();
  for (const tag of document.querySelectorAll('meta[name="theme-color"]')) {
    tag.setAttribute('content', farbe);
  }
}

/** Folgt der Systemeinstellung, solange „system" gewählt ist. */
export function beobachteSystemTheme(): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (gespeichertesTheme() === 'system') wendeAn('system');
  };
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
