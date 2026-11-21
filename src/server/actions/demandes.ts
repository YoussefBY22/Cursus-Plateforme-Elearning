"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { demandesFormation, votesDemandeFormation } from "@/db/schema";
import { messageErreur, type Resultat } from "@/lib/resultat";
import { journaliser } from "@/server/journal";
import { notifier } from "@/server/notifications";
import { exigerPermission, exigerSession } from "@/server/session";

const SchemaCreation = z.object({
  titre: z.string().trim().min(6, "Un titre d'au moins six caractères.").max(140),
  description: z
    .string()
    .trim()
    .min(20, "Dites en quelques phrases ce qui vous manque et pourquoi.")
    .max(2000),
  domaineId: z.string().max(40).optional(),
});

const SchemaId = z.object({ demandeId: z.string().min(1).max(40) });

const SchemaArbitrage = z.object({
  demandeId: z.string().min(1).max(40),
  statut: z.enum(["PLANIFIEE", "SATISFAITE", "REFUSEE"]),
  reponse: z.string().trim().min(5, "Expliquez votre décision en une phrase.").max(1000),
});

function rafraichir() {
  revalidatePath("/demandes");
  revalidatePath("/", "layout");
}

/** Un membre décrit une formation qui lui manque. */
export async function creerDemande(formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerSession();
    const lu = SchemaCreation.safeParse(Object.fromEntries(formData));
    if (!lu.success) {
      const erreurs: Record<string, string> = {};
      for (const i of lu.error.issues) erreurs[String(i.path[0])] = i.message;
      return { erreurs };
    }
    const { titre, description, domaineId } = lu.data;

    const [demande] = await db
      .insert(demandesFormation)
      .values({
        titre,
        description,
        domaineId: domaineId || null,
        demandeurId: u.id,
        jeId: u.jeId ?? null,
      })
      .returning({ id: demandesFormation.id });

    // Le demandeur soutient sa propre demande : le compte reflète le besoin réel.
    await db.insert(votesDemandeFormation).values({ demandeId: demande.id, utilisateurId: u.id });

    await journaliser({
      acteurId: u.id,
      action: "DEMANDE_CREEE",
      entite: "demande_formation",
      entiteId: demande.id,
      details: { titre },
    });
    rafraichir();
    return { ok: true, message: "Demande publiée" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/** Soutenir une demande, ou retirer son soutien. */
export async function basculerVote(formData: FormData): Promise<Resultat<{ vote: boolean }>> {
  try {
    const u = await exigerSession();
    const lu = SchemaId.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };
    const { demandeId } = lu.data;

    const [demande] = await db
      .select({ statut: demandesFormation.statut })
      .from(demandesFormation)
      .where(eq(demandesFormation.id, demandeId))
      .limit(1);
    if (!demande) return { erreur: "Cette demande n'existe plus." };
    if (demande.statut !== "OUVERTE") return { erreur: "Cette demande a déjà été arbitrée." };

    const supprimes = await db
      .delete(votesDemandeFormation)
      .where(and(eq(votesDemandeFormation.demandeId, demandeId), eq(votesDemandeFormation.utilisateurId, u.id)))
      .returning({ demandeId: votesDemandeFormation.demandeId });

    if (!supprimes.length) {
      await db.insert(votesDemandeFormation).values({ demandeId, utilisateurId: u.id });
    }
    rafraichir();
    return { ok: true, message: supprimes.length ? "Soutien retiré" : "Demande soutenue", donnees: { vote: !supprimes.length } };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

/** Le demandeur retire sa propre demande tant qu'elle n'est pas arbitrée. */
export async function retirerDemande(formData: FormData): Promise<Resultat> {
  try {
    const u = await exigerSession();
    const lu = SchemaId.safeParse(Object.fromEntries(formData));
    if (!lu.success) return { erreur: "Requête invalide." };

    const supprimees = await db
      .delete(demandesFormation)
      .where(
        and(
          eq(demandesFormation.id, lu.data.demandeId),
          eq(demandesFormation.demandeurId, u.id),
          eq(demandesFormation.statut, "OUVERTE")
        )
      )
      .returning({ id: demandesFormation.id });
    if (!supprimees.length) return { erreur: "Cette demande ne peut plus être retirée." };

    await journaliser({
      acteurId: u.id,
      action: "DEMANDE_RETIREE",
      entite: "demande_formation",
      entiteId: lu.data.demandeId,
    });
    rafraichir();
    return { ok: true, message: "Demande retirée" };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}

const MESSAGES: Record<string, { titre: string; verbe: string }> = {
  PLANIFIEE: { titre: "Votre demande est retenue", verbe: "Demande planifiée" },
  SATISFAITE: { titre: "Votre demande a trouvé sa formation", verbe: "Demande close" },
  REFUSEE: { titre: "Votre demande n'a pas été retenue", verbe: "Demande refusée" },
};

/**
 * Arbitrage par le équipe pédagogique.
 *
 * Une réponse écrite est obligatoire, y compris pour planifier : une demande
 * qui disparaît sans explication décourage la suivante. Tous les soutiens
 * sont prévenus, pas seulement le demandeur.
 */
export async function arbitrerDemande(formData: FormData): Promise<Resultat> {
  try {
    const acteur = await exigerPermission("suivi", "valider");
    const lu = SchemaArbitrage.safeParse(Object.fromEntries(formData));
    if (!lu.success) {
      return { erreur: lu.error.issues[0]?.message ?? "Requête invalide." };
    }
    const { demandeId, statut, reponse } = lu.data;

    const [demande] = await db
      .select({ titre: demandesFormation.titre, statut: demandesFormation.statut })
      .from(demandesFormation)
      .where(eq(demandesFormation.id, demandeId))
      .limit(1);
    if (!demande) return { erreur: "Cette demande n'existe plus." };

    await db
      .update(demandesFormation)
      .set({ statut, reponse, traiteParId: acteur.id, traiteLe: new Date() })
      .where(eq(demandesFormation.id, demandeId));

    const soutiens = await db
      .select({ id: votesDemandeFormation.utilisateurId })
      .from(votesDemandeFormation)
      .where(eq(votesDemandeFormation.demandeId, demandeId));

    const m = MESSAGES[statut];
    await notifier(
      soutiens.map((s) => s.id),
      {
        type: "DEMANDE",
        titre: m.titre,
        message: `« ${demande.titre} » — ${reponse}`,
        lien: "/demandes",
        cle: `demande:${demandeId}:${statut}`,
      }
    );

    await journaliser({
      acteurId: acteur.id,
      action: "DEMANDE_ARBITREE",
      entite: "demande_formation",
      entiteId: demandeId,
      details: { statut, soutiens: soutiens.length },
    });
    rafraichir();
    return { ok: true, message: m.verbe };
  } catch (err) {
    return { erreur: messageErreur(err) };
  }
}
