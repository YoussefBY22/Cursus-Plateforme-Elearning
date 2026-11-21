/**
 * Validation d'un canevas de certificat reçu du navigateur — logique pure.
 *
 * L'éditeur envoie le canevas entier à chaque enregistrement : on ne fait
 * confiance à rien. Types de blocs admis : texte, aplat, trait, image et QR
 * code. Le cadre commun (blocs verrouillés) n'est jamais enregistré.
 */
import { z } from "zod";
import type { Canevas } from "../canevas/canevas";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide : #RRGGBB attendu.");
const hexOuVide = z.union([hex, z.literal("")]);
const mm = (min: number, max: number) => z.number().min(min).max(max);

const commun = {
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  x: mm(-10, 500),
  y: mm(-10, 500),
  largeur: mm(0.5, 500),
  hauteur: mm(0.5, 500),
  plan: z.number().int().min(-1000).max(10000),
  nom: z.string().max(80).optional(),
  masque: z.boolean().optional(),
  verrouille: z.boolean().optional(),
};

const encadrement = z.object({
  fond: hexOuVide,
  bordure: hexOuVide,
  epaisseurBordure: mm(0, 20),
});

const styleTexte = z.object({
  taille: z.number().min(3).max(120),
  gras: z.boolean(),
  italique: z.boolean(),
  couleur: hex,
  alignement: z.enum(["gauche", "centre", "droite"]),
  alignementVertical: z.enum(["haut", "milieu", "bas"]),
  interligne: z.number().min(0.6).max(4),
  majuscules: z.boolean(),
});

const blocTexte = z.object({
  ...commun,
  type: z.literal("TEXTE"),
  contenu: z.string().max(2000, "Texte trop long (2 000 caractères au plus)."),
  style: styleTexte,
  encadrement,
  marge: mm(0, 50),
});

const blocRectangle = z.object({ ...commun, type: z.literal("RECTANGLE"), encadrement });

const blocImage = z.object({
  ...commun,
  type: z.literal("IMAGE"),
  fichierId: z.string().regex(/^[a-z0-9]{10,40}$/i, "Image inconnue."),
  nomFichier: z.string().max(200),
  ajustement: z.enum(["contenir", "remplir"]),
  opacite: z.number().min(0).max(1),
});

const blocLigne = z.object({
  ...commun,
  type: z.literal("LIGNE"),
  orientation: z.enum(["horizontale", "verticale"]),
  couleur: hex,
  epaisseur: mm(0.05, 20),
});

const blocQr = z.object({
  ...commun,
  type: z.literal("QRCODE"),
  champ: z.string().regex(/^[a-zA-Z0-9_.]{1,60}$/),
  couleur: hex,
});

export const SchemaBloc = z.discriminatedUnion("type", [blocTexte, blocRectangle, blocImage, blocLigne, blocQr]);

export const SchemaCanevasCertificat = z
  .object({
    largeur: mm(50, 1000),
    hauteur: mm(50, 1000),
    blocs: z.array(SchemaBloc).max(150, "150 blocs au plus sur un certificat."),
  })
  .transform(
    (c): Canevas => ({
      largeur: c.largeur,
      hauteur: c.hauteur,
      // Le cadre commun est imposé au rendu : on ne stocke que ce que l'on peut éditer.
      blocs: c.blocs.filter((b) => !b.verrouille),
    })
  );
