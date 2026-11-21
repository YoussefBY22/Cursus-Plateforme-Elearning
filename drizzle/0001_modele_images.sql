ALTER TABLE "modele_certificat" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "modele_certificat" ADD COLUMN "archive" boolean DEFAULT false NOT NULL;