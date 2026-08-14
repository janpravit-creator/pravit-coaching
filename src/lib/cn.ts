/** Fügt Klassennamen zusammen und wirft alles Falsche weg. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
