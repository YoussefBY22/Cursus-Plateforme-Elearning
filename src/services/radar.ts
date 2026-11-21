/**
 * Géométrie du radar « style FIFA » — logique pure et testée.
 *
 * Le composant `components/competences/radar.tsx` ne fait que dessiner ce que
 * ces fonctions calculent : position des sommets, polygones, anneaux de
 * grille, placement des libellés (hors du polygone, sans chevauchement),
 * interpolation pour les animations, tracé des mini-courbes d'historique.
 *
 * Repère : coordonnées en pixels, origine en haut à gauche, y vers le bas.
 * Le premier axe pointe vers le haut, les suivants tournent dans le sens des
 * aiguilles d'une montre.
 */

export const NOTE_MAX = 99;
export const ANNEAUX = [25, 50, 75, 99] as const;

export type Point = { x: number; y: number };

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Angle (radians) de l'axe i sur n, le premier vers le haut. */
export function angleAxe(i: number, n: number): number {
  return -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
}

/** Point à la distance r du centre sur l'axe i. */
export function pointAxe(i: number, n: number, r: number, centre: Point): Point {
  const a = angleAxe(i, n);
  return { x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) };
}

/** Sommets d'un polygone de valeurs 0–99 (null = non évalué = 0). */
export function pointsPolygone(
  valeurs: readonly (number | null | undefined)[],
  rayon: number,
  centre: Point,
  max = NOTE_MAX
): Point[] {
  const n = valeurs.length;
  return valeurs.map((v, i) => pointAxe(i, n, (borner(v ?? 0, 0, max) / max) * rayon, centre));
}

/** Attribut `points` d'un <polygon> SVG. */
export function attributPoints(points: readonly Point[]): string {
  return points.map((p) => `${arrondi(p.x)},${arrondi(p.y)}`).join(" ");
}

const arrondi = (v: number) => Math.round(v * 100) / 100;

/** Polygones des anneaux de grille (25, 50, 75, 99). */
export function anneauxGrille(n: number, rayon: number, centre: Point, niveaux: readonly number[] = ANNEAUX): { niveau: number; points: Point[] }[] {
  return niveaux.map((niveau) => ({
    niveau,
    points: pointsPolygone(Array.from({ length: n }, () => niveau), rayon, centre),
  }));
}

/* ------------------------------------------------------------------ */
/* Dimensions                                                          */
/* ------------------------------------------------------------------ */

export type GeometrieRadar = {
  largeur: number;
  hauteur: number;
  centre: Point;
  rayon: number;
  /** Place réservée de chaque côté pour les libellés latéraux. */
  margeH: number;
  /** Place réservée en haut et en bas pour les libellés du haut et du bas. */
  margeV: number;
  /** Largeur maximale d'un libellé latéral. */
  largeurLibelle: number;
};

/**
 * Dimensions du radar pour une largeur disponible. Les marges suivent la
 * largeur (les libellés gardent une taille de police lisible sur mobile,
 * c'est donc le rayon qui se réduit).
 */
export function geometrieRadar(largeur: number, options: { compact?: boolean } = {}): GeometrieRadar {
  const l = Math.max(220, largeur);
  const margeH = Math.round(borner(l * 0.22, 66, options.compact ? 92 : 112));
  const margeV = options.compact ? 34 : 42;
  const rayon = Math.max(60, l / 2 - margeH);
  return {
    largeur: l,
    hauteur: Math.round(2 * rayon + 2 * margeV),
    centre: { x: l / 2, y: margeV + rayon },
    rayon,
    margeH,
    margeV,
    largeurLibelle: margeH - 10,
  };
}

/* ------------------------------------------------------------------ */
/* Libellés                                                            */
/* ------------------------------------------------------------------ */

export type Boite = { largeur: number; hauteur: number; lignes: string[] };

/**
 * Estimation de la boîte d'un libellé (Montserrat ≈ 0,6 em par caractère),
 * avec retour à la ligne aux espaces dans la largeur maximale.
 */
export function estimerBoite(texte: string, options: { taillePolice?: number; largeurMax: number; interligne?: number }): Boite {
  const fs = options.taillePolice ?? 12;
  const parCar = fs * 0.6;
  const interligne = options.interligne ?? fs * 1.25;
  const maxCar = Math.max(4, Math.floor(options.largeurMax / parCar));
  const mots = texte.trim().split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let courante = "";
  for (const m of mots) {
    const essai = courante ? `${courante} ${m}` : m;
    if (essai.length <= maxCar || !courante) courante = essai;
    else {
      lignes.push(courante);
      courante = m;
    }
  }
  if (courante) lignes.push(courante);
  if (!lignes.length) lignes.push("");
  const plusLongue = Math.max(...lignes.map((l) => l.length));
  return {
    largeur: Math.min(options.largeurMax, Math.ceil(plusLongue * parCar)),
    hauteur: Math.ceil(lignes.length * interligne),
    lignes,
  };
}

export type Alignement = "debut" | "milieu" | "fin";

export type PlacementLibelle = {
  /** Coin haut-gauche de la boîte. */
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  alignement: Alignement;
};

/**
 * Place les libellés hors du polygone : au-delà de l'anneau 99, alignés selon
 * la direction de l'axe (à droite → aligné à gauche, etc.), puis écartés
 * verticalement s'ils se chevauchent et ramenés dans le cadre.
 */
export function placerLibelles(
  boites: readonly { largeur: number; hauteur: number }[],
  g: Pick<GeometrieRadar, "largeur" | "hauteur" | "centre" | "rayon">,
  ecart = 12
): PlacementLibelle[] {
  const n = boites.length;
  const places: PlacementLibelle[] = boites.map((b, i) => {
    const a = angleAxe(i, n);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const ancre = { x: g.centre.x + (g.rayon + ecart) * cos, y: g.centre.y + (g.rayon + ecart) * sin };
    const alignement: Alignement = Math.abs(cos) < 0.26 ? "milieu" : cos > 0 ? "debut" : "fin";
    const x = alignement === "milieu" ? ancre.x - b.largeur / 2 : alignement === "debut" ? ancre.x : ancre.x - b.largeur;
    // Verticalement : au-dessus du point en haut, en dessous en bas, centré sur les côtés.
    const y = sin < -0.5 ? ancre.y - b.hauteur : sin > 0.5 ? ancre.y : ancre.y - b.hauteur / 2 + sin * (b.hauteur / 2);
    return { x, y, largeur: b.largeur, hauteur: b.hauteur, alignement };
  });

  // Dans le cadre horizontalement.
  for (const p of places) p.x = borner(p.x, 0, Math.max(0, g.largeur - p.largeur));

  // Résolution des chevauchements par relaxation : deux boîtes qui se
  // recouvrent s'écartent verticalement de la moitié du recouvrement chacune,
  // puis tout est ramené dans le cadre. Quelques dizaines de passes suffisent
  // de 3 à 10 axes.
  const espace = 3;
  const dansLeCadre = (p: PlacementLibelle) => {
    p.y = borner(p.y, 0, Math.max(0, g.hauteur - p.hauteur));
  };
  places.forEach(dansLeCadre);
  for (let passe = 0; passe < 60; passe++) {
    let bouge = false;
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const a = places[i];
        const b = places[j];
        if (!chevauche(a, b, espace)) continue;
        const [haut, bas] = a.y + a.hauteur / 2 <= b.y + b.hauteur / 2 ? [a, b] : [b, a];
        const recouvrement = haut.y + haut.hauteur + espace - bas.y;
        if (recouvrement <= 0) continue;
        haut.y -= recouvrement / 2 + 0.5;
        bas.y += recouvrement / 2 + 0.5;
        dansLeCadre(haut);
        dansLeCadre(bas);
        bouge = true;
      }
    }
    if (!bouge) break;
  }
  return places;
}

/** Deux boîtes se recouvrent-elles (avec une marge) ? */
export function chevauche(a: PlacementLibelle, b: PlacementLibelle, marge = 0): boolean {
  return (
    a.x < b.x + b.largeur + marge &&
    b.x < a.x + a.largeur + marge &&
    a.y < b.y + b.hauteur + marge &&
    b.y < a.y + a.hauteur + marge
  );
}

/* ------------------------------------------------------------------ */
/* Animation                                                           */
/* ------------------------------------------------------------------ */

/** Sortie douce (cubique) : rapide au départ, posée à l'arrivée. */
export function adoucir(t: number): number {
  const x = borner(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

/** Interpolation de deux séries de valeurs (null = 0), pour les transitions. */
export function interpoler(
  de: readonly (number | null | undefined)[],
  vers: readonly (number | null | undefined)[],
  t: number
): number[] {
  const k = borner(t, 0, 1);
  return vers.map((v, i) => {
    const a = de[i] ?? 0;
    const b = v ?? 0;
    return a + (b - a) * k;
  });
}

/* ------------------------------------------------------------------ */
/* Mini-courbe d'historique                                            */
/* ------------------------------------------------------------------ */

export type Sparkline = { ligne: string; aire: string; points: Point[] };

/**
 * Tracé d'une mini-courbe des niveaux successifs (échelle 0–99 fixe : deux
 * courbes côte à côte restent comparables). Un seul point donne un plateau.
 */
export function tracerSparkline(
  valeurs: readonly number[],
  largeur: number,
  hauteur: number,
  options: { min?: number; max?: number; marge?: number } = {}
): Sparkline {
  const min = options.min ?? 0;
  const max = options.max ?? NOTE_MAX;
  const m = options.marge ?? 3;
  if (!valeurs.length) return { ligne: "", aire: "", points: [] };
  const serie = valeurs.length === 1 ? [valeurs[0], valeurs[0]] : [...valeurs];
  const pas = (largeur - 2 * m) / (serie.length - 1);
  const y = (v: number) => m + (1 - (borner(v, min, max) - min) / Math.max(1, max - min)) * (hauteur - 2 * m);
  const points = serie.map((v, i) => ({ x: m + i * pas, y: y(v) }));
  const ligne = points.map((p, i) => `${i ? "L" : "M"}${arrondi(p.x)} ${arrondi(p.y)}`).join(" ");
  const aire = `${ligne} L${arrondi(points[points.length - 1].x)} ${hauteur} L${arrondi(points[0].x)} ${hauteur} Z`;
  return { ligne, aire, points };
}

/* ------------------------------------------------------------------ */
/* Abréviations de la carte joueur                                     */
/* ------------------------------------------------------------------ */

const CONNUES: Record<string, string> = {
  MARKETING: "MKT",
  MANAGEMENT: "MGT",
  DEVCO: "DEV",
  FINANCE: "FIN",
  JURIDIQUE: "JUR",
  DIGITAL: "DIG",
  RSE: "RSE",
  RH: "RH",
  QUALITE: "QUA",
  COMMUNICATION: "COM",
};

/**
 * Abréviations à trois lettres, uniques, à la manière des statistiques d'une
 * carte FIFA (« MKT 64 »). Les codes connus ont une forme consacrée ; les
 * autres prennent l'initiale et les consonnes suivantes.
 */
export function abreviationsDomaines(codes: readonly string[]): string[] {
  const prises = new Set<string>();
  return codes.map((code) => {
    const brut = code
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const candidats: string[] = [];
    if (CONNUES[brut]) candidats.push(CONNUES[brut]);
    if (brut.length <= 3) candidats.push(brut);
    const consonnes = brut[0] + brut.slice(1).replace(/[AEIOUY]/g, "");
    candidats.push(consonnes.slice(0, 3), brut.slice(0, 3));
    for (let i = 3; i < brut.length; i++) candidats.push(brut.slice(0, 2) + brut[i]);
    const choisi = candidats.find((c) => c.length > 0 && !prises.has(c)) ?? `${brut.slice(0, 2)}${prises.size}`;
    prises.add(choisi);
    return choisi;
  });
}

/** « Marketing & communication » → « Marketing » (libellé court d'un axe). */
export function libelleCourt(nom: string): string {
  const coupe = nom.split(/\s+(?:&|et)\s+/)[0]?.trim();
  return coupe && coupe.length >= 3 ? coupe : nom;
}
