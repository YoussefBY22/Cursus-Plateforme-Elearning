"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { ecrireParametre, lireParametres } from "@/server/parametres";
import { exigerPermission } from "@/server/session";
import { SCHEMA_PARAMETRES, type CleParametre, type Parametres } from "@/services/parametres";
import { poidsMesuresValides } from "@/services/rapports";

/**
 * Paramètres globaux, écrits section par section. L'interface affiche des
 * pourcentages là où la base stocke des fractions (0,9 ↔ 90 %) : la
 * conversion se fait ici, puis la validation passe par SCHEMA_PARAMETRES,
 * la même que celle de la lecture.
 */

const SECTIONS = [
  "circuit",
  "visionnage",
  "quiz",
  "autoEvaluation",
  "evaluationFroid",
  "ponderations",
  "inscriptions",
  "signataires",
] as const;
type Section = (typeof SECTIONS)[number];

const LIBELLES: Record<Section, string> = {
  circuit: "Circuit de validation enregistré",
  visionnage: "Règles de visionnage enregistrées",
  quiz: "Seuil du quiz enregistré",
  autoEvaluation: "Auto-évaluation enregistrée",
  evaluationFroid: "Délai d'évaluation à froid enregistré",
  ponderations: "Pondérations enregistrées",
  inscriptions: "Inscriptions enregistrées",
  signataires: "Signataires enregistrés",
};

/** Nombre saisi à la française (« 1,5 ») ; NaN si vide ou illisible. */
function nombre(fd: FormData, champ: string): number {
  const brut = String(fd.get(champ) ?? "").trim().replace(",", ".");
  return brut === "" ? Number.NaN : Number(brut);
}
const pourcent = (fd: FormData, champ: string) => nombre(fd, champ) / 100;
const coche = (fd: FormData, champ: string) => fd.get(champ) === "on";

type Ecriture = { [K in CleParametre]: { cle: K; valeur: Parametres[K] } }[CleParametre];

/** Bornes de SCHEMA_PARAMETRES, dites dans l'unité affichée. */
const BORNES: Record<string, string> = {
  seuil: "Entre 50 et 100 %.",
  vitesseMax: "Entre 1 et 4 (×).",
  toleranceSaut: "Entre 0,5 et 10 secondes.",
  seuilFinal: "Entre 0 et 100 %.",
  secondesParQuestion: "Nombre entier entre 5 et 60 secondes.",
  delaiJours: "Nombre entier entre 1 et 365 jours.",
  quiz: "Entre 0 et 100 %.",
  formateur: "Entre 0 et 100 %.",
  reevaluation: "Entre 0 et 100 %.",
  tauxApprentissage: "Entre 5 et 100 %.",
  tauxRecul: "Entre 0 et 100 %.",
  plafondGain: "Entre 1 et 50 points.",
  plafondRecul: "Entre 0 et 50 points.",
  partProvisoire: "Entre 50 et 100 %.",
  margeAutoEvaluation: "Entre 0 et 60 points.",
  seuilMiseEnPratique: "Nombre entier entre 1 et 5.",
};

/** Messages de champ lisibles à partir des bornes du schéma. */
function erreursChamps(issues: { path: PropertyKey[] }[], champ: (chemin: PropertyKey[]) => string): Record<string, string> {
  const erreurs: Record<string, string> = {};
  for (const i of issues) {
    const c = champ(i.path);
    erreurs[c] ??= BORNES[c] ?? "Valeur invalide.";
  }
  return erreurs;
}

function lireSection(section: Section, fd: FormData): { ecritures: Ecriture[] } | { erreurs: Record<string, string> } {
  const verifier = <K extends CleParametre>(cle: K, valeur: unknown, champ: (chemin: PropertyKey[]) => string) => {
    const lu = SCHEMA_PARAMETRES.shape[cle].safeParse(valeur);
    return lu.success
      ? { ok: true as const, ecriture: { cle, valeur: lu.data as Parametres[K] } as Ecriture }
      : { ok: false as const, erreurs: erreursChamps(lu.error.issues, champ) };
  };
  const tout = (...r: ReturnType<typeof verifier>[]) => {
    const erreurs = Object.assign({}, ...r.filter((x) => !x.ok).map((x) => (x.ok ? {} : x.erreurs)));
    if (Object.keys(erreurs).length) return { erreurs };
    return { ecritures: r.flatMap((x) => (x.ok ? [x.ecriture] : [])) };
  };

  switch (section) {
    case "circuit":
      return tout(
        verifier("contenu.pedagoPeutCreer", coche(fd, "pedagoPeutCreer"), () => "pedagoPeutCreer"),
        verifier("contenu.pedagoValidationRequise", coche(fd, "pedagoValidationRequise"), () => "pedagoValidationRequise")
      );
    case "visionnage":
      return tout(
        verifier("visionnage.seuil", pourcent(fd, "seuil"), () => "seuil"),
        verifier("visionnage.vitesseMax", nombre(fd, "vitesseMax"), () => "vitesseMax"),
        verifier("visionnage.toleranceSaut", nombre(fd, "toleranceSaut"), () => "toleranceSaut")
      );
    case "quiz":
      return tout(verifier("quiz.seuilFinal", pourcent(fd, "seuilFinal"), () => "seuilFinal"));
    case "autoEvaluation":
      return tout(verifier("autoEvaluation.secondesParQuestion", nombre(fd, "secondesParQuestion"), () => "secondesParQuestion"));
    case "evaluationFroid":
      return tout(verifier("evaluationFroid.delaiJours", nombre(fd, "delaiJours"), () => "delaiJours"));
    case "ponderations": {
      const p = {
        quiz: pourcent(fd, "quiz"),
        formateur: pourcent(fd, "formateur"),
        reevaluation: pourcent(fd, "reevaluation"),
        tauxApprentissage: pourcent(fd, "tauxApprentissage"),
        tauxRecul: pourcent(fd, "tauxRecul"),
        plafondGain: nombre(fd, "plafondGain"),
        plafondRecul: nombre(fd, "plafondRecul"),
        partProvisoire: pourcent(fd, "partProvisoire"),
        margeAutoEvaluation: nombre(fd, "margeAutoEvaluation"),
        seuilMiseEnPratique: nombre(fd, "seuilMiseEnPratique"),
      };
      const r = verifier("competences.ponderations", p, (chemin) => String(chemin[0] ?? "ponderations"));
      if (r.ok && !poidsMesuresValides(p)) {
        return {
          erreurs: {
            quiz: "Les trois poids ne peuvent pas être tous nuls : il faut au moins une mesure.",
            formateur: " ",
            reevaluation: " ",
          },
        };
      }
      return tout(r);
    }
    case "inscriptions":
      return tout(verifier("inscription.ouverte", coche(fd, "ouverte"), () => "ouverte"));
    case "signataires": {
      const signataires: { nom: string; titre: string }[] = [];
      const erreurs: Record<string, string> = {};
      for (let i = 0; i < 3; i++) {
        const nom = String(fd.get(`nom${i}`) ?? "").trim();
        const titre = String(fd.get(`titre${i}`) ?? "").trim();
        if (!nom && !titre) continue;
        if (!nom) erreurs[`nom${i}`] = "Nom manquant.";
        if (nom.length > 80) erreurs[`nom${i}`] = "80 caractères au plus.";
        if (titre.length > 80) erreurs[`titre${i}`] = "80 caractères au plus.";
        signataires.push({ nom, titre });
      }
      if (Object.keys(erreurs).length) return { erreurs };
      return tout(verifier("certificat.signataires", signataires, (chemin) => `nom${String(chemin[0] ?? 0)}`));
    }
  }
}

export async function enregistrerParametres(_etat: Resultat, formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("parametres", "ecrire");
    const section = z.enum(SECTIONS).safeParse(formData.get("section"));
    if (!section.success) return { erreur: "Section inconnue." };

    const lu = lireSection(section.data, formData);
    if ("erreurs" in lu) return { erreurs: lu.erreurs };

    const avant = await lireParametres();
    for (const e of lu.ecritures) await ecrireParametre<CleParametre>(e.cle, e.valeur);

    await journaliser({
      acteurId: acteur.id,
      action: "PARAMETRES_MODIFIES",
      entite: "parametre",
      entiteId: section.data,
      details: Object.fromEntries(lu.ecritures.map((e) => [e.cle, { avant: avant[e.cle], apres: e.valeur }])),
    });
    revalidatePath("/admin/parametres");
    // Les paramètres agissent partout (circuit, inscription, lecteur) : on rafraîchit l'application.
    revalidatePath("/", "layout");
    return { ok: true, message: LIBELLES[section.data] };
  } catch (err) {
    return { erreur: messageErreur(err, "Enregistrement impossible. Réessayez.") };
  }
}
