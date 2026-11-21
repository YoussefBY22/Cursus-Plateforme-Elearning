import { describe, expect, it } from "vitest";
import {
  ecrireTemps,
  lireTemps,
  manquesFormation,
  manquesParcours,
  modifiable,
  positionMarqueur,
  type FormationASoumettre,
} from "./studio";

function formationComplete(): FormationASoumettre {
  return {
    titre: "Tenir la trésorerie d'une organisation",
    resume: "Les gestes du quotidien : encaisser, décaisser, justifier, et garder une caisse qui tombe juste.",
    description:
      "Cette formation part du brouillard de caisse et remonte jusqu'au rapport financier mensuel. " +
      "Vous verrez comment enregistrer une opération, quelles pièces conserver, et comment rapprocher " +
      "la caisse du relevé bancaire sans y passer la soirée.",
    objectifs: ["Enregistrer une opération de caisse", "Rapprocher la caisse et la banque"],
    referenceVideo: "qp0HIF3SfI4",
    dureeSec: 900,
    competences: [{ id: "c1" }],
    points: [
      {
        type: "INTEGRE",
        tempsSec: 300,
        questions: [
          {
            enonce: "Que justifie un reçu ?",
            type: "CHOIX_UNIQUE",
            options: [
              { texte: "Un encaissement", correcte: true },
              { texte: "Un virement bancaire", correcte: false },
            ],
          },
        ],
      },
      {
        type: "FINAL",
        tempsSec: null,
        questions: [
          {
            enonce: "La caisse doit être comptée…",
            type: "CHOIX_UNIQUE",
            options: [
              { texte: "Chaque mois", correcte: true },
              { texte: "Une fois par mandat", correcte: false },
            ],
          },
        ],
      },
    ],
  };
}

describe("manquesFormation", () => {
  it("ne reproche rien à une formation complète", () => {
    expect(manquesFormation(formationComplete())).toEqual([]);
  });

  it("exige un quiz final", () => {
    const f = formationComplete();
    f.points = f.points.filter((p) => p.type !== "FINAL");
    expect(manquesFormation(f).join(" ")).toContain("quiz final");
  });

  it("refuse deux quiz finaux", () => {
    const f = formationComplete();
    f.points.push({ ...f.points[1] });
    expect(manquesFormation(f).join(" ")).toContain("un seul quiz final");
  });

  it("exige au moins une compétence", () => {
    const f = formationComplete();
    f.competences = [];
    expect(manquesFormation(f).join(" ")).toContain("compétence");
  });

  it("signale un point intégré posé après la fin de la vidéo", () => {
    const f = formationComplete();
    f.points[0].tempsSec = 5000;
    expect(manquesFormation(f).join(" ")).toContain("entre le début et la fin");
  });

  it("situe une question bancale par son numéro", () => {
    const f = formationComplete();
    f.points[1].questions[0].options = [
      { texte: "Chaque mois", correcte: false },
      { texte: "Une fois par mandat", correcte: false },
    ];
    expect(manquesFormation(f).join(" ")).toContain("quiz final, question 1");
  });

  it("réclame les textes trop courts du catalogue", () => {
    const f = formationComplete();
    f.resume = "Trop court.";
    f.description = "Trop court aussi.";
    f.objectifs = ["Un seul"];
    const m = manquesFormation(f);
    expect(m.length).toBeGreaterThanOrEqual(3);
  });

  it("ne valide pas les points quand la durée est absente", () => {
    const f = formationComplete();
    f.dureeSec = 0;
    const m = manquesFormation(f).join(" ");
    expect(m).toContain("durée réelle");
  });
});

describe("manquesParcours", () => {
  const base = {
    titre: "Parcours trésorerie",
    description:
      "Un parcours en trois temps pour reprendre la trésorerie d'une organisation de bout en bout, " +
      "depuis la caisse jusqu'à la déclaration mensuelle et au rapport financier.",
  };

  it("accepte un parcours de deux étapes publiées", () => {
    expect(
      manquesParcours({ ...base, etapes: [{ formationStatut: "PUBLIE" }, { formationStatut: "PUBLIE" }] })
    ).toEqual([]);
  });

  it("refuse un parcours d'une seule étape", () => {
    expect(manquesParcours({ ...base, etapes: [{ formationStatut: "PUBLIE" }] }).join(" ")).toContain("au moins 2");
  });

  it("signale les étapes non publiées", () => {
    const m = manquesParcours({
      ...base,
      etapes: [{ formationStatut: "PUBLIE" }, { formationStatut: "BROUILLON" }],
    });
    expect(m.join(" ")).toContain("n'est pas publiée");
  });
});

describe("modifiable", () => {
  it("bloque la modification pendant la validation et après archivage", () => {
    expect(modifiable("EN_VALIDATION")).toBe(false);
    expect(modifiable("ARCHIVE")).toBe(false);
    expect(modifiable("BROUILLON")).toBe(true);
    expect(modifiable("REFUSE")).toBe(true);
    expect(modifiable("PUBLIE")).toBe(true);
  });
});

describe("temps", () => {
  it("lit les formats courants", () => {
    expect(lireTemps("90")).toBe(90);
    expect(lireTemps("4:32")).toBe(272);
    expect(lireTemps("1:05:30")).toBe(3930);
    expect(lireTemps(" 0:05 ")).toBe(5);
  });

  it("refuse une saisie qui n'est pas un temps", () => {
    expect(lireTemps("")).toBeNull();
    expect(lireTemps("4:99")).toBeNull();
    expect(lireTemps("abc")).toBeNull();
    expect(lireTemps("1:2:3:4")).toBeNull();
  });

  it("écrit un temps lisible", () => {
    expect(ecrireTemps(272)).toBe("4:32");
    expect(ecrireTemps(3930)).toBe("1:05:30");
    expect(ecrireTemps(5)).toBe("0:05");
  });

  it("fait l'aller-retour", () => {
    for (const s of [0, 5, 59, 60, 272, 3599, 3930]) {
      expect(lireTemps(ecrireTemps(s))).toBe(s);
    }
  });
});

describe("positionMarqueur", () => {
  it("place le marqueur en pourcentage et reste borné", () => {
    expect(positionMarqueur(450, 900)).toBe(50);
    expect(positionMarqueur(-10, 900)).toBe(0);
    expect(positionMarqueur(2000, 900)).toBe(100);
    expect(positionMarqueur(10, 0)).toBe(0);
  });
});
