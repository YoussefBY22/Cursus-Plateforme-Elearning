import "server-only";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { activitesJour, badges, badgesObtenus, certificats, domaines, progressions, utilisateurs } from "@/db/schema";
import { aReprendre, type CarteCatalogue } from "@/server/requetes/catalogue";
import { detailsDomaines, formationsExternesAEvaluer, profilCompetences } from "@/server/requetes/competences";
import { evaluationsAFroidDues, type EvaluationDue } from "@/server/requetes/evaluations";
import { listeParcours, type CarteParcours } from "@/server/requetes/parcours";
import { etatNiveau, serieJours } from "@/services/xp";

/*
 * Tableau de bord d'accueil.
 *
 * Le parti pris : l'écran répond à « qu'est-ce que je fais maintenant ? »
 * avant de raconter ce qui a été fait. Les reprises et les actions en
 * attente passent donc avant les statistiques, et chaque chiffre affiché
 * doit mener quelque part.
 */

export type ActionEnAttente = {
  cle: string;
  libelle: string;
  detail: string;
  lien: string;
  ton: "primaire" | "alerte" | "neutre";
};

export type BadgeRecent = {
  id: string;
  nom: string;
  couleur: string;
  forme: string;
  matiere: string;
  rarete: string;
  effet: string;
  icone: string;
  obtenuLe: Date;
};

export type DonneesAccueil = {
  prenom: string;
  niveau: ReturnType<typeof etatNiveau>;
  xp: number;
  serie: number;
  minutesSemaine: number;
  formationsTerminees: number;
  certificats: number;
  noteGenerale: number;
  palier: { code: string; libelle: string };
  domainesMesures: number;
  domainesTotal: number;
  aReprendre: CarteCatalogue[];
  parcoursEnCours: CarteParcours[];
  actions: ActionEnAttente[];
  badgesRecents: BadgeRecent[];
  recommandations: { slug: string; titre: string; resume: string; dureeSec: number; cible: string[]; domaine: string; couleur: string }[];
  evaluationsFroid: EvaluationDue[];
};

export async function donneesAccueil(utilisateurId: string): Promise<DonneesAccueil> {
  const ilYaSeptJours = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [
    [moi],
    jours,
    [semaine],
    [terminees],
    [certifs],
    profil,
    reprises,
    parcoursTous,
    froid,
    externes,
    recents,
  ] = await Promise.all([
    db
      .select({ prenom: utilisateurs.prenom, xp: utilisateurs.xp })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, utilisateurId))
      .limit(1),
    db
      .select({ jour: activitesJour.jour })
      .from(activitesJour)
      .where(eq(activitesJour.utilisateurId, utilisateurId))
      .orderBy(desc(activitesJour.jour))
      .limit(60),
    db
      .select({ secondes: sql<number>`coalesce(sum(${activitesJour.secondes}), 0)`.mapWith(Number) })
      .from(activitesJour)
      .where(and(eq(activitesJour.utilisateurId, utilisateurId), gte(activitesJour.jour, ilYaSeptJours))),
    db
      .select({ n: count() })
      .from(progressions)
      .where(and(eq(progressions.utilisateurId, utilisateurId), eq(progressions.statut, "TERMINEE"))),
    db.select({ n: count() }).from(certificats).where(eq(certificats.utilisateurId, utilisateurId)),
    profilCompetences(utilisateurId),
    aReprendre(utilisateurId, 3),
    listeParcours(utilisateurId),
    evaluationsAFroidDues(utilisateurId),
    formationsExternesAEvaluer(utilisateurId),
    db
      .select({
        id: badges.id,
        nom: badges.nom,
        couleur: badges.couleur,
        forme: badges.forme,
        matiere: badges.matiere,
        rarete: badges.rarete,
        effet: badges.effet,
        icone: badges.icone,
        obtenuLe: badgesObtenus.obtenuLe,
      })
      .from(badgesObtenus)
      .innerJoin(badges, eq(badges.id, badgesObtenus.badgeId))
      .where(eq(badgesObtenus.utilisateurId, utilisateurId))
      .orderBy(desc(badgesObtenus.obtenuLe))
      .limit(4),
  ]);

  // Ce qui attend le membre, du plus engageant au plus administratif.
  const actions: ActionEnAttente[] = [];
  for (const f of froid.slice(0, 2)) {
    actions.push({
      cle: `froid:${f.formationId}`,
      libelle: "Évaluation à froid",
      detail:
        f.gainEnAttente > 0
          ? `« ${f.titre} » — ${f.gainEnAttente} points de compétence en jeu`
          : `« ${f.titre} », terminée il y a ${f.joursEcoules} jours`,
      lien: `/evaluations/${f.slug}`,
      ton: "primaire",
    });
  }
  for (const e of externes.slice(0, 2)) {
    actions.push({
      cle: `externe:${e.id}`,
      libelle: e.initialeFaite ? "Mesure d'après formation" : "Mesure d'avant formation",
      detail: `« ${e.titre} », organisée par votre organisation`,
      lien: `/competences/externe/${e.id}`,
      ton: "alerte",
    });
  }
  const aEvaluer = profil.domaines.filter((d) => d.mesurees === 0 && d.total > 0);
  if (aEvaluer.length) {
    actions.push({
      cle: `autoeval:${aEvaluer[0].code}`,
      libelle: "Auto-évaluation",
      detail:
        aEvaluer.length === 1
          ? `Le domaine « ${aEvaluer[0].nom} » n'est pas encore mesuré`
          : `${aEvaluer.length} domaines ne sont pas encore mesurés`,
      lien: `/competences/auto-evaluation/${aEvaluer[0].code}`,
      ton: "neutre",
    });
  }

  // Formations conseillées : celles qui visent les compétences les plus
  // faibles des domaines déjà mesurés.
  const details = profil.aDesMesures ? await detailsDomaines(utilisateurId) : [];
  const couleurs = new Map(profil.domaines.map((d) => [d.id, { nom: d.nom, couleur: d.couleur }]));
  const vues = new Set<string>();
  const recommandations: DonneesAccueil["recommandations"] = [];
  for (const d of details) {
    for (const r of d.formations) {
      if (r.enCours || vues.has(r.slug)) continue;
      vues.add(r.slug);
      recommandations.push({
        slug: r.slug,
        titre: r.titre,
        resume: r.resume,
        dureeSec: r.dureeSec,
        cible: r.cible,
        domaine: couleurs.get(d.domaine.id)?.nom ?? d.domaine.nom,
        couleur: couleurs.get(d.domaine.id)?.couleur ?? d.domaine.couleur,
      });
      if (recommandations.length >= 3) break;
    }
    if (recommandations.length >= 3) break;
  }

  return {
    prenom: moi?.prenom ?? "",
    niveau: etatNiveau(moi?.xp ?? 0),
    xp: moi?.xp ?? 0,
    serie: serieJours(jours.map((j) => new Date(`${j.jour}T00:00:00Z`))),
    minutesSemaine: Math.round((semaine?.secondes ?? 0) / 60),
    formationsTerminees: terminees.n,
    certificats: certifs.n,
    noteGenerale: profil.noteGenerale,
    palier: profil.palier,
    domainesMesures: profil.domaines.filter((d) => d.niveau !== null).length,
    domainesTotal: profil.domaines.length,
    aReprendre: reprises,
    parcoursEnCours: parcoursTous.filter((p) => p.inscrit && !p.termineLe).slice(0, 2),
    actions,
    badgesRecents: recents,
    recommandations,
    evaluationsFroid: froid,
  };
}

/** Domaines à proposer quand le membre démarre de zéro. */
export async function domainesAProposer(limite = 4) {
  return db
    .select({ id: domaines.id, code: domaines.code, nom: domaines.nom, couleur: domaines.couleur, icone: domaines.icone })
    .from(domaines)
    .orderBy(domaines.ordre)
    .limit(limite);
}

/** Badges les plus rares décrochés par un petit nombre (pour la vitrine). */
export async function badgesConvoites(utilisateurId: string, limite = 3) {
  const miens = db
    .select({ badgeId: badgesObtenus.badgeId })
    .from(badgesObtenus)
    .where(eq(badgesObtenus.utilisateurId, utilisateurId));
  return db
    .select({
      id: badges.id,
      nom: badges.nom,
      couleur: badges.couleur,
      forme: badges.forme,
      matiere: badges.matiere,
      rarete: badges.rarete,
      effet: badges.effet,
      icone: badges.icone,
    })
    .from(badges)
    .where(
      and(
        eq(badges.actif, true),
        eq(badges.secret, false),
        inArray(badges.rarete, ["LEGENDAIRE", "MYTHIQUE"]),
        sql`${badges.id} not in ${miens}`
      )
    )
    .limit(limite);
}
