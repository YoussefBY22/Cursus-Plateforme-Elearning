<p align="center">
  <img src="docs/captures/02-accueil.png" alt="Tableau de bord d'un membre : à faire, reprise de la dernière formation, niveau et série" width="860">
</p>

# Cursus

**Une plateforme de formation en ligne qui mesure ce qu'on apprend vraiment.**

Les membres suivent des formations vidéo à quiz bloquants, voient leurs compétences
évoluer sur une échelle de 0 à 99 commune à toutes les organisations, gagnent des
badges et obtiennent des certificats vérifiables. Les équipes pédagogiques et les
responsables d'organisation pilotent l'activité avec des tableaux de bord, un suivi
des organisations et un mur de demandes de formation.

> Formez-vous. Mesurez-vous. Passez au niveau suivant.

Next 16 · React 19 · TypeScript strict · Tailwind 4 · PostgreSQL · Drizzle ORM · Auth.js · Vitest · Playwright

---

## Ce qui rend Cursus différent

La plupart des plateformes comptent des vidéos ouvertes. Cursus mesure un niveau.

- **Seul le temps réellement regardé compte.** Le navigateur propose, le serveur
  tranche : il recalcule tout à partir du temps réel écoulé, ne compte ni les sauts
  ni la lecture accélérée, et ne livre jamais les bonnes réponses avant la correction.
- **Les quiz bloquent la lecture.** Ils sont posés à la seconde près dans la vidéo :
  impossible de franchir un quiz qu'on n'a pas répondu.
- **Un niveau défendable.** Il combine l'auto-évaluation de départ, les scores de
  quiz, l'avis du formateur, la réévaluation après la formation et une part qui ne
  se consolide qu'à l'**évaluation à froid**, un mois plus tard. Un domaine non
  mesuré affiche un tiret, jamais un zéro inventé.
- **Les organisations restent comparables.** Les formations qu'une organisation
  anime elle-même passent par la même méthode de mesure que les formations en ligne.

---

## Parcours par rôle

### Les membres apprennent

<table>
  <tr>
    <td width="50%"><img src="docs/captures/07-lecteur.png" alt="Lecteur vidéo avec barre de progression et marqueur de quiz"><br><sub><b>Lecteur suivi</b> : la barre montre le temps réellement regardé et les quiz à franchir.</sub></td>
    <td width="50%"><img src="docs/captures/04-competences.png" alt="Carte de niveau et radar des compétences par domaine"><br><sub><b>Carte de niveau et radar</b> : une note générale, le détail par domaine, ce qui reste à mesurer.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/captures/03-catalogue.png" alt="Catalogue de formations avec filtres"><br><sub><b>Catalogue</b> : recherche, domaines, niveaux, durée, avancement personnel.</sub></td>
    <td><img src="docs/captures/05-badges.png" alt="Collection de badges"><br><sub><b>Badges</b> : formes, matières et raretés paramétrables, avec l'avancement vers les suivants.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/captures/06-demandes.png" alt="Mur des demandes de formation"><br><sub><b>Demandes de formation</b> : on propose un sujet manquant, les autres le soutiennent.</sub></td>
    <td><img src="docs/captures/08-certificat-public.png" alt="Page publique de vérification d'un certificat"><br><sub><b>Certificats vérifiables</b> : page publique accessible par un jeton aléatoire de 256 bits.</sub></td>
  </tr>
</table>

Un parcours certifiant enchaîne plusieurs formations et délivre un certificat PDF
(QR code, numéro, révocable sans effacer l'historique). Un annuaire et des profils
publics, avec réglages de visibilité, permettent de retrouver les formateurs et les
pairs. Les évaluations à froid arrivent 30 jours après la fin d'une formation, par
notification et par une relance quotidienne.

### Les formateurs créent

<table>
  <tr>
    <td width="50%"><img src="docs/captures/09-studio.png" alt="Espace formateur : liste des contenus et leur statut"><br><sub><b>Studio</b> : chaque contenu a son statut, et un refus garde son motif écrit.</sub></td>
    <td width="50%"><img src="docs/captures/10-editeur-quiz.png" alt="Éditeur de formation : source vidéo et quiz"><br><sub><b>Éditeur</b> : on colle un lien YouTube (ou un fichier) et on place les quiz dans la vidéo.</sub></td>
  </tr>
</table>

Un formateur soumet, il ne publie pas : tout contenu passe par la validation.

### Les organisations suivent leurs membres

<table>
  <tr>
    <td width="50%"><img src="docs/captures/11-organisation-membres.png" alt="Espace du responsable RH : rattachements et membres"><br><sub><b>Membres</b> : rattachements à confirmer, niveaux, dernière activité, export CSV.</sub></td>
    <td width="50%"><img src="docs/captures/12-organisation-formations-internes.png" alt="Formations internes de l'organisation"><br><sub><b>Formations internes</b> : mesurées comme les formations en ligne, avec garde-fous.</sub></td>
  </tr>
</table>

Le responsable RH peut aussi adapter le référentiel de compétences de son
organisation. La clôture d'une formation interne est refusée tant qu'aucune mesure
réelle n'existe : la plateforme ne fabrique pas de chiffre.

### L'équipe pédagogique pilote

<table>
  <tr>
    <td width="50%"><img src="docs/captures/13-pilotage.png" alt="Tableau de pilotage : indicateurs, formations terminées par mois, répartition par domaine"><br><sub><b>Pilotage</b> : activité, satisfaction, NPS, répartition par domaine.</sub></td>
    <td width="50%"><img src="docs/captures/14-carte-chaleur.png" alt="Carte de chaleur des niveaux moyens par domaine et par organisation"><br><sub><b>Carte de chaleur</b> : repérer où une organisation a besoin de formations.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/captures/15-suivi.png" alt="Suivi des organisations : état, tendance sur 30 jours, formations à l'arrêt"><br><sub><b>Suivi des organisations</b> : qui avance, qui ralentit, qui décroche, comparé aux 30 jours précédents.</sub></td>
    <td><img src="docs/captures/16-suivi-fiche.png" alt="Fiche d'une organisation : formations à l'arrêt et carnet de suivi"><br><sub><b>Fiche de suivi</b> : les formations laissées de côté, nommément, et un carnet daté.</sub></td>
  </tr>
  <tr>
    <td><img src="docs/captures/17-validation.png" alt="Validation d'un contenu : objectifs, compétences visées, questions et bonnes réponses"><br><sub><b>Validation</b> : tout pour décider sur place, bonnes réponses comprises.</sub></td>
    <td><img src="docs/captures/18-editeur-badge.png" alt="Éditeur de badge"><br><sub><b>Badges</b> : forme, matière, rareté, effet et critère d'obtention.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/captures/19-modele-certificat.png" alt="Éditeur de modèles de certificat sur canevas"><br><sub><b>Modèles de certificat</b> : éditeur sur canevas, jetons de données, QR code imposé et cadre commun verrouillé.</sub></td>
  </tr>
</table>

Le **chargé de suivi** voit le même écran de suivi, limité aux organisations de son
portefeuille ; seule l'équipe pédagogique attribue les portefeuilles. Le **super
admin** ajoute les paramètres globaux, les organisations, les comptes et les rôles.

### Thème sombre et mobile

<table>
  <tr>
    <td width="50%"><img src="docs/captures/20-competences-sombre.png" alt="Carte de niveau en thème sombre"><br><sub>Thèmes clair, sombre et système.</sub></td>
    <td width="25%"><img src="docs/captures/21-mobile-accueil.png" alt="Accueil sur téléphone"></td>
    <td width="25%"><img src="docs/captures/22-mobile-catalogue.png" alt="Catalogue sur téléphone"></td>
  </tr>
  <tr>
    <td colspan="3"><img src="docs/captures/01-connexion.png" alt="Page de connexion"><br><sub>Connexion et inscription : e-mail et mot de passe, Google en option, rattachement à une organisation validé par son responsable RH.</sub></td>
  </tr>
</table>

Les écrans principaux sont vérifiés sur mobile (aucun débordement horizontal) et chaque
écran de liste prévoit ses états vide, de chargement et d'erreur.

---

## Rôles

Les rôles sont cumulables et définis **en code** (`src/services/rbac.ts`) : personne ne
s'accorde un droit depuis une interface.

| Rôle | Ce qu'il fait |
| --- | --- |
| **Membre** | Apprend, passe les quiz, mesure ses compétences, gagne badges et certificats, propose des formations |
| **Formateur** | Crée ses formations et parcours dans le studio, soumis à validation |
| **Responsable RH** | Gère les membres de son organisation, son référentiel adapté, ses formations internes |
| **Chargé de suivi** | Suit un portefeuille d'organisations : santé, relances, carnet de suivi |
| **Responsable pédagogique** | Valide les contenus, pilote l'offre, arbitre les demandes, attribue les portefeuilles |
| **Super admin** | Tout, plus les paramètres globaux, les organisations et les comptes |

---

## Démarrage rapide

Prérequis : **Node 20+**, **Docker** (ou une base PostgreSQL 14+).

```bash
npm install
cp .env.example .env        # puis renseigner AUTH_SECRET (voir plus bas)
docker compose up -d        # PostgreSQL 16 en local
npm run setup               # migrations + jeu de démonstration (environ une minute)
npm run capsules            # génère les six vidéos de démonstration (ffmpeg requis)
npm run dev                 # http://localhost:3000
```

`AUTH_SECRET` est la seule variable obligatoire :

```bash
openssl rand -base64 32
```

Sans Docker, créez une base gratuite sur [Neon](https://neon.tech) et collez sa chaîne
de connexion dans `DATABASE_URL`.

### Comptes de démonstration

Mot de passe commun : `Cursus2026!`

| Compte | Rôle |
| --- | --- |
| `membre@cursus.test` | Membre |
| `formateur@cursus.test` | Formateur |
| `rh@aurora.test` | Responsable RH (organisation Aurora Conseil) |
| `suivi@cursus.test` | Chargé de suivi (portefeuille de quatre organisations) |
| `dc@cursus.test` | Responsable pédagogique |
| `admin@cursus.test` | Super admin |

Le semis crée 8 organisations, 50 comptes, 22 formations, des parcours, des
certificats, un historique d'activité simulé par les **mêmes moteurs que
l'application** (les chiffres affichés sont calculés, pas inventés), des notes de suivi
et des demandes de formation. Deux organisations sont volontairement en baisse
d'activité pour que l'écran de suivi ait quelque chose à relancer.

> Les capsules vidéo de démonstration sont générées par `npm run capsules`
> (diapositives rendues par Chromium, assemblées par ffmpeg). Le reste du catalogue
> référence des conférences publiques lues via YouTube.

---

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Construction et lancement en production |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires de la logique métier (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |
| `npm run db:migrate` | Applique les migrations SQL |
| `npm run db:seed` | (Re)charge le jeu de démonstration |
| `npm run db:reset` | Vide la base, remigre et resème |
| `npm run db:generate` | Génère une migration après modification du schéma |
| `npm run db:studio` | Explorateur de base (Drizzle Studio) |
| `npm run capsules` | Régénère les vidéos de démonstration |
| `npm run captures` | Régénère les captures d'écran de ce fichier |
| `npm run relances` | Envoie les relances d'évaluation à froid (à planifier) |

---

## Architecture

```
src/
  app/            Écrans (Next App Router). (app)/ = pages authentifiées.
  components/     Kit d'interface maison + composants métier par domaine.
  services/       Logique métier PURE et testée — aucun accès base.
  server/
    requetes/     Lectures (SQL → objets d'affichage).
    actions/      Actions serveur : permission, validation Zod, puis moteur.
    moteur/       Orchestrations métier (apprentissage, compétences, badges…).
  db/             Schéma Drizzle et client.
scripts/          Semis, migrations, relances, générateur de capsules.
docs/             Conventions de code et captures d'écran.
```

Deux règles tiennent l'ensemble :

1. **La logique métier est pure et testée.** Calcul d'un niveau, notation d'un quiz,
   plausibilité d'un relevé de visionnage, détection de pics d'activité, état de santé
   d'une organisation : tout vit dans `src/services`, sans base de données, et se teste
   en millisecondes.
2. **Le client propose, le serveur tranche.** Aucune donnée de mesure n'est crue sur
   parole.

**Pourquoi PostgreSQL et Drizzle.** Les données sont relationnelles et fortement
contraintes : une contrainte d'unicité garantit qu'une formation n'accorde ses points
de compétence qu'une seule fois. Le schéma TypeScript est la source de vérité, les
migrations sont du SQL lisible et versionné dans `drizzle/`, et aucun binaire natif
n'est à télécharger. Les choix structurants sont expliqués dans
[DECISIONS.md](DECISIONS.md).

---

## Sécurité

- Permissions en code, vérifiées à chaque page et à chaque action serveur
  (`exigerPermissionPage`, `exigerPermission`).
- Entrées validées avec Zod ; mots de passe hachés (bcrypt) ; jetons de vérification
  d'e-mail stockés hachés.
- Certificats ouverts par un jeton aléatoire de 256 bits : l'URL n'est pas devinable.
- Écritures significatives journalisées (`journaliser`).
- Rien ne se supprime quand cela fait foi : on archive ou on révoque.

---

## Tests

```bash
npm test          # plus de 260 tests de logique métier, en quelques secondes
npm run build     # obligatoire avant les tests de bout en bout
npm run test:e2e  # 34 parcours : bureau et mobile (Playwright)
```

Les tests de bout en bout tournent contre le serveur de **production** et s'appuient
sur les comptes de démonstration : lancez `npm run setup` avant. L'un d'eux regarde
réellement une vidéo, franchit le quiz bloquant, réussit le quiz final, remplit
l'enquête et vérifie en base que les gains de compétence sont écrits.

---

## Tâche planifiée

Les évaluations à froid partent 30 jours après la fin d'une formation. Appelez
`npm run relances` une fois par jour, ou la route `/api/cron/relances` protégée par
`CRON_SECRET` (déjà déclarée dans `vercel.json`).

---

## Mise en ligne

Pile pensée pour les offres gratuites : **Vercel** pour l'application, **Neon** pour
PostgreSQL.

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | la chaîne de connexion Neon |
| `AUTH_SECRET` | `openssl rand -base64 32` — une valeur neuve, jamais celle du développement |
| `AUTH_URL` / `APP_URL` | l'URL publique (encodée dans les QR codes des certificats) |
| `APP_TIMEZONE` | fuseau d'affichage des dates publiques (défaut : `UTC`) |
| `CRON_SECRET` | une chaîne aléatoire, pour protéger les relances |
| `STOCKAGE` | `base` sur Vercel (le disque est éphémère) |
| `RESEND_API_KEY` | facultatif ; sans elle, les e-mails restent en console |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | facultatif ; vide = bouton Google masqué |

Les migrations ne tournent pas toutes seules :
`DATABASE_URL="<chaîne>" npm run db:migrate` à chaque déploiement qui en ajoute une.
Ne lancez **jamais** `db:seed` ni `db:reset` sur une base de production.

---

## Feuille de route

Voir [ROADMAP.md](ROADMAP.md).
