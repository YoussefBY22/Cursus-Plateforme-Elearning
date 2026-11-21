/**
 * Couleurs des graphiques — toujours dérivées des variables CSS du thème,
 * pour rester lisibles en clair comme en sombre.
 */

function luminance(hex: string): number | null {
  const v = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v)) return null;
  const n = v.length === 3 ? v.split("").map((x) => x + x).join("") : v;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Couleur de marque (domaine, organisation) rendue lisible sur les deux thèmes : une
 * teinte très sombre (bleu nuit) disparaîtrait sur le fond sombre, on la
 * mélange alors à la couleur du texte — elle s'éclaircit en sombre et reste
 * sombre en clair.
 */
export function couleurLisible(hex: string | null | undefined): string {
  if (!hex) return "var(--turquoise)";
  const l = luminance(hex);
  if (l === null) return "var(--turquoise)";
  if (l < 0.06) return `color-mix(in oklab, ${hex} 55%, var(--foreground))`;
  return hex;
}

/** Fond d'une case de carte de chaleur (intensité 0–1). */
export function fondChaleur(intensite: number): string {
  const pct = Math.round(8 + Math.min(1, Math.max(0, intensite)) * 82);
  return `color-mix(in oklab, var(--turquoise) ${pct}%, var(--muted))`;
}

/** Texte posé sur une case : clair sur les cases foncées (inversé en thème sombre). */
export function texteChaleur(intensite: number): string {
  return intensite >= 0.6 ? "var(--card)" : "var(--foreground)";
}
