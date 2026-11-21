import { describe, expect, it } from "vitest";
import {
  dateIso,
  derniersMois,
  estTypeRapport,
  formaterPourcentage,
  heuresDepuisSecondes,
  intensiteChaleur,
  nomFichierRapport,
  partsPoids,
  poidsMesuresValides,
  satisfactionParFormation,
  serieMensuelle,
  statutCertificat,
  tableCroisee,
  tabulerCertificats,
  tabulerCompetences,
  tabulerFormations,
  tabulerHistorique,
  tabulerMembres,
  tauxCompletion,
} from "./rapports";

describe("nombres et dates", () => {
  it("convertit les secondes en heures au dixième", () => {
    expect(heuresDepuisSecondes(5400)).toBe(1.5);
    expect(heuresDepuisSecondes(0)).toBe(0);
    expect(heuresDepuisSecondes(null)).toBe(0);
    expect(heuresDepuisSecondes(3600 * 12.345)).toBe(12.3);
  });

  it("calcule un taux de complétion borné, nul sans inscrit", () => {
    expect(tauxCompletion(0, 0)).toBeNull();
    expect(tauxCompletion(4, 1)).toBe(0.25);
    expect(tauxCompletion(2, 5)).toBe(1);
  });

  it("formate un pourcentage", () => {
    expect(formaterPourcentage(0.734)).toBe("73 %");
    expect(formaterPourcentage(null)).toBe("—");
  });

  it("produit une date ISO courte", () => {
    expect(dateIso(new Date("2026-03-04T15:00:00Z"))).toBe("2026-03-04");
    expect(dateIso(null)).toBe("");
    expect(dateIso("pas une date")).toBe("");
  });
});

describe("séries mensuelles", () => {
  it("liste les n derniers mois, mois courant inclus, en traversant l'année", () => {
    const mois = derniersMois(6, new Date("2026-02-15T10:00:00Z"));
    expect(mois.map((m) => m.cle)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(mois[0].libelle).toBe("sept.");
    expect(mois[5].libelleLong).toBe("février 2026");
  });

  it("complète les mois creux par zéro et ignore les mois hors fenêtre", () => {
    const fenetre = derniersMois(3, new Date("2026-10-07T00:00:00Z"));
    const serie = serieMensuelle(
      [
        { mois: "2026-09", n: 4 },
        { mois: "2025-01", n: 99 },
      ],
      fenetre
    );
    expect(serie.map((s) => s.valeur)).toEqual([0, 4, 0]);
  });
});

describe("satisfaction par formation", () => {
  it("agrège la note de contenu et le NPS par formation", () => {
    const s = satisfactionParFormation([
      { formationId: "a", noteContenu: 5, recommandation: 10 },
      { formationId: "a", noteContenu: 3, recommandation: 5 },
      { formationId: "b", noteContenu: 4, recommandation: 8 },
    ]);
    expect(s.get("a")).toEqual({ reponses: 2, satisfaction: 4, nps: 0 });
    expect(s.get("b")).toEqual({ reponses: 1, satisfaction: 4, nps: 0 });
    expect(s.get("c")).toBeUndefined();
  });
});

describe("carte de chaleur", () => {
  it("borne l'intensité entre 0 et 1", () => {
    expect(intensiteChaleur(null)).toBe(0);
    expect(intensiteChaleur(5)).toBe(0);
    expect(intensiteChaleur(45)).toBe(0.5);
    expect(intensiteChaleur(95)).toBe(1);
  });

  it("indexe une table croisée", () => {
    const t = tableCroisee([
      { ligne: "je1", colonne: "d1", valeur: 40 },
      { ligne: "je1", colonne: "d2", valeur: 55 },
      { ligne: "je2", colonne: "d1", valeur: 20 },
    ]);
    expect(t.get("je1")?.get("d2")).toBe(55);
    expect(t.get("je2")?.get("d2")).toBeUndefined();
  });
});

describe("exports CSV", () => {
  it("reconnaît les types de rapport et nomme le fichier", () => {
    expect(estTypeRapport("membres")).toBe(true);
    expect(estTypeRapport("../etc")).toBe(false);
    expect(nomFichierRapport("certificats", new Date("2026-10-07T08:00:00Z"))).toBe(
      "cursus-certificats-2026-10-07.csv"
    );
  });

  it("met en forme les membres", () => {
    const t = tabulerMembres(
      [
        {
          prenom: "Sana",
          nom: "Trabelsi",
          email: "sana@aurora.test",
          je: "Aurora",
          roles: ["MEMBRE", "RESP_RH"],
          rattachement: "VALIDE",
          actif: true,
          xp: 820,
          niveau: 5,
          secondesVues: 7200,
          formationsTerminees: 3,
          certificats: 1,
          creeLe: new Date("2026-01-02T00:00:00Z"),
          dernierAcces: null,
        },
      ],
      (r) => (r === "RESP_RH" ? "Responsable RH" : "Membre")
    );
    expect(t.entetes).toHaveLength(t.lignes[0].length);
    expect(t.lignes[0]).toEqual([
      "Sana",
      "Trabelsi",
      "sana@aurora.test",
      "Aurora",
      "Membre | Responsable RH",
      "Validé",
      "oui",
      820,
      5,
      2,
      3,
      1,
      "2026-01-02",
      "",
    ]);
  });

  it("met en forme les formations avec complétion, satisfaction et NPS", () => {
    const satisfaction = satisfactionParFormation([
      { formationId: "f1", noteContenu: 4, recommandation: 9 },
      { formationId: "f1", noteContenu: 5, recommandation: 10 },
    ]);
    const t = tabulerFormations(
      [
        {
          id: "f1",
          titre: "Négocier un devis",
          domaine: "Développement commercial",
          statut: "PUBLIE",
          auteur: "Ali Ben Ali",
          dureeSec: 1830,
          inscrits: 8,
          terminees: 6,
          noteMoyenne: 4.375,
          notes: 4,
        },
        {
          id: "f2",
          titre: "Sans inscrit",
          domaine: "RSE",
          statut: "ARCHIVE",
          auteur: "X",
          dureeSec: 600,
          inscrits: 0,
          terminees: 0,
          noteMoyenne: null,
          notes: 0,
        },
      ],
      satisfaction
    );
    expect(t.entetes).toHaveLength(t.lignes[0].length);
    expect(t.lignes[0]).toEqual([
      "Négocier un devis",
      "Développement commercial",
      "Publié",
      "Ali Ben Ali",
      31,
      8,
      6,
      75,
      4.38,
      4,
      4.5,
      100,
      2,
    ]);
    expect(t.lignes[1].slice(7, 13)).toEqual(["", "", 0, "", "", 0]);
  });

  it("met en forme les compétences au format long", () => {
    const t = tabulerCompetences([
      {
        membre: "Sana Trabelsi",
        email: "sana@aurora.test",
        je: null,
        domaine: "Finance",
        competence: "Budget",
        adaptee: false,
        niveauInitial: 29.7,
        niveau: 41.25,
        majLe: "2026-05-01T12:00:00Z",
      },
    ]);
    expect(t.lignes[0]).toEqual([
      "Sana Trabelsi",
      "sana@aurora.test",
      "",
      "Finance",
      "Budget",
      "Plateforme",
      29.7,
      41.3,
      11.6,
      "2026-05-01",
    ]);
  });

  it("met en forme l'historique avec la source lisible", () => {
    const t = tabulerHistorique([
      {
        membre: "A B",
        email: "a@b.test",
        je: "PXL",
        domaine: "Digital",
        competence: "SQL",
        date: new Date("2026-04-10T00:00:00Z"),
        niveau: 50,
        variation: -2.04,
        source: "FORMATION",
        libelle: "Bases SQL",
      },
    ]);
    expect(t.lignes[0].slice(5)).toEqual(["2026-04-10", 50, -2, "Formation Cursus", "Bases SQL"]);
  });

  it("met en forme les certificats avec leur statut", () => {
    expect(statutCertificat(null)).toBe("Valide");
    const t = tabulerCertificats([
      {
        numero: "CUR-2026-000001",
        membre: "A B",
        email: "a@b.test",
        je: "BOR",
        parcours: "Trésorier organisation",
        emisLe: new Date("2026-03-01T00:00:00Z"),
        revoqueLe: new Date("2026-03-05T00:00:00Z"),
        motifRevocation: "Fraude au quiz",
        consultations: 3,
      },
    ]);
    expect(t.lignes[0]).toEqual([
      "CUR-2026-000001",
      "A B",
      "a@b.test",
      "BOR",
      "Trésorier organisation",
      "2026-03-01",
      "Révoqué",
      "2026-03-05",
      "Fraude au quiz",
      3,
    ]);
  });
});

describe("pondérations", () => {
  it("refuse trois poids nuls et calcule les parts", () => {
    expect(poidsMesuresValides({ quiz: 0, formateur: 0, reevaluation: 0 })).toBe(false);
    expect(poidsMesuresValides({ quiz: 0, formateur: 0, reevaluation: 0.1 })).toBe(true);
    expect(partsPoids({ quiz: 0.5, formateur: 0.3, reevaluation: 0.2 })).toEqual({
      quiz: 0.5,
      formateur: 0.3,
      reevaluation: 0.2,
    });
    expect(partsPoids({ quiz: 1, formateur: 1, reevaluation: 0 }).quiz).toBe(0.5);
  });
});
