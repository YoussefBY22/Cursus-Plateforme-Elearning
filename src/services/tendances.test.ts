import { describe, expect, it } from "vitest";
import {
  chuteLaPlusForte,
  cleJour,
  comparerPeriodes,
  courbeAudience,
  derniersJours,
  detecterPics,
  ecartType,
  estEnPanne,
  etatJe,
  formaterMinutage,
  formaterVariation,
  joursDepuis,
  profilHoraire,
  profilJourSemaine,
  scoreDemande,
  serieJournaliere,
} from "./tendances";

/** Un jeudi, pour que les calculs de jour de semaine soient vérifiables. */
const JEUDI = new Date("2026-10-15T12:00:00Z");

describe("comparaison de périodes", () => {
  it("nomme le sens du mouvement au-delà du seuil de stabilité", () => {
    expect(comparerPeriodes(120, 100).sens).toBe("hausse");
    expect(comparerPeriodes(80, 100).sens).toBe("baisse");
    expect(comparerPeriodes(102, 100).sens).toBe("stable");
  });

  it("calcule l'écart et la part", () => {
    const v = comparerPeriodes(120, 100);
    expect(v.ecart).toBe(20);
    expect(v.part).toBeCloseTo(0.2, 5);
  });

  it("refuse l'infini quand la période précédente est vide", () => {
    const v = comparerPeriodes(7, 0);
    expect(v.part).toBeNull();
    expect(v.sens).toBe("hausse");
    expect(formaterVariation(v)).toBe("+7");
  });

  it("reste stable quand les deux périodes sont vides", () => {
    const v = comparerPeriodes(0, 0);
    expect(v.sens).toBe("stable");
    expect(formaterVariation(v)).toBe("—");
  });

  it("formate la variation à la française", () => {
    expect(formaterVariation(comparerPeriodes(125, 100))).toBe("+25 %");
    expect(formaterVariation(comparerPeriodes(75, 100))).toBe("−25 %");
    expect(formaterVariation(comparerPeriodes(100, 100))).toBe("=");
  });
});

describe("séries journalières", () => {
  it("construit une fenêtre close sur aujourd'hui, du plus ancien au plus récent", () => {
    const jours = derniersJours(7, JEUDI);
    expect(jours).toHaveLength(7);
    expect(jours[6].cle).toBe("2026-10-15");
    expect(jours[0].cle).toBe("2026-10-09");
  });

  it("compte lundi comme premier jour de la semaine", () => {
    const [dernier] = derniersJours(1, JEUDI);
    expect(dernier.jourSemaine).toBe(3); // jeudi
    expect(dernier.libelle).toBe("jeu. 15");
    expect(dernier.libelleLong).toBe("jeudi 15 octobre 2026");
  });

  it("met à zéro les jours sans activité", () => {
    const fenetre = derniersJours(3, JEUDI);
    const serie = serieJournaliere([{ jour: "2026-10-15", n: 4 }], fenetre);
    expect(serie.map((p) => p.valeur)).toEqual([0, 0, 4]);
  });

  it("réduit une date en clé de jour", () => {
    expect(cleJour(JEUDI)).toBe("2026-10-15");
  });
});

describe("pics", () => {
  const fenetre = derniersJours(10, JEUDI);

  it("repère le jour qui sort de l'ordinaire", () => {
    const serie = serieJournaliere(
      [
        ...fenetre.slice(0, 9).map((j) => ({ jour: j.cle, n: 2 })),
        { jour: fenetre[9].cle, n: 40 },
      ],
      fenetre
    );
    const pics = detecterPics(serie);
    expect(pics).toHaveLength(1);
    expect(pics[0].cle).toBe(fenetre[9].cle);
    expect(pics[0].valeur).toBe(40);
  });

  it("ne voit aucun pic dans une série plate", () => {
    const serie = serieJournaliere(
      fenetre.map((j) => ({ jour: j.cle, n: 5 })),
      fenetre
    );
    expect(detecterPics(serie)).toEqual([]);
  });

  it("ne prend pas un creux pour un pic", () => {
    const serie = serieJournaliere(
      fenetre.slice(0, 9).map((j) => ({ jour: j.cle, n: 10 })),
      fenetre
    );
    expect(detecterPics(serie).every((p) => p.valeur > 0)).toBe(true);
  });

  it("refuse de conclure sur une série trop courte", () => {
    expect(detecterPics(serieJournaliere([], derniersJours(2, JEUDI)))).toEqual([]);
  });

  it("calcule un écart-type, nul en dessous de deux valeurs", () => {
    expect(ecartType([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(ecartType([3])).toBe(0);
  });

  it("moyenne l'activité par jour de la semaine", () => {
    const fenetre14 = derniersJours(14, JEUDI);
    const serie = serieJournaliere(
      fenetre14.filter((j) => j.jourSemaine === 0).map((j) => ({ jour: j.cle, n: 10 })),
      fenetre14
    );
    const profil = profilJourSemaine(serie);
    expect(profil[0].libelle).toBe("lundi");
    expect(profil[0].moyenne).toBe(10);
    expect(profil[3].moyenne).toBe(0);
  });

  it("répartit des horodatages sur 24 heures", () => {
    const profil = profilHoraire([
      new Date("2026-10-15T09:30:00Z"),
      new Date("2026-10-15T09:45:00Z"),
      "2026-10-14T21:00:00Z",
      null,
      new Date("invalide"),
    ]);
    expect(profil).toHaveLength(24);
    expect(profil[9].n).toBe(2);
    expect(profil[21].n).toBe(1);
    expect(profil.reduce((s, h) => s + h.n, 0)).toBe(3);
  });
});

describe("décrochage dans une vidéo", () => {
  it("compte l'audience tranche par tranche", () => {
    // Trois apprenants : l'un va au bout, les deux autres s'arrêtent à la moitié.
    const courbe = courbeAudience(
      [
        [[0, 100]],
        [[0, 50]],
        [[0, 50]],
      ],
      100,
      4
    );
    expect(courbe).toHaveLength(4);
    expect(courbe[0].part).toBe(1);
    expect(courbe[2].apprenants).toBe(1);
    expect(courbe[3].part).toBeCloseTo(1 / 3, 5);
  });

  it("tient compte des segments non contigus", () => {
    const courbe = courbeAudience([[[0, 25], [75, 100]]], 100, 4);
    expect(courbe.map((t) => t.apprenants)).toEqual([1, 0, 0, 1]);
  });

  it("ne produit rien sans durée", () => {
    expect(courbeAudience([[[0, 10]]], 0)).toEqual([]);
  });

  it("désigne la chute la plus forte", () => {
    const courbe = courbeAudience(
      [
        [[0, 100]],
        [[0, 50]],
        [[0, 50]],
        [[0, 50]],
      ],
      100,
      4
    );
    const chute = chuteLaPlusForte(courbe);
    expect(chute?.index).toBe(2);
    expect(chute?.perte).toBeCloseTo(0.75, 5);
  });

  it("ne signale rien quand l'audience tient", () => {
    const courbe = courbeAudience([[[0, 100]], [[0, 100]]], 100, 4);
    expect(chuteLaPlusForte(courbe)).toBeNull();
  });

  it("formate un minutage lisible", () => {
    expect(formaterMinutage(425)).toBe("7 min 05");
    expect(formaterMinutage(0)).toBe("0 min 00");
  });
});

describe("santé d'une organisation", () => {
  it("distingue jamais démarrée et en décrochage", () => {
    expect(etatJe({ membres: 10, membresActifs: 0, joursDepuisActivite: null })).toBe("SANS_ACTIVITE");
    expect(etatJe({ membres: 10, membresActifs: 0, joursDepuisActivite: 45 })).toBe("EN_DECROCHAGE");
  });

  it("qualifie de ralentie une organisation où presque personne ne se forme", () => {
    expect(etatJe({ membres: 20, membresActifs: 2, joursDepuisActivite: 1 })).toBe("RALENTIE");
  });

  it("qualifie de ralentie une organisation silencieuse depuis deux semaines", () => {
    expect(etatJe({ membres: 10, membresActifs: 9, joursDepuisActivite: 16 })).toBe("RALENTIE");
  });

  it("reconnaît une organisation active", () => {
    expect(etatJe({ membres: 10, membresActifs: 6, joursDepuisActivite: 2 })).toBe("ACTIVE");
  });
});

describe("progressions en cours", () => {
  it("compte les jours écoulés", () => {
    expect(joursDepuis("2026-10-01T12:00:00Z", JEUDI)).toBe(14);
    expect(joursDepuis(null, JEUDI)).toBeNull();
    expect(joursDepuis("2026-12-01T12:00:00Z", JEUDI)).toBe(0);
  });

  it("repère une formation laissée de côté", () => {
    expect(estEnPanne({ statut: "EN_COURS", derniereSyncLe: "2026-09-20T12:00:00Z" }, 14, JEUDI)).toBe(true);
    expect(estEnPanne({ statut: "EN_COURS", derniereSyncLe: "2026-10-14T12:00:00Z" }, 14, JEUDI)).toBe(false);
  });

  it("ne considère jamais une formation terminée comme en panne", () => {
    expect(estEnPanne({ statut: "TERMINEE", derniereSyncLe: "2026-01-01T12:00:00Z" }, 14, JEUDI)).toBe(false);
  });
});

describe("demandes de formation", () => {
  it("classe d'abord sur les votes", () => {
    const recent = "2026-10-14T12:00:00Z";
    const a = scoreDemande({ votes: 12, jes: 1, creeLe: recent }, JEUDI);
    const b = scoreDemande({ votes: 3, jes: 1, creeLe: recent }, JEUDI);
    expect(a).toBeGreaterThan(b);
  });

  it("fait remonter un besoin partagé par plusieurs organisations", () => {
    const recent = "2026-10-14T12:00:00Z";
    const partagee = scoreDemande({ votes: 8, jes: 4, creeLe: recent }, JEUDI);
    const isolee = scoreDemande({ votes: 8, jes: 1, creeLe: recent }, JEUDI);
    expect(partagee).toBeGreaterThan(isolee);
  });

  it("fait décroître une demande qui traîne", () => {
    const fraiche = scoreDemande({ votes: 10, jes: 1, creeLe: "2026-10-14T12:00:00Z" }, JEUDI);
    const vieille = scoreDemande({ votes: 10, jes: 1, creeLe: "2026-04-15T12:00:00Z" }, JEUDI);
    expect(vieille).toBeLessThan(fraiche);
  });
});
