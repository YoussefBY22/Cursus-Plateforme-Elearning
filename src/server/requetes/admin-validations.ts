import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  competences,
  domaines,
  etapesParcours,
  formations,
  formationsCompetences,
  parcours,
  pointsQuiz,
  questions,
  utilisateurs,
} from "@/db/schema";
import type { Utilisateur } from "@/server/session";
import { peutValider } from "@/services/validation";

/*
 * File de validation des contenus.
 *
 * Elle ne liste pas seulement ce qui attend : elle apporte tout ce qu'il
 * faut pour décider sans ouvrir autre chose — la vidéo, les objectifs, les
 * compétences visées, et les questions avec leurs bonnes réponses. Valider
 * à l'aveugle, c'est valider pour la forme.
 *
 * `peutValider` tranche qui peut statuer : personne ne valide son propre
 * contenu, et le contenu d'un responsable pédagogique remonte au super admin.
 */

export type QuestionValidation = {
  id: string;
  enonce: string;
  type: string;
  explication: string | null;
  options: { texte: string; correcte: boolean }[];
};

export type PointValidation = {
  id: string;
  type: "INTEGRE" | "FINAL";
  tempsSec: number | null;
  titre: string;
  questions: QuestionValidation[];
};

export type FormationAValider = {
  type: "formation";
  id: string;
  slug: string;
  titre: string;
  resume: string;
  description: string;
  objectifs: string[];
  domaine: string;
  couleur: string;
  niveau: string;
  dureeSec: number;
  fournisseurVideo: string;
  referenceVideo: string;
  auteur: string;
  auteurId: string;
  soumisLe: Date | null;
  dejaPublie: boolean;
  competences: { nom: string; poids: number }[];
  points: PointValidation[];
  /** Ce validateur peut-il statuer sur ce contenu ? */
  jeDecide: boolean;
};

export type ParcoursAValider = {
  type: "parcours";
  id: string;
  slug: string;
  titre: string;
  sousTitre: string | null;
  description: string;
  domaine: string;
  couleur: string;
  auteur: string;
  auteurId: string;
  soumisLe: Date | null;
  dejaPublie: boolean;
  etapes: { ordre: number; titre: string; statut: string; dureeSec: number }[];
  jeDecide: boolean;
};

export type FileValidation = {
  formations: FormationAValider[];
  parcours: ParcoursAValider[];
  /** Contenus en attente mais que ce validateur ne peut pas trancher. */
  horsPortee: number;
};

export async function fileValidation(u: Utilisateur): Promise<FileValidation> {
  const [lignesF, lignesP] = await Promise.all([
    db
      .select({
        id: formations.id,
        slug: formations.slug,
        titre: formations.titre,
        resume: formations.resume,
        description: formations.description,
        objectifs: formations.objectifs,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        niveau: formations.niveau,
        dureeSec: formations.dureeSec,
        fournisseurVideo: formations.fournisseurVideo,
        referenceVideo: formations.referenceVideo,
        auteurId: formations.auteurId,
        auteurPrenom: utilisateurs.prenom,
        auteurNom: utilisateurs.nom,
        auteurRoles: utilisateurs.roles,
        soumisLe: formations.soumisLe,
        publieLe: formations.publieLe,
      })
      .from(formations)
      .innerJoin(domaines, eq(domaines.id, formations.domaineId))
      .innerJoin(utilisateurs, eq(utilisateurs.id, formations.auteurId))
      .where(eq(formations.statut, "EN_VALIDATION"))
      .orderBy(asc(formations.soumisLe)),
    db
      .select({
        id: parcours.id,
        slug: parcours.slug,
        titre: parcours.titre,
        sousTitre: parcours.sousTitre,
        description: parcours.description,
        domaine: domaines.nom,
        couleur: domaines.couleur,
        auteurId: parcours.auteurId,
        auteurPrenom: utilisateurs.prenom,
        auteurNom: utilisateurs.nom,
        auteurRoles: utilisateurs.roles,
        soumisLe: parcours.soumisLe,
        publieLe: parcours.publieLe,
      })
      .from(parcours)
      .innerJoin(domaines, eq(domaines.id, parcours.domaineId))
      .innerJoin(utilisateurs, eq(utilisateurs.id, parcours.auteurId))
      .where(eq(parcours.statut, "EN_VALIDATION"))
      .orderBy(asc(parcours.soumisLe)),
  ]);

  const idsF = lignesF.map((l) => l.id);
  const idsP = lignesP.map((l) => l.id);

  const [liens, points, etapes] = await Promise.all([
    idsF.length
      ? db
          .select({
            formationId: formationsCompetences.formationId,
            nom: competences.nom,
            poids: formationsCompetences.poids,
          })
          .from(formationsCompetences)
          .innerJoin(competences, eq(competences.id, formationsCompetences.competenceId))
          .where(inArray(formationsCompetences.formationId, idsF))
          .orderBy(asc(competences.ordre))
      : Promise.resolve([]),
    idsF.length
      ? db
          .select()
          .from(pointsQuiz)
          .where(inArray(pointsQuiz.formationId, idsF))
          .orderBy(asc(pointsQuiz.type), asc(pointsQuiz.tempsSec))
      : Promise.resolve([]),
    idsP.length
      ? db
          .select({
            parcoursId: etapesParcours.parcoursId,
            ordre: etapesParcours.ordre,
            titre: sql<string>`coalesce(${etapesParcours.titre}, ${formations.titre})`,
            statut: formations.statut,
            dureeSec: formations.dureeSec,
          })
          .from(etapesParcours)
          .innerJoin(formations, eq(formations.id, etapesParcours.formationId))
          .where(inArray(etapesParcours.parcoursId, idsP))
          .orderBy(asc(etapesParcours.ordre))
      : Promise.resolve([]),
  ]);

  const idsPoints = points.map((p) => p.id);
  const qs = idsPoints.length
    ? await db.select().from(questions).where(inArray(questions.pointQuizId, idsPoints)).orderBy(asc(questions.ordre))
    : [];

  const moi = { id: u.id, roles: u.roles };
  let horsPortee = 0;

  const listeFormations: FormationAValider[] = lignesF.map((l) => {
    const jeDecide = peutValider(moi, { auteurId: l.auteurId, auteurRoles: l.auteurRoles });
    if (!jeDecide) horsPortee += 1;
    return {
      type: "formation",
      id: l.id,
      slug: l.slug,
      titre: l.titre,
      resume: l.resume,
      description: l.description,
      objectifs: l.objectifs,
      domaine: l.domaine,
      couleur: l.couleur,
      niveau: l.niveau,
      dureeSec: l.dureeSec,
      fournisseurVideo: l.fournisseurVideo,
      referenceVideo: l.referenceVideo,
      auteur: `${l.auteurPrenom} ${l.auteurNom}`,
      auteurId: l.auteurId,
      soumisLe: l.soumisLe,
      dejaPublie: !!l.publieLe,
      competences: liens.filter((c) => c.formationId === l.id).map((c) => ({ nom: c.nom, poids: c.poids })),
      points: points
        .filter((p) => p.formationId === l.id)
        .map((p) => ({
          id: p.id,
          type: p.type as "INTEGRE" | "FINAL",
          tempsSec: p.tempsSec,
          titre: p.titre,
          questions: qs
            .filter((q) => q.pointQuizId === p.id)
            .map((q) => ({
              id: q.id,
              enonce: q.enonce,
              type: q.type,
              explication: q.explication,
              options: q.options.map((o) => ({ texte: o.texte, correcte: o.correcte })),
            })),
        })),
      jeDecide,
    };
  });

  const listeParcours: ParcoursAValider[] = lignesP.map((l) => {
    const jeDecide = peutValider(moi, { auteurId: l.auteurId, auteurRoles: l.auteurRoles });
    if (!jeDecide) horsPortee += 1;
    return {
      type: "parcours",
      id: l.id,
      slug: l.slug,
      titre: l.titre,
      sousTitre: l.sousTitre,
      description: l.description,
      domaine: l.domaine,
      couleur: l.couleur,
      auteur: `${l.auteurPrenom} ${l.auteurNom}`,
      auteurId: l.auteurId,
      soumisLe: l.soumisLe,
      dejaPublie: !!l.publieLe,
      etapes: etapes.filter((e) => e.parcoursId === l.id),
      jeDecide,
    };
  });

  return { formations: listeFormations, parcours: listeParcours, horsPortee };
}
