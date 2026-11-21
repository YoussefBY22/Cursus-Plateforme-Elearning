CREATE TYPE "public"."statut_demande" AS ENUM('OUVERTE', 'PLANIFIEE', 'SATISFAITE', 'REFUSEE');--> statement-breakpoint
CREATE TABLE "demande_formation" (
	"id" text PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"description" text NOT NULL,
	"domaine_id" text,
	"demandeur_id" text NOT NULL,
	"je_id" text,
	"statut" "statut_demande" DEFAULT 'OUVERTE' NOT NULL,
	"reponse" text,
	"formation_id" text,
	"traite_par_id" text,
	"traite_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"maj_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_suivi" (
	"id" text PRIMARY KEY NOT NULL,
	"je_id" text NOT NULL,
	"auteur_id" text NOT NULL,
	"contenu" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_demande_formation" (
	"demande_id" text NOT NULL,
	"utilisateur_id" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vote_demande_formation_demande_id_utilisateur_id_pk" PRIMARY KEY("demande_id","utilisateur_id")
);
--> statement-breakpoint
ALTER TABLE "junior_entreprise" ADD COLUMN "charge_suivi_id" text;--> statement-breakpoint
ALTER TABLE "demande_formation" ADD CONSTRAINT "demande_formation_domaine_id_domaine_id_fk" FOREIGN KEY ("domaine_id") REFERENCES "public"."domaine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demande_formation" ADD CONSTRAINT "demande_formation_demandeur_id_utilisateur_id_fk" FOREIGN KEY ("demandeur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demande_formation" ADD CONSTRAINT "demande_formation_je_id_junior_entreprise_id_fk" FOREIGN KEY ("je_id") REFERENCES "public"."junior_entreprise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demande_formation" ADD CONSTRAINT "demande_formation_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demande_formation" ADD CONSTRAINT "demande_formation_traite_par_id_utilisateur_id_fk" FOREIGN KEY ("traite_par_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_suivi" ADD CONSTRAINT "note_suivi_je_id_junior_entreprise_id_fk" FOREIGN KEY ("je_id") REFERENCES "public"."junior_entreprise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_suivi" ADD CONSTRAINT "note_suivi_auteur_id_utilisateur_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."utilisateur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_demande_formation" ADD CONSTRAINT "vote_demande_formation_demande_id_demande_formation_id_fk" FOREIGN KEY ("demande_id") REFERENCES "public"."demande_formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_demande_formation" ADD CONSTRAINT "vote_demande_formation_utilisateur_id_utilisateur_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demande_formation_statut_idx" ON "demande_formation" USING btree ("statut","domaine_id");--> statement-breakpoint
CREATE INDEX "note_suivi_je_idx" ON "note_suivi" USING btree ("je_id","cree_le");