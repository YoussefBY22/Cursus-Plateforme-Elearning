import { describe, expect, it } from "vitest";
import {
  aUneMesure,
  avecJe,
  bilanCloture,
  classesPalier,
  codeCompetenceJe,
  csvMultiSections,
  dateHeureCsv,
  estTypeExportRh,
  etatAutoEvaluation,
  evaluationsSaisies,
  matriceMembresDomaines,
  nettoyerEvaluations,
  niveauApres,
  nomFichierExportRh,
  origineCompetence,
  progressionMoyenneGlobale,
  progressionParDomaine,
  segmentCode,
  valeurAutoEvalCsv,
  type NiveauMembre,
  type ParticipationResume,
} from "./rh";

const n = (utilisateurId: string, competenceId: string, domaineId: string, niveau: number, niveauInitial = niveau): NiveauMembre => ({
  utilisateurId,
  competenceId,
  domaineId,
  niveau,
  niveauInitial,
});

describe("matrice membres × domaines", () => {
  const niveaux = [
    n("a", "c1", "devco", 40, 30),
    n("a", "c2", "devco", 61, 50),
    n("a", "c3", "rh", 90, 80),
    n("b", "c1", "devco", 20, 20),
  ];

  it("moyenne des compétences mesurées, avec palier", () => {
    const m = matriceMembresDomaines(niveaux);
    expect(m.get("a")?.get("devco")).toMatchObject({ niveau: 51, mesurees: 2, palier: "OPERATIONNEL" });
    expect(m.get("a")?.get("rh")).toMatchObject({ niveau: 90, palier: "EXPERT" });
    expect(m.get("b")?.get("devco")?.palier).toBe("DECOUVERTE");
    // Domaine jamais mesuré : pas de case (≠ niveau 0).
    expect(m.get("b")?.has("rh")).toBe(false);
  });

  it("progression moyenne par domaine", () => {
    const p = progressionParDomaine(niveaux);
    expect(p.get("devco")).toMatchObject({ membres: 2, mesures: 3, progressionMoyenne: 7 });
    expect(p.get("rh")?.progressionMoyenne).toBe(10);
    expect(progressionMoyenneGlobale(niveaux)).toBe(7.8);
    expect(progressionMoyenneGlobale([])).toBeNull();
  });

  it("chaque palier a sa couleur de thème, jamais une couleur en dur", () => {
    for (const code of ["NON_EVALUE", "DECOUVERTE", "INITIE", "OPERATIONNEL", "CONFIRME", "EXPERT"]) {
      expect(classesPalier(code)).not.toMatch(/#/);
    }
    expect(classesPalier("NON_EVALUE")).toContain("border-dashed");
  });
});

describe("référentiel adapté", () => {
  it("distingue Plateforme, reprise, adaptée et propre", () => {
    expect(origineCompetence({ jeId: null, sourceId: null, nom: "Négociation" }, null)).toBe("COMMUN");
    expect(origineCompetence({ jeId: "je", sourceId: "s", nom: " Négociation " }, "négociation")).toBe("REPRISE");
    expect(origineCompetence({ jeId: "je", sourceId: "s", nom: "Négociation tarifaire" }, "Négociation")).toBe("ADAPTEE");
    expect(origineCompetence({ jeId: "je", sourceId: null, nom: "Pitch IT" }, null)).toBe("PROPRE");
  });

  it("code <SIGLE>_<SLUG> unique pour l'organisation", () => {
    expect(segmentCode("Négociation tarifaire des missions")).toBe("NEGOCIATION_TARIFAIRE_DES_MISSIONS");
    expect(codeCompetenceJe("Aurora", "Négo tarif", [])).toBe("AURORA_NEGO_TARIF");
    expect(codeCompetenceJe("Aurora", "Négo tarif", ["AURORA_NEGO_TARIF", "AURORA_NEGO_TARIF_2"])).toBe(
      "AURORA_NEGO_TARIF_3"
    );
    expect(codeCompetenceJe("", "!!!", [])).toBe("ORG_COMPETENCE");
  });
});

describe("participations aux formations externes", () => {
  it("état d'une auto-évaluation", () => {
    expect(etatAutoEvaluation({ autoEvalId: null, termineeLe: null, demandee: false })).toBe("NON_DEMANDEE");
    expect(etatAutoEvaluation({ autoEvalId: null, termineeLe: null, demandee: true })).toBe("DEMANDEE");
    expect(etatAutoEvaluation({ autoEvalId: "x", termineeLe: null, demandee: true })).toBe("EN_COURS");
    expect(etatAutoEvaluation({ autoEvalId: "x", termineeLe: new Date(), demandee: false })).toBe("TERMINEE");
  });

  const comps = ["c1", "c2"];
  const p = (o: Partial<ParticipationResume>): ParticipationResume => ({
    initiale: "NON_DEMANDEE",
    finale: "NON_DEMANDEE",
    evaluationFormateur: {},
    scoreTest: null,
    ...o,
  });

  it("une mesure = test, auto-éval finale ou au moins une note du formateur", () => {
    expect(aUneMesure(p({}), comps)).toBe(false);
    expect(aUneMesure(p({ scoreTest: 0 }), comps)).toBe(true);
    expect(aUneMesure(p({ finale: "TERMINEE" }), comps)).toBe(true);
    expect(aUneMesure(p({ evaluationFormateur: { c2: 7 } }), comps)).toBe(true);
    // Note sur une compétence hors formation : ignorée.
    expect(aUneMesure(p({ evaluationFormateur: { autre: 7 } }), comps)).toBe(false);
    expect(evaluationsSaisies({ c1: 4, c2: 11 }, comps)).toBe(1);
  });

  it("clôture refusée sans aucune mesure, avertissements sinon", () => {
    expect(bilanCloture([p({}), p({})], comps).possible).toBe(false);
    expect(bilanCloture([], comps).possible).toBe(false);
    const b = bilanCloture(
      [p({ initiale: "TERMINEE", finale: "TERMINEE", evaluationFormateur: { c1: 5, c2: 6 } }), p({ scoreTest: 70 }), p({})],
      comps
    );
    expect(b.possible).toBe(true);
    expect(b.sansDeuxAutoEvals).toBe(2);
    expect(b.evaluationsIncompletes).toBe(2);
    expect(b.sansMesure).toBe(1);
    expect(b.avertissements).toHaveLength(3);
  });

  it("nettoie la grille saisie", () => {
    const r = nettoyerEvaluations(
      {
        p1: { notes: { c1: 12, c2: 3.4, intrus: 5 }, scoreTest: 140 },
        p2: { notes: { c1: null }, scoreTest: null },
        horsFormation: { notes: { c1: 5 }, scoreTest: 50 },
      },
      ["p1", "p2"],
      comps
    );
    expect(r).toEqual({ p1: { notes: { c1: 10, c2: 3 }, scoreTest: 100 }, p2: { notes: {}, scoreTest: null } });
    expect(niveauApres(95, 8)).toBe(99);
    expect(niveauApres(40, -3.25)).toBe(36.8);
  });
});

describe("liens", () => {
  it("garde l'organisation consultée par le super admin", () => {
    expect(avecJe("/mon-organisation?onglet=membres", null)).toBe("/mon-organisation?onglet=membres");
    expect(avecJe("/mon-organisation?onglet=membres", "abc")).toBe("/mon-organisation?onglet=membres&je=abc");
    expect(avecJe("/mon-organisation/formations-externes/x#grille", "a b")).toBe("/mon-organisation/formations-externes/x?je=a%20b#grille");
  });
});

describe("exports CSV", () => {
  it("types et noms de fichiers", () => {
    expect(estTypeExportRh("niveaux")).toBe(true);
    expect(estTypeExportRh("../etc")).toBe(false);
    const d = new Date("2026-10-07T10:00:00Z");
    expect(nomFichierExportRh("niveaux", "aurora", d)).toBe("aurora-niveaux-2026-10-07.csv");
    expect(nomFichierExportRh("tout", "aurora", d)).toBe("aurora-archive-2026-10-07.csv");
  });

  it("archive multi-sections : un seul BOM, sections séparées", () => {
    const csv = csvMultiSections([
      { titre: "Membres", table: { entetes: ["Nom", "Poste"], lignes: [["Ben Ali, Yasmine", "Chargée"]] } },
      { titre: "Niveaux", table: { entetes: ["Membre"], lignes: [] } },
    ]);
    expect(csv.startsWith("﻿# Membres\r\nNom,Poste\r\n")).toBe(true);
    expect(csv.match(/﻿/g)).toHaveLength(1);
    expect(csv).toContain('"Ben Ali, Yasmine"');
    expect(csv).toContain("\r\n\r\n# Niveaux\r\nMembre");
  });

  it("date et heure pour tableur", () => {
    expect(dateHeureCsv(new Date("2026-10-07T17:14:07.535Z"))).toBe("2026-10-07 17:14");
    expect(dateHeureCsv(null)).toBe("");
    expect(dateHeureCsv("pas une date")).toBe("");
  });

  it("valeur d'auto-évaluation lisible", () => {
    expect(valeurAutoEvalCsv(undefined)).toBe("");
    expect(valeurAutoEvalCsv({ valeur: 7, inconnu: false, expire: false })).toBe(7);
    expect(valeurAutoEvalCsv({ valeur: null, inconnu: true, expire: false })).toBe("Je ne connais pas");
    expect(valeurAutoEvalCsv({ valeur: null, inconnu: false, expire: true })).toBe("Temps écoulé");
  });
});
