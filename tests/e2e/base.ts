import { existsSync } from "node:fs";
import postgres from "postgres";

/**
 * Accès direct à la base pour les tests de bout en bout.
 *
 * Deux besoins que le navigateur seul ne couvre pas :
 *   1. remettre une formation à zéro pour un membre, afin que le test du
 *      parcours complet puisse tourner deux fois de suite ;
 *   2. connaître les bonnes réponses d'un quiz — le serveur ne les envoie
 *      jamais avant la correction, c'est précisément ce qui rend le quiz
 *      sérieux. Les lire ici évite de tester avec des réponses au hasard.
 */

for (const fichier of [".env.local", ".env"]) {
  if (existsSync(fichier)) {
    try {
      process.loadEnvFile(fichier);
    } catch {
      // Fichier illisible : on continue avec l'environnement courant.
    }
  }
}

let client: ReturnType<typeof postgres> | null = null;

export function base() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL manquant : lancez les tests depuis la racine du projet.");
    client = postgres(url, { max: 1, onnotice: () => {} });
  }
  return client;
}

export async function fermerBase() {
  if (client) {
    await client.end();
    client = null;
  }
}

async function identifiants(email: string, slug: string) {
  const sql = base();
  const [u] = await sql<{ id: string }[]>`select id from utilisateur where email = ${email}`;
  const [f] = await sql<{ id: string }[]>`select id from formation where slug = ${slug}`;
  if (!u || !f) throw new Error(`Compte ou formation introuvable (${email}, ${slug}).`);
  return { utilisateurId: u.id, formationId: f.id };
}

/**
 * Remet la formation à zéro pour ce membre : visionnage, quiz, enquête, gains
 * de compétence et XP associés. Le test redevient rejouable à l'identique.
 */
export async function reinitialiserFormation(email: string, slug: string) {
  const sql = base();
  const { utilisateurId, formationId } = await identifiants(email, slug);

  await sql`delete from tentative_quiz where utilisateur_id = ${utilisateurId}
            and point_quiz_id in (select id from point_quiz where formation_id = ${formationId})`;
  await sql`delete from enquete where utilisateur_id = ${utilisateurId} and formation_id = ${formationId}`;
  await sql`delete from gain_formation where utilisateur_id = ${utilisateurId} and formation_id = ${formationId}`;
  await sql`delete from evenement_xp where utilisateur_id = ${utilisateurId} and ref_id = ${formationId}`;
  await sql`delete from progression where utilisateur_id = ${utilisateurId} and formation_id = ${formationId}`;

  return { utilisateurId, formationId };
}

export type Corrige = { enonce: string; type: string; bonnes: string[] };

/** Bonnes réponses (textes des options) par énoncé, pour une formation. */
export async function corriges(slug: string): Promise<Map<string, Corrige>> {
  const sql = base();
  const lignes = await sql<{ enonce: string; type: string; options: { texte: string; correcte: boolean }[] }[]>`
    select q.enonce, q.type, q.options
    from question q
    join point_quiz p on p.id = q.point_quiz_id
    join formation f on f.id = p.formation_id
    where f.slug = ${slug}`;

  const table = new Map<string, Corrige>();
  for (const l of lignes) {
    table.set(l.enonce, {
      enonce: l.enonce,
      type: l.type,
      bonnes: l.options.filter((o) => o.correcte).map((o) => o.texte),
    });
  }
  return table;
}

export async function statutProgression(email: string, slug: string) {
  const sql = base();
  const { utilisateurId, formationId } = await identifiants(email, slug);
  const [p] = await sql<{ statut: string; seuil_atteint: boolean; secondes_vues: number }[]>`
    select statut, seuil_atteint, secondes_vues from progression
    where utilisateur_id = ${utilisateurId} and formation_id = ${formationId}`;
  return p ?? null;
}

export async function nbGains(email: string, slug: string) {
  const sql = base();
  const { utilisateurId, formationId } = await identifiants(email, slug);
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from gain_formation
    where utilisateur_id = ${utilisateurId} and formation_id = ${formationId}`;
  return r?.n ?? 0;
}
