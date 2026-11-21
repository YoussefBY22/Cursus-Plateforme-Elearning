import { describe, expect, it } from "vitest";
import { badgesAAttribuer, avancementBadge, CRITERES, STATISTIQUES_VIDES } from "./badges";
import { arrondirNote, noteDepuisPosition, nps, remplissageEtoile, tauxSatisfaction } from "./notation";
import { positionAutorisee, prochaineBarriere, noterQuiz, noterQuestion, verifierPoints, questionValide, type QuestionQuiz } from "./quiz";
import { can, rolePrincipal } from "./rbac";
import { circuitPour, peutValider, PARAMETRES_VALIDATION_DEFAUT } from "./validation";
import { figureDansAnnuaire, lienWhatsapp, peutVoirProfil, peutVoirStats, completudeProfil } from "./visibilite";
import { etatNiveau, niveauDepuisXp, serieJours, xpFormation, xpPourNiveau, xpTempsActif } from "./xp";
import { resoudreParametres, PARAMETRES_DEFAUT } from "./parametres";

describe("niveaux d'expérience", () => {
  it("courbe", () => {
    expect(xpPourNiveau(1)).toBe(0);
    expect(xpPourNiveau(2)).toBe(100);
    expect(niveauDepuisXp(99)).toBe(1);
    expect(niveauDepuisXp(100)).toBe(2);
    expect(niveauDepuisXp(2700)).toBe(10);
  });
  it("avancement dans le niveau", () => {
    const e = etatNiveau(150);
    expect(e.niveau).toBe(2);
    expect(e.avancement).toBeGreaterThan(0);
    expect(e.avancement).toBeLessThan(1);
    expect(e.titre).toBe("Recrue");
  });
  it("XP d'une formation selon la durée, bonus plafonné", () => {
    expect(xpFormation(30 * 60)).toBe(130);
    expect(xpFormation(10 * 3600)).toBe(300);
  });
  it("temps actif plafonné par jour", () => {
    expect(xpTempsActif(1800)).toBe(10);
    expect(xpTempsActif(10 * 3600)).toBe(40);
  });
  it("série de jours", () => {
    const j = (s: string) => new Date(`${s}T00:00:00Z`);
    const auj = j("2026-10-07");
    expect(serieJours([j("2026-10-07"), j("2026-10-06"), j("2026-10-05")], auj)).toBe(3);
    expect(serieJours([j("2026-10-06"), j("2026-10-05")], auj)).toBe(2);
    expect(serieJours([j("2026-10-04")], auj)).toBe(0);
  });
});

describe("badges", () => {
  const regles = [
    { id: "h1", critereCode: "HEURES_PLATEFORME", seuil: 1, actif: true },
    { id: "h10", critereCode: "HEURES_PLATEFORME", seuil: 10, actif: true },
    { id: "mail", critereCode: "EMAIL_VERIFIE", seuil: 1, actif: true },
    { id: "mkt", critereCode: "FORMATIONS_DOMAINE", seuil: 2, parametre: "dom-mkt", actif: true },
    { id: "off", critereCode: "HEURES_PLATEFORME", seuil: 0, actif: false },
  ];
  it("attribue les badges mérités, pas les autres", () => {
    const s = { ...STATISTIQUES_VIDES, heuresPlateforme: 2.5, emailVerifie: true, formationsParDomaine: { "dom-mkt": 2 } };
    expect(badgesAAttribuer(regles, s, new Set())).toEqual(["h1", "mail", "mkt"]);
    expect(badgesAAttribuer(regles, s, new Set(["h1"]))).toEqual(["mail", "mkt"]);
  });
  it("avancement", () => {
    const s = { ...STATISTIQUES_VIDES, heuresPlateforme: 5 };
    expect(avancementBadge(regles[1], s)).toBe(0.5);
  });
  it("chaque critère a un code unique", () => {
    expect(new Set(CRITERES.map((c) => c.code)).size).toBe(CRITERES.length);
  });
});

describe("notation", () => {
  it("pas de 0,25, borné à [1 ; 5]", () => {
    expect(arrondirNote(3.1)).toBe(3.25);
    expect(arrondirNote(3.25)).toBe(3.25);
    expect(arrondirNote(0.2)).toBe(1);
    expect(arrondirNote(9)).toBe(5);
  });
  it("position du pointeur → note", () => {
    expect(noteDepuisPosition(0.5)).toBe(2.5);
    expect(noteDepuisPosition(0.61)).toBe(3.25);
    expect(noteDepuisPosition(1)).toBe(5);
  });
  it("remplissage par étoile", () => {
    expect([0, 1, 2, 3, 4].map((i) => remplissageEtoile(3.25, i))).toEqual([1, 1, 1, 0.25, 0]);
  });
  it("NPS et satisfaction", () => {
    expect(nps([10, 9, 8, 3])).toBe(25);
    expect(tauxSatisfaction([5, 4, 3, 2])).toBe(0.5);
  });
});

describe("quiz", () => {
  const q: QuestionQuiz = {
    id: "q",
    type: "CHOIX_MULTIPLE",
    enonce: "?",
    options: [
      { id: "a", texte: "A", correcte: true },
      { id: "b", texte: "B", correcte: true },
      { id: "c", texte: "C", correcte: false },
    ],
  };
  it("crédit partiel, tout cocher ne paie pas", () => {
    expect(noterQuestion(q, ["a", "b"]).credit).toBe(1);
    expect(noterQuestion(q, ["a"]).credit).toBe(0.5);
    expect(noterQuestion(q, ["a", "b", "c"]).credit).toBe(0.5);
    expect(noterQuestion(q, ["a", "c"]).credit).toBe(0);
  });
  it("score global", () => {
    const u: QuestionQuiz = { ...q, id: "u", type: "CHOIX_UNIQUE", options: [{ id: "x", texte: "X", correcte: true }, { id: "y", texte: "Y", correcte: false }] };
    expect(noterQuiz([q, u], { q: ["a", "b"], u: ["y"] }).score).toBe(0.5);
  });
  it("la barrière bloque les sauts au-delà d'un quiz non fait", () => {
    const points = [{ id: "p2", tempsSec: 600 }, { id: "p1", tempsSec: 300 }];
    expect(prochaineBarriere(points, new Set())?.id).toBe("p1");
    expect(positionAutorisee(900, points, new Set())).toEqual({ position: 300, quizId: "p1" });
    expect(positionAutorisee(900, points, new Set(["p1"]))).toEqual({ position: 600, quizId: "p2" });
    expect(positionAutorisee(200, points, new Set())).toEqual({ position: 200, quizId: null });
  });
  it("vérifie la pose des points", () => {
    expect(verifierPoints([{ tempsSec: 100, nbQuestions: 3 }, { tempsSec: 110, nbQuestions: 3 }], 600)).toHaveLength(1);
    expect(verifierPoints([{ tempsSec: 700, nbQuestions: 3 }], 600)).toHaveLength(1);
  });
  it("valide une question", () => {
    expect(questionValide({ enonce: "", options: [], type: "CHOIX_UNIQUE" })).not.toBeNull();
    expect(questionValide({ enonce: "x", type: "CHOIX_UNIQUE", options: [{ id: "a", texte: "a", correcte: true }, { id: "b", texte: "b", correcte: false }] })).toBeNull();
  });
});

describe("droits et validation", () => {
  it("RBAC", () => {
    expect(can(["MEMBRE"], "studio", "ecrire")).toBe(false);
    expect(can(["FORMATEUR"], "studio", "ecrire")).toBe(true);
    expect(can(["RESP_PEDAGO"], "parametres", "ecrire")).toBe(false);
    expect(can(["SUPER_ADMIN"], "parametres", "ecrire")).toBe(true);
    expect(can(["INCONNU"], "apprentissage", "lire")).toBe(false);
    expect(rolePrincipal(["MEMBRE", "RESP_PEDAGO"])).toBe("RESP_PEDAGO");
  });
  it("circuit par défaut", () => {
    const p = PARAMETRES_VALIDATION_DEFAUT;
    expect(circuitPour(["SUPER_ADMIN"], p)).toBe("PUBLICATION_DIRECTE");
    expect(circuitPour(["RESP_PEDAGO"], p)).toBe("VALIDATION_REQUISE");
    expect(circuitPour(["RESP_PEDAGO"], { ...p, pedagoValidationRequise: false })).toBe("PUBLICATION_DIRECTE");
    expect(circuitPour(["RESP_PEDAGO"], { ...p, pedagoPeutCreer: false })).toBe("INTERDIT");
    expect(circuitPour(["FORMATEUR"], p)).toBe("VALIDATION_REQUISE");
    expect(circuitPour(["MEMBRE"], p)).toBe("INTERDIT");
  });
  it("qui valide quoi", () => {
    const dc = { id: "dc", roles: ["RESP_PEDAGO"] };
    const sa = { id: "sa", roles: ["SUPER_ADMIN"] };
    expect(peutValider(dc, { auteurId: "f1", auteurRoles: ["FORMATEUR"] })).toBe(true);
    expect(peutValider(dc, { auteurId: "dc", auteurRoles: ["RESP_PEDAGO"] })).toBe(false);
    expect(peutValider(sa, { auteurId: "dc", auteurRoles: ["RESP_PEDAGO"] })).toBe(true);
    expect(peutValider({ id: "f", roles: ["FORMATEUR"] }, { auteurId: "x", auteurRoles: ["FORMATEUR"] })).toBe(false);
  });
});

describe("visibilité", () => {
  const lecteur = { id: "l", jeId: "je1", roles: ["MEMBRE"] };
  const base = { id: "p", jeId: "je2", visibleAnnuaire: true, masquerStats: false, roles: ["MEMBRE"] };
  it("visible : tout le monde voit profil et stats", () => {
    expect(peutVoirProfil(lecteur, base)).toBe(true);
    expect(peutVoirStats(lecteur, base)).toBe(true);
  });
  it("visible mais stats masquées", () => {
    expect(peutVoirStats(lecteur, { ...base, masquerStats: true })).toBe(false);
  });
  it("invisible : seule son organisation le voit", () => {
    const invisible = { ...base, visibleAnnuaire: false };
    expect(peutVoirProfil(lecteur, invisible)).toBe(false);
    expect(figureDansAnnuaire(lecteur, invisible)).toBe(false);
    expect(peutVoirProfil({ ...lecteur, jeId: "je2" }, invisible)).toBe(true);
    expect(figureDansAnnuaire({ ...lecteur, jeId: "je2" }, invisible)).toBe(true);
  });
  it("le RH de l'organisation voit les stats même masquées", () => {
    expect(peutVoirStats({ id: "rh", jeId: "je2", roles: ["RESP_RH"] }, { ...base, masquerStats: true })).toBe(true);
  });
  it("WhatsApp et complétude", () => {
    expect(lienWhatsapp("+33 6 12 34 56 78")).toBe("https://wa.me/33612345678");
    expect(lienWhatsapp("0033 6 12 34 56 78")).toBe("https://wa.me/33612345678");
    expect(lienWhatsapp("06 12 34 56 78")).toBeNull();
    expect(lienWhatsapp("")).toBeNull();
    expect(completudeProfil({ photoUrl: "x", poste: "y", bio: "", linkedin: null, departement: "d", jeId: "j" }).manquants).toEqual(["Bio", "LinkedIn"]);
  });
});

describe("paramètres", () => {
  it("retombe sur les défauts pour une valeur invalide", () => {
    const p = resoudreParametres([
      { cle: "visionnage.seuil", valeur: 0.85 },
      { cle: "quiz.seuilFinal", valeur: "beaucoup" },
      { cle: "inconnu", valeur: 1 },
    ]);
    expect(p["visionnage.seuil"]).toBe(0.85);
    expect(p["quiz.seuilFinal"]).toBe(PARAMETRES_DEFAUT["quiz.seuilFinal"]);
  });
});
