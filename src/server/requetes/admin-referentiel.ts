import "server-only";
import { and, asc, countDistinct, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { competences, domaines } from "@/db/schema";

export async function donneesReferentiel() {
  const [listeDomaines, communes, adaptations, adaptationsParSource] = await Promise.all([
    db.select().from(domaines).orderBy(asc(domaines.ordre), asc(domaines.nom)),
    db
      .select({
        id: competences.id,
        code: competences.code,
        nom: competences.nom,
        description: competences.description,
        question: competences.question,
        pistes: competences.pistes,
        domaineId: competences.domaineId,
        ordre: competences.ordre,
        active: competences.active,
      })
      .from(competences)
      .where(isNull(competences.jeId))
      .orderBy(asc(competences.ordre), asc(competences.nom)),
    db
      .select({ domaineId: competences.domaineId, jes: countDistinct(competences.jeId) })
      .from(competences)
      .where(isNotNull(competences.jeId))
      .groupBy(competences.domaineId),
    db
      .select({ sourceId: competences.sourceId, jes: countDistinct(competences.jeId) })
      .from(competences)
      .where(and(isNotNull(competences.jeId), isNotNull(competences.sourceId)))
      .groupBy(competences.sourceId),
  ]);
  const iAdapt = new Map(adaptations.map((a) => [a.domaineId, a.jes]));
  const iSource = new Map(adaptationsParSource.map((a) => [a.sourceId, a.jes]));
  return listeDomaines.map((d) => ({
    id: d.id,
    code: d.code,
    nom: d.nom,
    description: d.description,
    couleur: d.couleur,
    icone: d.icone,
    ordre: d.ordre,
    jesAdaptees: iAdapt.get(d.id) ?? 0,
    competences: communes
      .filter((c) => c.domaineId === d.id)
      .map((c) => ({ ...c, adaptations: iSource.get(c.id) ?? 0 })),
  }));
}

export type DomaineReferentiel = Awaited<ReturnType<typeof donneesReferentiel>>[number];
