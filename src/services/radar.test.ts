import { describe, expect, it } from "vitest";
import {
  abreviationsDomaines,
  adoucir,
  anneauxGrille,
  angleAxe,
  attributPoints,
  chevauche,
  estimerBoite,
  geometrieRadar,
  interpoler,
  libelleCourt,
  placerLibelles,
  pointAxe,
  pointsPolygone,
  tracerSparkline,
} from "./radar";

const centre = { x: 100, y: 100 };

describe("géométrie des axes", () => {
  it("place le premier axe en haut et tourne dans le sens horaire", () => {
    expect(angleAxe(0, 4)).toBeCloseTo(-Math.PI / 2);
    const haut = pointAxe(0, 4, 50, centre);
    expect(haut.x).toBeCloseTo(100);
    expect(haut.y).toBeCloseTo(50);
    const droite = pointAxe(1, 4, 50, centre);
    expect(droite.x).toBeCloseTo(150);
    expect(droite.y).toBeCloseTo(100);
  });

  it("met une valeur nulle au centre et 99 sur l'anneau extérieur", () => {
    const pts = pointsPolygone([null, 99, 49.5], 90, centre);
    expect(pts[0]).toEqual({ x: 100, y: 100 });
    const d1 = Math.hypot(pts[1].x - 100, pts[1].y - 100);
    const d2 = Math.hypot(pts[2].x - 100, pts[2].y - 100);
    expect(d1).toBeCloseTo(90);
    expect(d2).toBeCloseTo(45);
  });

  it("borne les valeurs hors échelle", () => {
    const [p] = pointsPolygone([150], 90, centre);
    expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(90);
    const [q] = pointsPolygone([-5], 90, centre);
    expect(q).toEqual({ x: 100, y: 100 });
  });

  it("produit quatre anneaux (25, 50, 75, 99) d'autant de sommets que d'axes", () => {
    const anneaux = anneauxGrille(6, 90, centre);
    expect(anneaux.map((a) => a.niveau)).toEqual([25, 50, 75, 99]);
    expect(anneaux.every((a) => a.points.length === 6)).toBe(true);
  });

  it("formate l'attribut points", () => {
    expect(attributPoints([{ x: 1.234, y: 2 }, { x: 3, y: 4.5678 }])).toBe("1.23,2 3,4.57");
  });
});

describe("dimensions", () => {
  it("garde un rayon utile même à 320 px et centre le radar", () => {
    const g = geometrieRadar(320);
    expect(g.rayon).toBeGreaterThan(80);
    expect(g.centre.x).toBe(160);
    expect(g.hauteur).toBe(Math.round(2 * g.rayon + 2 * g.margeV));
  });
});

describe("libellés", () => {
  it("retourne à la ligne dans la largeur maximale", () => {
    const b = estimerBoite("Développement commercial", { taillePolice: 12, largeurMax: 90 });
    expect(b.lignes).toEqual(["Développement", "commercial"]);
    expect(b.largeur).toBeLessThanOrEqual(90);
    expect(b.hauteur).toBe(30);
  });

  const noms = [
    "Développement commercial",
    "Marketing",
    "Management",
    "Finance",
    "RSE",
    "Juridique",
    "Digital",
    "Ressources humaines",
    "Qualité",
    "Événementiel",
  ];

  for (const largeur of [320, 375, 560]) {
    for (let n = 3; n <= 10; n++) {
      it(`ne superpose aucun libellé et reste dans le cadre (${n} axes, ${largeur} px)`, () => {
        const g = geometrieRadar(largeur);
        const boites = noms.slice(0, n).map((t, i) =>
          estimerBoite(t, { taillePolice: 12, largeurMax: Math.abs(Math.cos(angleAxe(i, n))) < 0.26 ? 150 : g.largeurLibelle })
        );
        const places = placerLibelles(boites, g);
        for (let i = 0; i < n; i++) {
          const p = places[i];
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x + p.largeur).toBeLessThanOrEqual(g.largeur + 0.01);
          expect(p.y + p.hauteur).toBeLessThanOrEqual(g.hauteur + 0.01);
          for (let j = i + 1; j < n; j++) expect(chevauche(places[i], places[j])).toBe(false);
        }
      });
    }
  }

  it("aligne selon la direction de l'axe", () => {
    const g = geometrieRadar(400);
    const places = placerLibelles(
      [0, 1, 2, 3].map(() => ({ largeur: 40, hauteur: 15 })),
      g
    );
    expect(places.map((p) => p.alignement)).toEqual(["milieu", "debut", "milieu", "fin"]);
    // Le libellé du haut est au-dessus de l'anneau 99, celui du bas en dessous.
    expect(places[0].y + places[0].hauteur).toBeLessThanOrEqual(g.centre.y - g.rayon);
    expect(places[2].y).toBeGreaterThanOrEqual(g.centre.y + g.rayon);
  });
});

describe("animation", () => {
  it("adoucit entre 0 et 1", () => {
    expect(adoucir(0)).toBe(0);
    expect(adoucir(1)).toBe(1);
    expect(adoucir(0.5)).toBeGreaterThan(0.5);
    expect(adoucir(2)).toBe(1);
  });

  it("interpole en traitant null comme 0", () => {
    expect(interpoler([0, null, 50], [60, 40, null], 0.5)).toEqual([30, 20, 25]);
    expect(interpoler([], [10, 20], 1)).toEqual([10, 20]);
  });
});

describe("sparkline", () => {
  it("trace sur une échelle fixe 0–99", () => {
    const s = tracerSparkline([0, 99], 100, 20, { marge: 0 });
    expect(s.points[0]).toEqual({ x: 0, y: 20 });
    expect(s.points[1]).toEqual({ x: 100, y: 0 });
    expect(s.ligne.startsWith("M0 20")).toBe(true);
    expect(s.aire.endsWith("Z")).toBe(true);
  });

  it("dessine un plateau pour un seul point et rien pour une série vide", () => {
    expect(tracerSparkline([50], 80, 20).points).toHaveLength(2);
    expect(tracerSparkline([], 80, 20).ligne).toBe("");
  });
});

describe("abréviations", () => {
  it("utilise les formes consacrées et reste unique", () => {
    const codes = ["DEVCO", "MARKETING", "MANAGEMENT", "FINANCE", "RSE", "JURIDIQUE", "DIGITAL", "RH"];
    const a = abreviationsDomaines(codes);
    expect(a).toEqual(["DEV", "MKT", "MGT", "FIN", "RSE", "JUR", "DIG", "RH"]);
    expect(new Set(abreviationsDomaines(["DATA", "DATAVIZ", "DESIGN", "DESSIN"])).size).toBe(4);
  });

  it("raccourcit un nom de domaine composé", () => {
    expect(libelleCourt("Marketing & communication")).toBe("Marketing");
    expect(libelleCourt("Développement commercial")).toBe("Développement commercial");
  });
});
