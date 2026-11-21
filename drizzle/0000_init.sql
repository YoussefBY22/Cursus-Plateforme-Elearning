CREATE TYPE "public"."contexte_auto_evaluation" AS ENUM('INITIALE', 'FINALE', 'LIBRE');--> statement-breakpoint
CREATE TYPE "public"."niveau_formation" AS ENUM('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE');--> statement-breakpoint
CREATE TYPE "public"."statut_contenu" AS ENUM('BROUILLON', 'EN_VALIDATION', 'PUBLIE', 'REFUSE', 'ARCHIVE');--> statement-breakpoint
CREATE TYPE "public"."statut_progression" AS ENUM('EN_COURS', 'ENQUETE_REQUISE', 'TERMINEE');--> statement-breakpoint
CREATE TYPE "public"."statut_rattachement" AS ENUM('EN_ATTENTE', 'VALIDE', 'REFUSE');--> statement-breakpoint
CREATE TYPE "public"."statut_signalement" AS ENUM('OUVERT', 'MASQUE', 'REJETE');--> statement-breakpoint
CREATE TYPE "public"."type_enquete" AS ENUM('CHAUD', 'FROID');--> statement-breakpoint
CREATE TYPE "public"."type_question" AS ENUM('CHOIX_UNIQUE', 'CHOIX_MULTIPLE', 'VRAI_FAUX');--> statement-breakpoint
CREATE TYPE "public"."type_quiz" AS ENUM('INTEGRE', 'FINAL');--> statement-breakpoint
CREATE TABLE "activite_jour" (
	"utilisateur_id" text NOT NULL,
	"jour" date NOT NULL,
	"secondes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activite_jour_utilisateur_id_jour_pk" PRIMARY KEY("utilisateur_id","jour")
);
--> statement-breakpoint
CREATE TABLE "auto_evaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"domaine_id" text NOT NULL,
	"contexte" "contexte_auto_evaluation" DEFAULT 'INITIALE' NOT NULL,
	"formation_id" text,
	"participation_externe_id" text,
	"secondes_par_question" integer DEFAULT 10 NOT NULL,
	"demarree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"terminee_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"nom" text NOT NULL,
	"description" text NOT NULL,
	"couleur" text NOT NULL,
	"forme" text DEFAULT 'ROND' NOT NULL,
	"matiere" text DEFAULT 'BRONZE' NOT NULL,
	"rarete" text DEFAULT 'COMMUN' NOT NULL,
	"effet" text DEFAULT 'AUCUN' NOT NULL,
	"icone" text DEFAULT 'Award' NOT NULL,
	"critere_code" text NOT NULL,
	"seuil" double precision DEFAULT 1 NOT NULL,
	"parametre" text,
	"xp_bonus" integer DEFAULT 0 NOT NULL,
	"secret" boolean DEFAULT false NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badge_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "badge_obtenu" (
	"utilisateur_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"obtenu_le" timestamp with time zone DEFAULT now() NOT NULL,
	"celebre" boolean DEFAULT false NOT NULL,
	CONSTRAINT "badge_obtenu_utilisateur_id_badge_id_pk" PRIMARY KEY("utilisateur_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "certificat" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"jeton" text NOT NULL,
	"utilisateur_id" text NOT NULL,
	"parcours_id" text NOT NULL,
	"modele_id" text NOT NULL,
	"donnees" jsonb NOT NULL,
	"canevas" jsonb NOT NULL,
	"couleur_theme" text NOT NULL,
	"emis_le" timestamp with time zone DEFAULT now() NOT NULL,
	"revoque_le" timestamp with time zone,
	"motif_revocation" text,
	"revoque_par_id" text,
	"consultations" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "certificat_numero_unique" UNIQUE("numero"),
	CONSTRAINT "certificat_jeton_unique" UNIQUE("jeton")
);
--> statement-breakpoint
CREATE TABLE "commentaire" (
	"id" text PRIMARY KEY NOT NULL,
	"formation_id" text NOT NULL,
	"auteur_id" text NOT NULL,
	"parent_id" text,
	"texte" text NOT NULL,
	"masque" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competence" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"nom" text NOT NULL,
	"description" text,
	"question" text,
	"pistes" text,
	"domaine_id" text NOT NULL,
	"je_id" text,
	"source_id" text,
	"ordre" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "competence_code_je_uq" UNIQUE NULLS NOT DISTINCT("code","je_id")
);
--> statement-breakpoint
CREATE TABLE "critere_badge" (
	"code" text PRIMARY KEY NOT NULL,
	"libelle" text NOT NULL,
	"description" text NOT NULL,
	"unite" text NOT NULL,
	"parametre" text DEFAULT 'AUCUN' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domaine" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"nom" text NOT NULL,
	"description" text,
	"couleur" text NOT NULL,
	"icone" text DEFAULT 'Sparkles' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "domaine_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "enquete" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"formation_id" text NOT NULL,
	"type" "type_enquete" NOT NULL,
	"note_contenu" integer NOT NULL,
	"note_formateur" integer NOT NULL,
	"recommandation" integer NOT NULL,
	"note_specifique" integer NOT NULL,
	"reevaluation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"commentaire" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etape_historique_je" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"annee" integer NOT NULL,
	"annee_fin" integer,
	"poste" text NOT NULL,
	"organisation" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "etape_parcours" (
	"id" text PRIMARY KEY NOT NULL,
	"parcours_id" text NOT NULL,
	"formation_id" text NOT NULL,
	"ordre" integer NOT NULL,
	"titre" text
);
--> statement-breakpoint
CREATE TABLE "evenement_xp" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"type" text NOT NULL,
	"ref_id" text NOT NULL,
	"points" integer NOT NULL,
	"libelle" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fichier" (
	"id" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"taille" integer NOT NULL,
	"chemin" text,
	"contenu" text,
	"cree_par_id" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formation" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titre" text NOT NULL,
	"resume" text NOT NULL,
	"description" text NOT NULL,
	"objectifs" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"domaine_id" text NOT NULL,
	"niveau" "niveau_formation" DEFAULT 'DEBUTANT' NOT NULL,
	"image_url" text,
	"fournisseur_video" text DEFAULT 'YOUTUBE' NOT NULL,
	"reference_video" text NOT NULL,
	"duree_sec" integer NOT NULL,
	"auteur_id" text NOT NULL,
	"formateur_id" text,
	"statut" "statut_contenu" DEFAULT 'BROUILLON' NOT NULL,
	"visible_catalogue" boolean DEFAULT true NOT NULL,
	"motif_refus" text,
	"soumis_le" timestamp with time zone,
	"publie_le" timestamp with time zone,
	"valide_par_id" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formation_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "formation_competence" (
	"formation_id" text NOT NULL,
	"competence_id" text NOT NULL,
	"poids" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "formation_competence_formation_id_competence_id_pk" PRIMARY KEY("formation_id","competence_id")
);
--> statement-breakpoint
CREATE TABLE "formation_externe" (
	"id" text PRIMARY KEY NOT NULL,
	"je_id" text NOT NULL,
	"domaine_id" text NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"formateur_interne" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"duree_heures" double precision DEFAULT 2 NOT NULL,
	"cree_par_id" text NOT NULL,
	"statut" text DEFAULT 'OUVERTE' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formation_externe_competence" (
	"formation_externe_id" text NOT NULL,
	"competence_id" text NOT NULL,
	CONSTRAINT "formation_externe_competence_formation_externe_id_competence_id_pk" PRIMARY KEY("formation_externe_id","competence_id")
);
--> statement-breakpoint
CREATE TABLE "gain_formation" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"competence_id" text NOT NULL,
	"formation_id" text,
	"formation_externe_id" text,
	"niveau_avant" double precision NOT NULL,
	"niveau_observe" double precision NOT NULL,
	"gain_total" double precision NOT NULL,
	"gain_applique" double precision NOT NULL,
	"gain_en_attente" double precision NOT NULL,
	"detail" jsonb NOT NULL,
	"consolide_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historique_niveau" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"competence_id" text NOT NULL,
	"niveau" double precision NOT NULL,
	"variation" double precision DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"ref_id" text,
	"libelle" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscription_parcours" (
	"utilisateur_id" text NOT NULL,
	"parcours_id" text NOT NULL,
	"demarre_le" timestamp with time zone DEFAULT now() NOT NULL,
	"termine_le" timestamp with time zone,
	CONSTRAINT "inscription_parcours_utilisateur_id_parcours_id_pk" PRIMARY KEY("utilisateur_id","parcours_id")
);
--> statement-breakpoint
CREATE TABLE "jeton_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"empreinte" text NOT NULL,
	"type" text DEFAULT 'EMAIL' NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"utilise_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jeton_verification_empreinte_unique" UNIQUE("empreinte")
);
--> statement-breakpoint
CREATE TABLE "journal" (
	"id" text PRIMARY KEY NOT NULL,
	"acteur_id" text,
	"action" text NOT NULL,
	"entite" text NOT NULL,
	"entite_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "junior_entreprise" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nom" text NOT NULL,
	"sigle" text,
	"ville" text,
	"ecole" text,
	"couleur" text DEFAULT '#052931' NOT NULL,
	"logo_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "junior_entreprise_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "like_commentaire" (
	"commentaire_id" text NOT NULL,
	"utilisateur_id" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "like_commentaire_commentaire_id_utilisateur_id_pk" PRIMARY KEY("commentaire_id","utilisateur_id")
);
--> statement-breakpoint
CREATE TABLE "modele_certificat" (
	"id" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"domaine_id" text,
	"couleur_theme" text DEFAULT '#E30719' NOT NULL,
	"canevas" jsonb NOT NULL,
	"par_defaut" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niveau_competence" (
	"utilisateur_id" text NOT NULL,
	"competence_id" text NOT NULL,
	"niveau" double precision NOT NULL,
	"niveau_initial" double precision NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "niveau_competence_utilisateur_id_competence_id_pk" PRIMARY KEY("utilisateur_id","competence_id")
);
--> statement-breakpoint
CREATE TABLE "notation" (
	"utilisateur_id" text NOT NULL,
	"formation_id" text NOT NULL,
	"note" double precision NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notation_utilisateur_id_formation_id_pk" PRIMARY KEY("utilisateur_id","formation_id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"type" text NOT NULL,
	"titre" text NOT NULL,
	"message" text NOT NULL,
	"lien" text,
	"donnees" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lue" boolean DEFAULT false NOT NULL,
	"cle_idempotence" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_cle_idempotence_unique" UNIQUE("cle_idempotence")
);
--> statement-breakpoint
CREATE TABLE "parametre" (
	"cle" text PRIMARY KEY NOT NULL,
	"valeur" jsonb NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcours" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titre" text NOT NULL,
	"sous_titre" text,
	"description" text NOT NULL,
	"image_url" text,
	"domaine_id" text NOT NULL,
	"auteur_id" text NOT NULL,
	"statut" "statut_contenu" DEFAULT 'BROUILLON' NOT NULL,
	"motif_refus" text,
	"soumis_le" timestamp with time zone,
	"publie_le" timestamp with time zone,
	"valide_par_id" text,
	"modele_certificat_id" text,
	"intitule_certificat" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parcours_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "participation_externe" (
	"id" text PRIMARY KEY NOT NULL,
	"formation_externe_id" text NOT NULL,
	"utilisateur_id" text NOT NULL,
	"evaluation_formateur" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score_test" double precision,
	"auto_eval_initiale_id" text,
	"auto_eval_finale_id" text,
	"calcule_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "point_quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"formation_id" text NOT NULL,
	"type" "type_quiz" DEFAULT 'INTEGRE' NOT NULL,
	"temps_sec" integer,
	"titre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progression" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"formation_id" text NOT NULL,
	"position_sec" double precision DEFAULT 0 NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secondes_vues" double precision DEFAULT 0 NOT NULL,
	"sauts" integer DEFAULT 0 NOT NULL,
	"quiz_en_cours_id" text,
	"seuil_atteint" boolean DEFAULT false NOT NULL,
	"statut" "statut_progression" DEFAULT 'EN_COURS' NOT NULL,
	"demarree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"derniere_sync_le" timestamp with time zone DEFAULT now() NOT NULL,
	"terminee_le" timestamp with time zone,
	"relance_froid_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" text PRIMARY KEY NOT NULL,
	"point_quiz_id" text NOT NULL,
	"type" "type_question" DEFAULT 'CHOIX_UNIQUE' NOT NULL,
	"enonce" text NOT NULL,
	"options" jsonb NOT NULL,
	"explication" text,
	"competence_id" text,
	"ordre" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reponse_auto_evaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"auto_evaluation_id" text NOT NULL,
	"competence_id" text NOT NULL,
	"valeur" integer,
	"inconnu" boolean DEFAULT false NOT NULL,
	"expire" boolean DEFAULT false NOT NULL,
	"duree_ms" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signalement" (
	"id" text PRIMARY KEY NOT NULL,
	"commentaire_id" text NOT NULL,
	"auteur_id" text NOT NULL,
	"motif" text NOT NULL,
	"details" text,
	"statut" "statut_signalement" DEFAULT 'OUVERT' NOT NULL,
	"traite_par_id" text,
	"traite_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentative_quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"point_quiz_id" text NOT NULL,
	"reponses" jsonb NOT NULL,
	"score" double precision NOT NULL,
	"reussi" boolean NOT NULL,
	"numero" integer DEFAULT 1 NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateur" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"mot_de_passe_hash" text,
	"google_id" text,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"photo_url" text,
	"roles" text[] DEFAULT ARRAY['MEMBRE']::text[] NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"email_verifie_le" timestamp with time zone,
	"je_id" text,
	"rattachement" "statut_rattachement" DEFAULT 'EN_ATTENTE' NOT NULL,
	"poste" text,
	"departement" text,
	"bio" text,
	"linkedin" text,
	"reseaux" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"whatsapp" text,
	"visible_annuaire" boolean DEFAULT true NOT NULL,
	"masquer_stats" boolean DEFAULT false NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"temps_actif_sec" integer DEFAULT 0 NOT NULL,
	"dernier_battement" timestamp with time zone,
	"dernier_acces" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utilisateur_email_unique" UNIQUE("email"),
	CONSTRAINT "utilisateur_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "activite_jour" ADD CONSTRAINT "activite_jour_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_evaluation" ADD CONSTRAINT "auto_evaluation_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_evaluation" ADD CONSTRAINT "auto_evaluation_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge" ADD CONSTRAINT "badge_critere_code_critere_badge_code_fk" FOREIGN KEY ("critere_code") REFERENCES "public"."critere_badge"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_obtenu" ADD CONSTRAINT "badge_obtenu_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_obtenu" ADD CONSTRAINT "badge_obtenu_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificat" ADD CONSTRAINT "certificat_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificat" ADD CONSTRAINT "certificat_parcours_id_parcours_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificat" ADD CONSTRAINT "certificat_modele_id_modele_certificat_id_fk" FOREIGN KEY ("modele_id") REFERENCES "public"."modele_certificat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competence" ADD CONSTRAINT "competence_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competence" ADD CONSTRAINT "competence_je_id_junior_entreprise_id_fk" FOREIGN KEY ("je_id") REFERENCES "public"."junior_entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquete" ADD CONSTRAINT "enquete_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquete" ADD CONSTRAINT "enquete_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etape_historique_je" ADD CONSTRAINT "etape_historique_je_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etape_parcours" ADD CONSTRAINT "etape_parcours_parcours_id_parcours_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etape_parcours" ADD CONSTRAINT "etape_parcours_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evenement_xp" ADD CONSTRAINT "evenement_xp_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation" ADD CONSTRAINT "formation_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation" ADD CONSTRAINT "formation_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation" ADD CONSTRAINT "formation_formateur_id_utilisateur_id_fk" FOREIGN KEY ("formateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_competence" ADD CONSTRAINT "formation_competence_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_competence" ADD CONSTRAINT "formation_competence_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_externe" ADD CONSTRAINT "formation_externe_je_id_junior_entreprise_id_fk" FOREIGN KEY ("je_id") REFERENCES "public"."junior_entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_externe" ADD CONSTRAINT "formation_externe_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_externe_competence" ADD CONSTRAINT "formation_externe_competence_formation_externe_id_formation_externe_id_fk" FOREIGN KEY ("formation_externe_id") REFERENCES "public"."formation_externe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_externe_competence" ADD CONSTRAINT "formation_externe_competence_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gain_formation" ADD CONSTRAINT "gain_formation_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gain_formation" ADD CONSTRAINT "gain_formation_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_niveau" ADD CONSTRAINT "historique_niveau_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historique_niveau" ADD CONSTRAINT "historique_niveau_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscription_parcours" ADD CONSTRAINT "inscription_parcours_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscription_parcours" ADD CONSTRAINT "inscription_parcours_parcours_id_parcours_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeton_verification" ADD CONSTRAINT "jeton_verification_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_acteur_id_utilisateur_id_fk" FOREIGN KEY ("acteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like_commentaire" ADD CONSTRAINT "like_commentaire_commentaire_id_commentaire_id_fk" FOREIGN KEY ("commentaire_id") REFERENCES "public"."commentaire"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like_commentaire" ADD CONSTRAINT "like_commentaire_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modele_certificat" ADD CONSTRAINT "modele_certificat_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niveau_competence" ADD CONSTRAINT "niveau_competence_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niveau_competence" ADD CONSTRAINT "niveau_competence_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notation" ADD CONSTRAINT "notation_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notation" ADD CONSTRAINT "notation_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_modele_certificat_id_modele_certificat_id_fk" FOREIGN KEY ("modele_certificat_id") REFERENCES "public"."modele_certificat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participation_externe" ADD CONSTRAINT "participation_externe_formation_externe_id_formation_externe_id_fk" FOREIGN KEY ("formation_externe_id") REFERENCES "public"."formation_externe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participation_externe" ADD CONSTRAINT "participation_externe_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_quiz" ADD CONSTRAINT "point_quiz_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progression" ADD CONSTRAINT "progression_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progression" ADD CONSTRAINT "progression_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_point_quiz_id_point_quiz_id_fk" FOREIGN KEY ("point_quiz_id") REFERENCES "public"."point_quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reponse_auto_evaluation" ADD CONSTRAINT "reponse_auto_evaluation_auto_evaluation_id_auto_evaluation_id_fk" FOREIGN KEY ("auto_evaluation_id") REFERENCES "public"."auto_evaluation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reponse_auto_evaluation" ADD CONSTRAINT "reponse_auto_evaluation_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_commentaire_id_commentaire_id_fk" FOREIGN KEY ("commentaire_id") REFERENCES "public"."commentaire"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalement" ADD CONSTRAINT "signalement_traite_par_id_utilisateur_id_fk" FOREIGN KEY ("traite_par_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentative_quiz" ADD CONSTRAINT "tentative_quiz_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tentative_quiz" ADD CONSTRAINT "tentative_quiz_point_quiz_id_point_quiz_id_fk" FOREIGN KEY ("point_quiz_id") REFERENCES "public"."point_quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_je_id_junior_entreprise_id_fk" FOREIGN KEY ("je_id") REFERENCES "public"."junior_entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auto_eval_utilisateur_domaine_idx" ON "auto_evaluation" USING btree ("utilisateur_id","domaine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificat_uq" ON "certificat" USING btree ("utilisateur_id","parcours_id");--> statement-breakpoint
CREATE INDEX "commentaire_formation_idx" ON "commentaire" USING btree ("formation_id","cree_le");--> statement-breakpoint
CREATE INDEX "competence_domaine_idx" ON "competence" USING btree ("domaine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enquete_uq" ON "enquete" USING btree ("utilisateur_id","formation_id","type");--> statement-breakpoint
CREATE INDEX "historique_je_utilisateur_idx" ON "etape_historique_je" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE UNIQUE INDEX "etape_parcours_uq" ON "etape_parcours" USING btree ("parcours_id","ordre");--> statement-breakpoint
CREATE UNIQUE INDEX "evenement_xp_uq" ON "evenement_xp" USING btree ("utilisateur_id","type","ref_id");--> statement-breakpoint
CREATE INDEX "formation_statut_domaine_idx" ON "formation" USING btree ("statut","domaine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gain_formation_uq" ON "gain_formation" USING btree ("utilisateur_id","competence_id","formation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gain_externe_uq" ON "gain_formation" USING btree ("utilisateur_id","competence_id","formation_externe_id");--> statement-breakpoint
CREATE INDEX "historique_niveau_idx" ON "historique_niveau" USING btree ("utilisateur_id","competence_id","cree_le");--> statement-breakpoint
CREATE INDEX "journal_entite_idx" ON "journal" USING btree ("entite","entite_id");--> statement-breakpoint
CREATE INDEX "notification_idx" ON "notification" USING btree ("utilisateur_id","lue","cree_le");--> statement-breakpoint
CREATE UNIQUE INDEX "participation_externe_uq" ON "participation_externe" USING btree ("formation_externe_id","utilisateur_id");--> statement-breakpoint
CREATE INDEX "point_quiz_formation_idx" ON "point_quiz" USING btree ("formation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progression_uq" ON "progression" USING btree ("utilisateur_id","formation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reponse_auto_eval_uq" ON "reponse_auto_evaluation" USING btree ("auto_evaluation_id","competence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signalement_uq" ON "signalement" USING btree ("commentaire_id","auteur_id");--> statement-breakpoint
CREATE INDEX "tentative_quiz_idx" ON "tentative_quiz" USING btree ("utilisateur_id","point_quiz_id");--> statement-breakpoint
CREATE INDEX "utilisateur_je_idx" ON "utilisateur" USING btree ("je_id");