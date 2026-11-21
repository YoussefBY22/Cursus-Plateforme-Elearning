import { db } from "@/db";
import { journal } from "@/db/schema";

/**
 * Piste d'audit : qui a fait quoi, quand, sur quelle entité.
 * Ne fait jamais échouer l'action métier.
 */
export async function journaliser(entree: {
  acteurId?: string | null;
  action: string;
  entite: string;
  entiteId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(journal).values({
      acteurId: entree.acteurId ?? null,
      action: entree.action,
      entite: entree.entite,
      entiteId: entree.entiteId ?? null,
      details: entree.details ?? {},
    });
  } catch (err) {
    console.error("[journal] Échec de journalisation :", err, entree);
  }
}
