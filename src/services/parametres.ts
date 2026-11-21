import { z } from "zod";
import { PONDERATIONS_DEFAUT } from "./competences";
import { REGLES_VISIONNAGE_DEFAUT } from "./visionnage";

/**
 * Paramètres globaux — définis ici avec leurs défauts et leur validation,
 * stockés en base (`Parametre`) et modifiables par le super admin.
 * Une valeur absente ou invalide en base retombe sur le défaut.
 */

export const SCHEMA_PARAMETRES = z.object({
  "contenu.pedagoPeutCreer": z.boolean(),
  "contenu.pedagoValidationRequise": z.boolean(),
  "visionnage.seuil": z.number().min(0.5).max(1),
  "visionnage.vitesseMax": z.number().min(1).max(4),
  "visionnage.toleranceSaut": z.number().min(0.5).max(10),
  "quiz.seuilFinal": z.number().min(0).max(1),
  "autoEvaluation.secondesParQuestion": z.number().int().min(5).max(60),
  "evaluationFroid.delaiJours": z.number().int().min(1).max(365),
  "competences.ponderations": z.object({
    quiz: z.number().min(0).max(1),
    formateur: z.number().min(0).max(1),
    reevaluation: z.number().min(0).max(1),
    tauxApprentissage: z.number().min(0.05).max(1),
    tauxRecul: z.number().min(0).max(1),
    plafondGain: z.number().min(1).max(50),
    plafondRecul: z.number().min(0).max(50),
    partProvisoire: z.number().min(0.5).max(1),
    margeAutoEvaluation: z.number().min(0).max(60),
    seuilMiseEnPratique: z.number().int().min(1).max(5),
  }),
  "inscription.ouverte": z.boolean(),
  "certificat.signataires": z
    .array(z.object({ nom: z.string().max(80), titre: z.string().max(80) }))
    .max(3),
});

export type Parametres = z.infer<typeof SCHEMA_PARAMETRES>;
export type CleParametre = keyof Parametres;

export const PARAMETRES_DEFAUT: Parametres = {
  "contenu.pedagoPeutCreer": true,
  "contenu.pedagoValidationRequise": true,
  "visionnage.seuil": REGLES_VISIONNAGE_DEFAUT.seuil,
  "visionnage.vitesseMax": REGLES_VISIONNAGE_DEFAUT.vitesseMax,
  "visionnage.toleranceSaut": REGLES_VISIONNAGE_DEFAUT.toleranceSaut,
  "quiz.seuilFinal": 0.5,
  "autoEvaluation.secondesParQuestion": 10,
  "evaluationFroid.delaiJours": 30,
  "competences.ponderations": PONDERATIONS_DEFAUT,
  "inscription.ouverte": true,
  "certificat.signataires": [
    { nom: "Direction", titre: "Directeur·rice" },
    { nom: "Équipe pédagogique", titre: "Responsable pédagogique" },
  ],
};

/** Fusionne les valeurs stockées avec les défauts, clé par clé. */
export function resoudreParametres(stockes: { cle: string; valeur: unknown }[]): Parametres {
  const resultat: Record<string, unknown> = { ...PARAMETRES_DEFAUT };
  for (const { cle, valeur } of stockes) {
    if (!(cle in PARAMETRES_DEFAUT)) continue;
    const schema = SCHEMA_PARAMETRES.shape[cle as CleParametre];
    const lu = schema.safeParse(valeur);
    if (lu.success) resultat[cle] = lu.data;
  }
  return resultat as Parametres;
}
