import { describe, expect, it } from "vitest";
import {
  bilanReponses,
  cheminRetourSur,
  dureeMaxMinutes,
  etapeExterne,
  fractionRestante,
  libelleQuestion,
  lireContexte,
  niveauDeclare,
  reponseExpiree,
  secondesRestantes,
  toucheVersReponse,
} from "./auto-evaluation";

describe("chemin de retour", () => {
  it("n'accepte que des chemins internes", () => {
    expect(cheminRetourSur("/competences/externe/abc")).toBe("/competences/externe/abc");
    expect(cheminRetourSur("/formations/x?etape=2")).toBe("/formations/x?etape=2");
    expect(cheminRetourSur("//evil.example")).toBeNull();
    expect(cheminRetourSur("/\\evil.example")).toBeNull();
    expect(cheminRetourSur("https://evil.example")).toBeNull();
    expect(cheminRetourSur("competences")).toBeNull();
    expect(cheminRetourSur("/a\nb")).toBeNull();
    expect(cheminRetourSur(undefined)).toBeNull();
    expect(cheminRetourSur(["/x"])).toBeNull();
  });
});

describe("clavier", () => {
  it("traduit les raccourcis", () => {
    expect(toucheVersReponse("1")).toBe(1);
    expect(toucheVersReponse("9")).toBe(9);
    expect(toucheVersReponse("0")).toBe(10);
    expect(toucheVersReponse("n")).toBe("inconnu");
    expect(toucheVersReponse("N")).toBe("inconnu");
    expect(toucheVersReponse("a")).toBeNull();
    expect(toucheVersReponse("Enter")).toBeNull();
  });
});

describe("questions", () => {
  it("utilise la question du référentiel si elle existe", () => {
    expect(libelleQuestion("Négociation", "Savez-vous négocier ?")).toBe("Savez-vous négocier ?");
  });

  it("dérive sinon la formule standard, sans casser les sigles", () => {
    expect(libelleQuestion("Négociation", null)).toBe(
      "De 1 à 10, comment qualifiez-vous votre compétence en négociation ?"
    );
    expect(libelleQuestion("SEO et référencement", "  ")).toBe(
      "De 1 à 10, comment qualifiez-vous votre compétence en SEO et référencement ?"
    );
  });

  it("lit le contexte de l'URL", () => {
    expect(lireContexte("INITIALE")).toBe("INITIALE");
    expect(lireContexte("FINALE")).toBe("FINALE");
    expect(lireContexte("autre")).toBe("LIBRE");
    expect(lireContexte(undefined)).toBe("LIBRE");
  });
});

describe("minuterie", () => {
  it("calcule la part et les secondes restantes", () => {
    expect(fractionRestante(0, 10_000)).toBe(1);
    expect(fractionRestante(5_000, 10_000)).toBe(0.5);
    expect(fractionRestante(12_000, 10_000)).toBe(0);
    expect(fractionRestante(1, 0)).toBe(0);
    expect(secondesRestantes(0, 10_000)).toBe(10);
    expect(secondesRestantes(9_100, 10_000)).toBe(1);
    expect(secondesRestantes(10_500, 10_000)).toBe(0);
  });

  it("annonce une durée maximale en minutes", () => {
    expect(dureeMaxMinutes(20, 10)).toBe(4);
    expect(dureeMaxMinutes(1, 10)).toBe(1);
  });

  it("compte une réponse expirée comme sans valeur", () => {
    expect(reponseExpiree("c1", 10_000)).toEqual({ competenceId: "c1", valeur: null, inconnu: false, dureeMs: 10_000 });
  });
});

describe("résultats", () => {
  it("convertit la réponse en niveau 0–99", () => {
    expect(niveauDeclare({ valeur: 7, inconnu: false, expire: false })).toBeCloseTo(69.3);
    expect(niveauDeclare({ valeur: null, inconnu: true, expire: false })).toBe(0);
    expect(niveauDeclare({ valeur: null, inconnu: false, expire: true })).toBeNull();
  });

  it("fait le bilan des réponses", () => {
    expect(
      bilanReponses([
        { valeur: 5, inconnu: false, expire: false },
        { valeur: null, inconnu: true, expire: false },
        { valeur: null, inconnu: false, expire: true },
      ])
    ).toEqual({ repondues: 1, inconnues: 1, expirees: 1 });
  });

  it("rattache le contexte à l'étape d'une formation externe", () => {
    expect(etapeExterne("FINALE")).toBe("finale");
    expect(etapeExterne("INITIALE")).toBe("initiale");
    expect(etapeExterne("LIBRE")).toBe("initiale");
  });
});
