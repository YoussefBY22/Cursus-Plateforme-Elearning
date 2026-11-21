import { describe, expect, it } from "vitest";
import {
  autoEvaluationVersNiveau,
  calculerGain,
  competencesPrioritaires,
  consolider,
  niveauxParDomaine,
  noteGenerale,
  palier,
  PONDERATIONS_DEFAUT,
} from "./competences";

describe("échelles", () => {
  it("auto-évaluation 1–10 → 0–99", () => {
    expect(autoEvaluationVersNiveau(10)).toBe(99);
    expect(autoEvaluationVersNiveau(5)).toBe(49.5);
    expect(autoEvaluationVersNiveau(null)).toBe(0);
  });
});

describe("calcul du gain", () => {
  it("progresse vers le niveau observé, à 60 % de l'écart", () => {
    // L0 = 30 ; quiz 80 % → 79,2 ; pas d'autre mesure. Δ = 49,2.
    const r = calculerGain(30, { quiz: 0.8 });
    // Plafond = 15 × (1 − 30/99 × 0,5) ≈ 12,7 → le plafond s'applique.
    expect(r.gainTotal).toBeCloseTo(12.7, 1);
    expect(r.gainApplique).toBeCloseTo(r.gainTotal * 0.8, 1);
    expect(r.gainEnAttente).toBeCloseTo(r.gainTotal * 0.2, 1);
    expect(r.niveauApres).toBeCloseTo(30 + r.gainApplique, 1);
  });

  it("petit écart : gain = 60 % de l'écart", () => {
    const r = calculerGain(60, { quiz: 0.7 }); // O = 69,3 ; Δ = 9,3
    expect(r.gainTotal).toBeCloseTo(5.6, 1);
  });

  it("se surnoter ne paie pas : réévaluation plafonnée à quiz + 20", () => {
    const honnete = calculerGain(30, { quiz: 0.4, reevaluation: 6 });
    const vantard = calculerGain(30, { quiz: 0.4, reevaluation: 10 });
    expect(vantard.detail.reevaluationPlafonnee).toBe(true);
    expect(vantard.detail.reevaluation).toBeCloseTo(39.6 + 20, 1);
    expect(vantard.gainTotal - honnete.gainTotal).toBeLessThan(3);
  });

  it("sans mesure objective, le plafond est divisé par deux", () => {
    const r = calculerGain(10, { reevaluation: 10 });
    expect(r.detail.sansMesureObjective).toBe(true);
    expect(r.gainTotal).toBeLessThanOrEqual(PONDERATIONS_DEFAUT.plafondGain / 2 + 0.01);
  });

  it("un mauvais résultat fait reculer, mais peu", () => {
    const r = calculerGain(80, { quiz: 0.2 });
    expect(r.gainTotal).toBeLessThan(0);
    expect(r.gainTotal).toBeGreaterThanOrEqual(-PONDERATIONS_DEFAUT.plafondRecul);
    expect(r.gainEnAttente).toBe(0);
  });

  it("ne dépasse jamais 99", () => {
    const r = calculerGain(97, { quiz: 1, formateur: 10, reevaluation: 10 });
    expect(r.niveauApres).toBeLessThanOrEqual(99);
  });

  it("renormalise les poids quand une mesure manque", () => {
    const r = calculerGain(40, { quiz: 0.5, formateur: 7 });
    expect(r.detail.poids.quiz + r.detail.poids.formateur).toBeCloseTo(1, 2);
    expect(r.detail.poids.reevaluation).toBe(0);
  });

  it("aucune mesure : aucun changement", () => {
    const r = calculerGain(42, {});
    expect(r.gainTotal).toBe(0);
    expect(r.niveauApres).toBe(42);
  });

  it("même méthode pour l'externe (formateur + réévaluation)", () => {
    const r = calculerGain(35, { formateur: 7, reevaluation: 7 });
    expect(r.niveauObserve).toBeCloseTo(69.3, 1);
    expect(r.gainTotal).toBeGreaterThan(0);
  });
});

describe("consolidation à froid", () => {
  it("acquiert la part provisoire si mise en pratique ≥ 3", () => {
    expect(consolider(2.5, 4)).toBe(2.5);
    expect(consolider(2.5, 3)).toBe(2.5);
  });
  it("l'abandonne sinon", () => {
    expect(consolider(2.5, 2)).toBe(0);
  });
});

describe("agrégats", () => {
  it("niveau d'un domaine = moyenne des compétences mesurées", () => {
    const r = niveauxParDomaine([
      { competenceId: "a", domaineId: "mkt", niveau: 40 },
      { competenceId: "b", domaineId: "mkt", niveau: 60 },
      { competenceId: "c", domaineId: "rh", niveau: 70 },
    ]);
    expect(r.mkt).toEqual({ niveau: 50, mesurees: 2 });
    expect(r.rh.niveau).toBe(70);
  });
  it("note générale tirée vers les points forts", () => {
    const n = noteGenerale([80, 40]);
    expect(n).toBeGreaterThan(60);
    expect(n).toBeLessThan(80);
    expect(noteGenerale([])).toBe(0);
  });
  it("paliers", () => {
    expect(palier(90).code).toBe("EXPERT");
    expect(palier(0).code).toBe("NON_EVALUE");
  });
  it("priorités : jamais mesurées puis plus faibles", () => {
    const p = competencesPrioritaires([{ niveau: 50 }, { niveau: null }, { niveau: 20 }], 2);
    expect(p).toEqual([{ niveau: null }, { niveau: 20 }]);
  });
});
