# Feuille de route — Cursus

> Une case cochée = construit ET vérifié (types + tests).

## Organisation du dépôt

Un chantier = une branche. `main` reste la branche de référence et ne reçoit que
des fusions relues. Avant de fusionner : `npm run typecheck`, `npm test`, et
`npm run build` suivi de `npm run test:e2e`.

## Phase 1 — Socle
- [x] Next 16 + React 19 + TypeScript strict + Tailwind v4, Montserrat embarquée
- [x] PostgreSQL + Drizzle ORM (migrations SQL versionnées dans `drizzle/`)
- [x] Authentification Auth.js v5 (e-mail + mot de passe, Google optionnel), vérification d'e-mail
- [x] RBAC en code (6 rôles cumulables), gardes serveur
- [x] Coquille : barre latérale, barre du haut, cloche, thème clair, sombre ou système
- [x] Semis réaliste : 8 organisations, 50 comptes, 22 formations, parcours, activité simulée par les vrais moteurs

## Phase 2 — Vidéo, quiz, catalogue
- [x] Abstraction de fournisseur vidéo (YouTube IFrame API + fichier MP4/WebM)
- [x] Catalogue (recherche, filtres), page formation, notation par étoiles au quart de point, commentaires
- [x] Lecteur suivi : marqueurs de quiz bloquants, reprise exacte, quiz final, enquête à chaud
- [x] Parcours certifiants (tracé des étapes)
- [x] Studio formateur : éditeur de formation (vidéo, quiz placés à la seconde, compétences) et de parcours
- [x] Écran de validation : examen sur place (vidéo, objectifs, questions et bonnes réponses), publication ou refus motivé
- [x] Évaluation à froid côté membre et relance quotidienne
- [x] Générateur de capsules vidéo de démonstration (`npm run capsules`)

## Phase 3 — Compétences
- [x] Méthode standardisée (formule + garde-fous, testée), formations internes saisies par l'organisation, export CSV
- [x] Auto-évaluation chronométrée, radar interactif, détail par compétence
- [x] Mesure avant/après des formations internes, gains à la clôture

## Phase 4 — Gamification et réseau
- [x] Tableau de bord d'accueil (à faire, reprises, conseils, série, compétences)
- [x] XP, niveaux, badges paramétrables (moteur + éditeur), célébrations, notifications
- [x] Profil (visibilité, frise chronologique), profil public, annuaire filtrable
- [x] Liste et profil des formateurs (satisfaction, formations animées, WhatsApp)
- [x] Collection de badges (avancement vers les badges restants) et page des notifications

## Phase 5 — Certificats
- [x] Éditeur de modèles sur canevas, émission, QR à jeton, vérification publique, PDF, révocation

## Phase 6 — Suivi et demandes
- [x] Suivi des organisations : état de santé, tendance sur 30 jours, formations à l'arrêt, export CSV
- [x] Fiche de suivi par organisation et carnet de suivi daté
- [x] Rôle de chargé de suivi, limité à son portefeuille ; attribution réservée à l'équipe pédagogique
- [x] Mur des demandes de formation : propositions, soutiens, classement (soutiens, portée, fraîcheur), réponse écrite obligatoire
- [x] Logique d'analyse pure et testée : comparaison de périodes, pics d'activité, profils horaires, courbe de décrochage vidéo

## Vérification
- [x] `npm run build`, `npm run typecheck` et `npm test` passent (plus de 260 tests unitaires)
- [x] 34 tests de bout en bout : parcours critiques (bureau), écrans sur mobile, suivi et demandes
- [x] Un parcours complet testé pour de vrai : vidéo regardée, quiz bloquant, quiz final, enquête, formation validée, gains vérifiés en base
- [x] Captures d'écran reproductibles (`npm run captures`)

## Prochaines étapes
- [ ] Écran « Tendances » : formations en cours en direct, les plus suivies, pics d'activité par jour et par heure
- [ ] Courbe de décrochage affichée au formateur sur ses propres formations
- [ ] Alertes : contenus en validation qui traînent, évaluations à froid en retard
- [ ] Besoins de l'organisation : domaines non couverts, demandes de ses membres, comparaison à la moyenne
- [ ] Clé Resend pour l'envoi réel des e-mails
- [ ] Renommer les identifiants internes hérités (`jeId`, `juniorEntreprises`) en `organisationId`, `organisations` avec un outil de refactoring

## Pistes à l'étude : intelligence artificielle

Toutes s'appuient sur des données que la plateforme collecte déjà, et gardent un
humain qui valide.

- **Atelier de cadrage.** À partir des écarts de compétences d'une organisation,
  de ses demandes et du catalogue, générer une feuille de route de montée en
  compétences, des termes de référence ou un cahier des charges de formation.
  Chaque affirmation cite sa source (donnée, date, document), un vérificateur
  recalcule les chiffres cités, et rien n'est publié sans relecture et validation
  section par section.
- **Quiz à partir de la transcription.** Proposer des quiz placés dans la vidéo,
  chacun avec l'extrait horodaté qui justifie la bonne réponse, que le formateur
  relit dans l'éditeur existant.
- **Diagnostic adaptatif.** Raccourcir l'auto-évaluation par un test adaptatif
  fondé sur la théorie de réponse à l'item, calibrée sur les tentatives réelles.
- **Explication du décrochage.** Relier le moment où l'audience chute à
  l'extrait de transcription correspondant et suggérer une retouche.
- **Tuteur ancré dans la vidéo.** Répondre aux questions d'un apprenant en citant
  les passages horodatés, refuser hors sujet et orienter vers le formateur.
