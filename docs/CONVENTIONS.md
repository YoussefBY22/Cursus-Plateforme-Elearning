# Conventions de code — Cursus

À lire avant d'écrire du code.

## Pile
- **Next 16.2** (App Router, Turbopack), **React 19.2**, TypeScript strict, **Tailwind v4**.
  - `params` / `searchParams` sont des **Promise** : `export default async function Page({ params }: PageProps<"/route/[id]">) { const { id } = await params; }`.
  - Route handlers : `export async function GET(req: Request, ctx: RouteContext<"/api/x/[id]">) { const { id } = await ctx.params; }`.
  - Après une mutation : `revalidatePath("/chemin")` (de `next/cache`) ou `refresh()` (de `next/cache`, rafraîchit le routeur client depuis une action).
  - Pas de `middleware.ts` (renommé `proxy.ts` en Next 16) — les gardes sont dans les pages/actions.
  - Après avoir ajouté une route, lancez `npx next typegen` pour que `PageProps<"/…">` connaisse la route.
- **Drizzle ORM + PostgreSQL** (pas Prisma). Schéma : `src/db/schema.ts` ; client : `import { db } from "@/db"`, tables : `import { formations, ... } from "@/db/schema"`.
  - Requêtes : `db.select().from(t).where(and(eq(...)))`, `db.insert(t).values(...).returning()`, `db.update(t).set(...).where(...)`.
  - API relationnelle disponible : `db.query.formations.findMany({ with: { domaine: true } })`.
  - **Toute modification du schéma passe par une migration** : modifiez `src/db/schema.ts`, lancez `npm run db:generate`, relisez le SQL produit, puis `npm run db:migrate`.
- Validation **Zod v4** à l'entrée de chaque action serveur (`z.email()`, `z.string().min()`, …).
- Icônes : `lucide-react` ; pour un nom dynamique, `<Icone nom="Award" />` de `@/components/icones`.

## Arborescence
- `src/services/**` : logique PURE testée (aucun accès base). Tests `*.test.ts` à côté (vitest).
- `src/server/**` : code serveur (base, e-mail, moteurs). `src/server/actions/*.ts` = actions serveur (`"use server"` en tête, n'exporter QUE des fonctions async).
- `src/server/moteur/*` : orchestrations métier (apprentissage, compétences, gamification, certificats). Réutilisez-les.
- `src/components/ui/*` : kit d'interface maison (voir ci-dessous). `src/components/<domaine>/*` : composants métier.
- Pages authentifiées : `src/app/(app)/…` (le layout fournit barre latérale + barre du haut).

## Sécurité (obligatoire)
- Page protégée : `const u = await exigerPermissionPage("module", "lire")` ou `exigerSession()` (de `@/server/session`).
- Action serveur : `const u = await exigerPermission("module", "ecrire")` puis Zod, puis vérifications d'appartenance (ex. un RH ne touche qu'à SA organisation : `u.jeId`).
- Modules RBAC (`src/services/rbac.ts`) : apprentissage, annuaire, studio, validation, moderation, badges, certificats, referentiel, rh, suivi, rapports, utilisateurs, parametres. Rôles : SUPER_ADMIN, RESP_PEDAGO, CHARGE_SUIVI, FORMATEUR, RESP_RH, MEMBRE (cumulables, `u.roles`).
- Erreurs montrables : `throw new ErreurMetier("message")` (`@/lib/resultat`) ; côté formulaire, retournez `Resultat` (`{ ok, erreur, erreurs, message }`).
- Journalisez les écritures significatives : `journaliser({ acteurId, action, entite, entiteId, details })` (`@/server/journal`).
- Notifications : `notifier([ids], { type, titre, message, lien, email?, cle? })` (`@/server/notifications`).
- **Rien ne se supprime vraiment** quand ça fait foi : archiver / désactiver, avec confirmation (`BoutonConfirme`).

## Interface (design system)
Charte Cursus : indigo `#4f46e5` (action principale, `bg-primary`), encre `#0f1226` (`bg-nuit`), turquoise en renfort, police Montserrat.
Jetons Tailwind (définis dans `src/app/globals.css`, clair + sombre) : `bg-background`, `bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-primary`/`text-primary`/`bg-primary-soft`, `bg-nuit`, `text-success`/`bg-success-soft`, `warning`, `danger`, `or` (XP/badges), `turquoise`.
**N'écrivez jamais de couleur en dur pour le fond ou le texte d'interface** (sauf aplats de marque comme `#4f46e5` sur fond nuit) : le thème sombre doit marcher.

Composants (`@/components/ui/...`) :
- `bouton.tsx` : `<Bouton variante="primaire|nuit|contour|fantome|danger|succes" taille="sm|md|lg|icone">`, `<LienBouton href>` (même API), `classesBouton()`.
  Règle : l'action principale d'un écran est UN bouton `primaire` (plein). Le reste en `contour`/`fantome`.
- `bouton-soumission.tsx` : `<BoutonSoumission enCours="Enregistrement…">` dans un `<form action>` (affiche l'attente).
- `champ.tsx` : `Champ` (input), `ZoneTexte`, `Selecteur`, `Etiquette`, `Groupe id label aide erreur` (relie libellé + erreur), `CaseACocher label description`.
- `carte.tsx` : `Carte`, `EnteteCarte titre description action`, `CorpsCarte`.
- `entete-page.tsx` : `<EntetePage titre description actions retour={{href, libelle}} />` — en tête de chaque page.
- `etat-vide.tsx` : `<EtatVide icone titre description action />` — **aucune liste vide ne reste muette, la phrase dit quoi faire** ; `<EtatErreur>`.
- `pastille.tsx` : `<Pastille ton="neutre|primaire|nuit|succes|alerte|danger|or|contour" couleur?>` (statuts, tags).
- `avatar.tsx` : `<Avatar nom photo taille="xs|sm|md|lg|xl|xxl" />`.
- `stat.tsx` : `<Stat libelle valeur indice icone accent />`.
- `barre-progression.tsx` : `<BarreProgression valeur={0..1} />`, `<Anneau valeur>…</Anneau>`.
- `onglets.tsx` : `<Onglets onglets={[{cle, libelle, href, compteur}]} actif="cle" />` (état dans l'URL).
- `dialogue.tsx` : `<Dialogue ouvert onFermer titre description>` (client).
- `confirmation.tsx` : `<BoutonConfirme action={actionServeur} champs={{id}} message titre libelleConfirmation>` (client).
- `toasts.tsx` : `toast({ titre, description, ton: "succes"|"info"|"erreur" })` (client, n'importe où).
- `tableau.tsx` : `<Tableau lignes cleLigne colonnes rechercheTexte filtres lienLigne exportCsv />` (client ; colonnes avec `rendu`, `valeurTri`, `valeurCsv`).
- `squelette.tsx` : `<Squelette className />` pour les `loading.tsx`.
- `@/components/gamification/badge-visuel` : `<BadgeVisuel apparence={{forme, matiere, rarete, effet, couleur, icone}} taille={72} verrouille? />`.
- Utilitaires `@/lib/utils` : `cn`, `slugifier`, `nomComplet`, `formaterDate`, `depuis`, `pluriel`, `initiales`. CSV : `@/lib/csv` (`versCsv`, `telechargerCsv`).

Style rédactionnel : français, phrases courtes, à la voix active ; boutons = verbe d'action précis (« Enregistrer le badge », « Révoquer le certificat »), le toast reprend le même verbe (« Badge enregistré »). Pas de libellés en MAJUSCULES, pas d'« eyebrow » décoratif, pas de flèche « → » dans les boutons. Titres de page : `EntetePage`. Mise en page : `grid gap-4/gap-6`, cartes `rounded-2xl border bg-card`, peu d'ombres.
États : prévoir **vide**, **chargement** (`loading.tsx` avec `Squelette`) et **erreur** pour chaque écran de liste.
Responsive : tout doit fonctionner à 375 px de large (tables : `overflow-x-auto`, grilles qui passent en 1 colonne).
Accessibilité : libellés reliés, `aria-label` sur les boutons-icônes, focus visible (déjà global).

## Vérification
- `npx tsc --noEmit -p .` doit passer (lancez `npx next typegen` d'abord si vous avez ajouté des routes).
- `npx vitest run` doit passer ; ajoutez des tests pour toute logique pure nouvelle (`src/services/...`).
- **Un seul serveur à la fois dans ce dossier** : `next dev` et `next build` écrivent tous deux dans `.next`. Arrêtez l'un avant de lancer l'autre, sinon `tsc` lit des types de routes à moitié écrits.
- Base de dev : `DATABASE_URL` dans `.env` (PostgreSQL local déjà semé ; comptes : admin@cursus.test, dc@cursus.test, suivi@cursus.test, formateur@cursus.test, rh@aurora.test, membre@cursus.test — mot de passe `Cursus2026!`). Pour inspecter : `psql "$DATABASE_URL"`.
