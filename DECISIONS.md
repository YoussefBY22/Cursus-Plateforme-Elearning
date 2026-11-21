# Décisions et hypothèses

Les choix structurants de Cursus, et ce qui a été tranché faute de réponse.
Chaque hypothèse marquée **(hypothèse)** est un défaut raisonnable, pas une
certitude : elle se change sans refonte.

---

## 1. Socle technique

**PostgreSQL + Drizzle, plutôt qu'une base de documents.** Les règles métier
d'ici sont des contraintes relationnelles (« une formation ne fait gagner ses
points qu'une fois », « un membre note une formation une seule fois »), et une
contrainte d'unicité les fait respecter mieux que du code applicatif. S'y ajoute
un hébergement gratuit durable.

**Next.js en App Router, sans API REST séparée.** Les écrans lisent par des
fonctions serveur (`src/server/requetes`) et écrivent par des actions serveur
(`src/server/actions`). Aucun point d'entrée HTTP public n'est exposé sans
raison. Si un système tiers doit se brancher, on ajoutera une API dédiée
par-dessus le moteur, sans toucher ni aux écrans ni aux règles.

**Logique métier pure et séparée.** `src/services` ne connaît ni la base ni le
réseau : des entrées, des sorties, des tests. C'est ce qui permet de tester la
formule de compétences ou l'anti-triche du visionnage sans base de données.

---

## 2. Ce qui empêche de tricher

C'est le sujet le plus sensible : si les compétences se gagnent en laissant une
vidéo tourner, elles ne valent rien.

- **Le temps regardé, pas la position atteinte.** Le lecteur envoie les
  intervalles réellement lus. Le serveur les recoupe avec le temps réel écoulé
  depuis la dernière synchronisation : un client modifié qui annonce « j'ai vu
  0 → 7200 » dix secondes après la précédente synchronisation est rogné à dix
  secondes × vitesse maximale.
- **Les quiz barrent la route.** La lecture s'arrête sur chaque quiz non fait,
  le curseur ne peut pas le franchir, et le serveur applique la même barrière
  côté correction. Même fonction (`exigerAccesQuiz`) pour ouvrir le quiz et pour
  le corriger : impossible qu'elles divergent.
- **Les bonnes réponses ne quittent pas le serveur** avant correction. Les
  questions sont servies sans le marqueur `correcte`, et le détail d'un quiz
  final ne se révèle qu'une fois réussi — sinon on l'apprend par cœur en
  échouant volontairement.
- **La vitesse est plafonnée** (×2 par défaut) : au-delà, le temps ne compte pas.
- **Seule la première tentative de chaque quiz** alimente le calcul de
  compétences.

Seuil de validation : **90 % de la vidéo réellement vue** *(hypothèse,
paramétrable)*.

---

## 3. La méthode standardisée de compétences

Le détail de la formule, de ses pondérations et de ses garde-fous est commenté
en tête de `src/services/competences.ts` — c'est la référence, et elle est
testée. Les décisions de fond :

- **Échelle 0–99** affichée partout, auto-évaluation saisie de 1 à 10. Deux
  échelles distinctes, pour qu'on ne confonde jamais ce qu'on déclare et ce
  qu'on vaut.
- **La même fonction calcule les formations Cursus et les formations externes**
  saisies par un responsable RH. Sans cela, les deux ne seraient pas
  comparables et le référentiel perdrait son sens.
- **Un gain partiel reste provisoire** : 80 % acquis tout de suite, 20 %
  seulement si l'évaluation à froid (30 jours, *hypothèse*) confirme la mise en
  pratique. C'est ce qui distingue « j'ai suivi » de « je sais faire ».
- **Se surnoter ne paie pas** : la réévaluation finale est plafonnée au-dessus
  des mesures objectives, et sans mesure objective le gain possible est divisé
  par deux.
- **Un recul est amorti** : une mauvaise journée fait baisser bien plus
  lentement qu'une bonne ne fait monter.
- **« Je ne connais pas » est une réponse valable** à l'auto-évaluation, et une
  question laissée expirer aussi. Forcer un chiffre produirait du bruit.
- L'auto-évaluation est **chronométrée** (10 s par question, *hypothèse*) et le
  serveur revérifie les durées : c'est ce qui rend le recours à une IA inutile,
  bien plus qu'une consigne.

Toutes les pondérations sont modifiables par le super admin. Changer la formule
ne recalcule pas le passé : les niveaux déjà acquis restent, les suivants
suivent la nouvelle règle.

---

## 4. Vidéos

**Fournisseur abstrait.** `src/components/video` sépare le descriptif
(`fournisseurs.ts`) de l'exécution (`pilotes.ts`). Deux fournisseurs existent :
YouTube (API IFrame, domaine sans cookie publicitaire) et fichier MP4/WebM.
Ajouter Vimeo, Cloudflare Stream ou un stockage objet, c'est un descripteur et
un pilote — le lecteur, le suivi et les quiz ne parlent qu'à l'interface
`ControleVideo`.

**YouTube non répertorié par défaut** *(hypothèse)* : le stockage et la bande
passante sont le vrai risque budgétaire d'une plateforme de formation, et Google
les offre. Les capsules courtes du jeu de démonstration sont des fichiers
locaux, ce qui permet de tester le lecteur sans dépendre du réseau. Elles sont
produites par `npm run capsules` (diapositives rendues par Chromium, assemblées
par ffmpeg) : le rendu est déterministe, donc les points de quiz restent calés
à la seconde près sur la vidéo.

---

## 5. Certificats

- Le QR code mène à `/v/<jeton>` où le jeton fait **256 bits aléatoires** : une
  URL de vérification ne se devine pas et ne s'énumère pas. Un numéro
  séquentiel lisible (`CUR-2026-000042`) existe en parallèle, pour l'humain.
- **Un certificat se révoque, il ne s'efface pas** : la page de vérification dit
  alors clairement qu'il ne vaut plus, ce qui est le comportement utile pour un
  recruteur.
- Le modèle est **figé à l'émission** (canevas et données recopiés) : retoucher
  le modèle plus tard ne réécrit pas les certificats déjà délivrés.
- Signataires par défaut : la direction et le responsable pédagogique
  *(hypothèse, paramétrable)*.

---

## 6. Rôles et permissions

Six rôles cumulables : super admin, responsable pédagogique, chargé de suivi,
formateur, responsable RH d'organisation, membre. Le chargé de suivi lit et
écrit dans le suivi mais ne peut pas s'attribuer un portefeuille : cette action
(`suivi:valider`) reste au responsable pédagogique. La matrice est **en code** (`src/services/rbac.ts`), donc
versionnée et relue en revue — personne ne s'accorde un droit depuis une
interface. Deux modules sensibles (utilisateurs, paramètres) sont exclus des
permissions génériques : il faut un droit explicite.

**Inscription ouverte** *(hypothèse)* : chacun s'inscrit en choisissant son organisation,
vérifie son e-mail, et le responsable RH de cette organisation valide le rattachement. Un
compte non rattaché voit la plateforme mais ne compte pour aucune organisation.

---

## 7. Interface

- Charte Cursus : indigo `#4F46E5` en action principale, encre `#0F1226` en
  barre latérale, turquoise en renfort, Montserrat (licence OFL). Les jetons de
  couleur sont définis une fois dans `globals.css`, en clair et en sombre.
- **Aucune bibliothèque de graphiques** : les courbes, anneaux et radars sont
  des SVG écrits à la main. Moins de poids, et un rendu qui suit la charte au
  lieu d'imposer la sienne.
- Chaque écran de liste prévoit ses trois états : vide, chargement, erreur. Un
  état vide dit toujours **quoi faire**, jamais seulement qu'il n'y a rien.
- Logo isolé dans un composant `<Logo />` : un symbole SVG (un escalier, comme
  un niveau qui monte) et un mot-symbole en texte qui suit le thème. Un autre
  logo se branche en remplaçant ce seul fichier.

---

## 8. Ce qui a été volontairement écarté

- **Messagerie interne.** Les membres se contactent par LinkedIn ou WhatsApp
  depuis leur profil. Une messagerie à modérer est un produit en soi.
- **Téléversement des vidéos sur la plateforme.** Trop coûteux pour le gain ;
  l'abstraction permet d'y venir si le besoin se confirme.
- **Permissions stockées en base.** Elles seraient modifiables sans revue.

---

## 9. Décisions prises en construisant les écrans

- **Enregistrer et soumettre sont deux gestes séparés** (studio). Un brouillon
  incomplet s'enregistre sans rien exiger ; c'est la soumission qui réclame que
  tout soit là. Construire une formation prend plusieurs séances, et perdre son
  travail parce qu'une question n'est pas finie serait absurde. La liste de ce
  qui manque est calculée côté client avec **la même fonction** que le serveur
  (`manquesFormation`) : l'écran ne peut donc pas promettre autre chose que ce
  qui bloquera vraiment.
- **Les quiz se posent dans la vidéo, pas dans un formulaire.** Le formateur
  lit, s'arrête, et « Placer un quiz ici » reprend la position réelle du
  lecteur. Saisir un horodatage à l'aveugle donne toujours des points posés à
  côté.
- **Un badge non obtenu affiche son avancement** (« 5 des 6 domaines
  explorés »). Une silhouette grise ne dit rien ; c'est l'écart restant qui
  donne envie de le combler. Les badges secrets, eux, ne révèlent ni nom ni
  critère avant d'être décrochés — c'est leur raison d'être.
- **L'évaluation à froid s'annonce chiffrée** : « 3,8 points de compétence en
  jeu ». Un formulaire présenté comme une corvée administrative ne se remplit
  pas ; la même demande, avec son enjeu réel, se remplit.
- **Le tableau de bord répond d'abord à « que faire maintenant ? »** Le bloc
  « à faire » passe avant les statistiques, et chaque chiffre affiché mène
  quelque part. Un tableau de bord qui ne raconte que le passé ne sert qu'une
  fois.
- **Un profil masqué et un profil inexistant répondent la même chose.** Rien ne
  permet de deviner qui existe mais se cache.
- **Champs de formulaire contrôlés partout où une action peut échouer.**
  React 19 réinitialise un formulaire dès que son action se termine : sans cela,
  une erreur de validation à l'inscription fait tout retaper. Défaut trouvé par
  les tests de bout en bout, pas à la relecture.
- **Les grilles ont toujours un nombre de colonnes explicite** (`grid-cols-1`).
  Une piste `auto` prend la largeur minimale de son contenu : sur téléphone, une
  carte un peu large élargissait la colonne et faisait déborder la page entière.
- **Les couleurs de domaine sont éclaircies sur fond sombre**
  (`color-mix(... white)`). Elles sont pensées pour un fond clair ; telles
  quelles, un domaine sombre devenait illisible sur la carte de niveau.

---

## 10. Suivi des organisations et demandes de formation

La logique vit dans `src/services/tendances.ts` (pure, testée) ; les écrans ne
font que l'afficher.

- **On compare à la période précédente, jamais à zéro.** Quand la période
  d'avant est vide, la variation relative n'existe pas : on affiche l'écart
  brut plutôt qu'un « +∞ % » trompeur. En dessous de 5 % d'écart, on refuse
  de parler de tendance.
- **Un état, pas un score.** Une organisation est *active*, *ralentie* (moins
  d'un tiers de ses membres se forment, ou deux semaines de silence), *en
  décrochage* (30 jours de silence) ou *jamais démarrée*. Une étiquette dit où
  aller ; un nombre composite demanderait une notice.
- **Les pics se détectent à l'écart-type**, pas à l'œil : un jour compte comme
  un pic au-dessus de la moyenne de plus de 1,5 écart-type. Une série plate n'en
  a pas, et un creux n'est pas un pic.
- **Le suivi nomme les personnes.** « 3 formations à l'arrêt » ne donne rien à
  faire ; la fiche liste qui, sur quelle formation, à quel avancement, depuis
  combien de jours.
- **Le carnet est daté et signé.** Les chiffres disent qu'une organisation
  ralentit, pas pourquoi (passation, examens). Les notes survivent au
  changement de mandat.
- **Le classement des demandes mêle trois signaux** : les soutiens, la portée
  (le logarithme du nombre d'organisations concernées : un besoin partagé
  compte plus qu'un besoin isolé) et la fraîcheur (demi-vie de 60 jours : une
  vieille demande ne campe pas en tête).
- **Une réponse écrite est obligatoire**, même pour accepter une demande : une
  demande qui disparaît sans explication décourage la suivante. Tous les
  soutiens sont prévenus, pas seulement l'auteur.

---

## 11. Limites connues
- Les identifiants internes (`jeId`, `juniorEntreprises`, la table
  `junior_entreprise`) gardent le nom historique du concept d'organisation.
  Seuls l'interface, les routes et les données sont généralisés ; le reste est
  un renommage mécanique à faire en une fois avec un outil de refactoring
  plutôt qu'à la main.
- Le stockage de fichiers est local (`./uploads`) *(hypothèse)* : suffisant en
  développement, à remplacer par un stockage objet en production.
- Sans clé Resend, les e-mails s'affichent dans la console du serveur plutôt que
  de partir — pratique en développement, à ne pas oublier en production.
- Les tests de bout en bout vérifient que les parcours aboutissent et qu'aucun
  écran ne déborde sur téléphone ; ils ne jugent pas le rendu. Les captures
  d'écran restent la façon de contrôler l'aspect.
- Le lecteur vidéo n'est pas couvert de bout en bout au-delà de son ouverture :
  YouTube n'est pas joignable depuis un environnement de test isolé. Le suivi du
  visionnage et les barrières de quiz sont en revanche testés unitairement, côté
  logique pure.
- Les étapes d'un parcours se réordonnent par boutons plutôt qu'au glisser-
  déposer : deux boutons marchent au clavier et sur téléphone, le glisser non.
