import { cache } from "react";
import { db } from "@/db";
import { parametres } from "@/db/schema";
import {
  PARAMETRES_DEFAUT,
  resoudreParametres,
  SCHEMA_PARAMETRES,
  type CleParametre,
  type Parametres,
} from "@/services/parametres";

/** Paramètres globaux, lus une fois par requête (cache React). */
export const lireParametres = cache(async (): Promise<Parametres> => {
  try {
    const lignes = await db.select().from(parametres);
    return resoudreParametres(lignes);
  } catch {
    return PARAMETRES_DEFAUT;
  }
});

export async function ecrireParametre<K extends CleParametre>(cle: K, valeur: Parametres[K]): Promise<void> {
  const lu = SCHEMA_PARAMETRES.shape[cle].parse(valeur);
  await db
    .insert(parametres)
    .values({ cle, valeur: lu })
    .onConflictDoUpdate({ target: parametres.cle, set: { valeur: lu, majLe: new Date() } });
}
