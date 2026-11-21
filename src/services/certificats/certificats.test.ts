import { describe, expect, it } from "vitest";
import { A4_PAYSAGE, ENCADREMENT_DEFAUT, STYLE_TEXTE_DEFAUT, type Bloc, type Canevas } from "../canevas/canevas";
import { cadreCommun, canevasParDefaut } from "./cadre";
import {
  aimanter,
  carreQr,
  decalageLigneDeBase,
  enCqw,
  positionBloc,
  pxEnMm,
  pxParMm,
  taillePoliceCqw,
} from "./echelle";
import {
  avertissementsModele,
  centrerHorizontalement,
  dupliquerBloc,
  imagesInconnues,
  recolorer,
  redimensionner,
  sansBlocsVerrouilles,
} from "./edition";
import { FenetreGlissante } from "./fenetre-glissante";
import { SchemaCanevasCertificat } from "./schema-canevas";
import {
  dispositionPdf,
  ipDepuisEntetes,
  jetonValide,
  lienLinkedIn,
  nomFichierPdf,
  statutCertificat,
} from "./verification";

const page = { largeur: A4_PAYSAGE.largeur, hauteur: A4_PAYSAGE.hauteur };

describe("échelle", () => {
  it("mesure les pixels par millimètre et refuse les mesures absurdes", () => {
    expect(pxParMm(594, 297)).toBe(2);
    expect(pxParMm(0, 297)).toBeNull();
    expect(pxParMm(-4, 297)).toBeNull();
    expect(pxParMm(Number.NaN, 297)).toBeNull();
    expect(pxEnMm(20, 2)).toBe(10);
    expect(pxEnMm(20, 0)).toBe(0);
  });

  it("exprime les millimètres et les points en unités de conteneur", () => {
    expect(enCqw(297, 297)).toBe("100cqw");
    expect(enCqw(29.7, 297)).toBe("10cqw");
    // 72 pt = 25,4 mm
    expect(taillePoliceCqw(72, 254)).toBe("10cqw");
  });

  it("place un bloc en pourcentages de la page", () => {
    expect(positionBloc({ x: 29.7, y: 21, largeur: 148.5, hauteur: 105 }, page)).toEqual({
      left: "10%",
      top: "10%",
      width: "50%",
      height: "50%",
    });
  });

  it("aligne la ligne de base HTML sur celle du PDF", () => {
    // Interligne 1,2 : la ligne de base HTML tombe ~0,11 em plus bas que dans le PDF.
    expect(decalageLigneDeBase(1.2)).toBeCloseTo(0.1085, 3);
    // Plus d'interligne = plus de demi-interlignage au-dessus du texte.
    expect(decalageLigneDeBase(1.5)).toBeGreaterThan(decalageLigneDeBase(1.2));
  });

  it("garde le QR code carré et centré dans son cadre", () => {
    expect(carreQr({ x: 10, y: 10, largeur: 30, hauteur: 20 })).toEqual({ x: 15, y: 10, cote: 20 });
  });

  it("aimante au demi-millimètre", () => {
    expect(aimanter(10.26)).toBe(10.5);
    expect(aimanter(10.24)).toBe(10);
  });
});

const texte = (id: string, couleur: string, contenu = "Texte"): Bloc => ({
  id,
  type: "TEXTE",
  x: 10,
  y: 10,
  largeur: 50,
  hauteur: 10,
  plan: 1,
  contenu,
  style: { ...STYLE_TEXTE_DEFAUT, couleur },
  encadrement: { ...ENCADREMENT_DEFAUT },
  marge: 1,
});

describe("édition", () => {
  it("recolore ce qui portait l'ancienne couleur de thème, et seulement cela", () => {
    const c: Canevas = {
      ...page,
      blocs: [
        texte("a", "#4f46e5"),
        texte("b", "#0f1226"),
        { id: "l", type: "LIGNE", x: 0, y: 0, largeur: 10, hauteur: 2, plan: 2, orientation: "horizontale", couleur: "#4f46e5", epaisseur: 1 },
      ],
    };
    const r = recolorer(c, "#4f46e5", "#2563EB");
    expect(r.blocs[0].type === "TEXTE" && r.blocs[0].style.couleur).toBe("#2563EB");
    expect(r.blocs[1].type === "TEXTE" && r.blocs[1].style.couleur).toBe("#0f1226");
    expect(r.blocs[2].type === "LIGNE" && r.blocs[2].couleur).toBe("#2563EB");
    // Couleur invalide : rien ne change.
    expect(recolorer(c, "rouge", "#2563EB")).toBe(c);
  });

  it("centre un bloc horizontalement", () => {
    expect(centrerHorizontalement(texte("a", "#000000"), page).x).toBe(123.5);
  });

  it("garde le QR code carré au redimensionnement", () => {
    const qr: Bloc = { id: "q", type: "QRCODE", x: 0, y: 0, largeur: 20, hauteur: 20, plan: 1, champ: "lienVerification", couleur: "#0f1226" };
    const r = redimensionner(qr, 6, 2);
    expect(r.largeur).toBe(26);
    expect(r.hauteur).toBe(26);
    const t = redimensionner(texte("a", "#000000"), -100, 3);
    expect(t.largeur).toBe(3);
    expect(t.hauteur).toBe(13);
  });

  it("n'enregistre jamais le cadre commun", () => {
    const c: Canevas = { ...page, blocs: [...cadreCommun("#4f46e5"), texte("a", "#000000")] };
    expect(sansBlocsVerrouilles(c).blocs.map((b) => b.id)).toEqual(["a"]);
  });

  it("repère les images qui n'appartiennent pas au modèle", () => {
    const c: Canevas = {
      ...page,
      blocs: [
        { id: "i1", type: "IMAGE", x: 0, y: 0, largeur: 10, hauteur: 10, plan: 1, fichierId: "abc123def456", nomFichier: "logo.png", ajustement: "contenir", opacite: 1 },
        { id: "i2", type: "IMAGE", x: 0, y: 0, largeur: 10, hauteur: 10, plan: 2, fichierId: "zzz999zzz999", nomFichier: "x.png", ajustement: "contenir", opacite: 1 },
      ],
    };
    expect(imagesInconnues(c, ["abc123def456"])).toEqual(["zzz999zzz999"]);
  });

  it("duplique un bloc décalé, sans sortir de la page", () => {
    const copie = dupliquerBloc({ ...texte("a", "#000000"), x: 290, largeur: 5 }, "b", 9, page);
    expect(copie.id).toBe("b");
    expect(copie.plan).toBe(9);
    expect(copie.x).toBe(292);
  });

  it("signale l'absence de QR code ou de titulaire", () => {
    expect(avertissementsModele(canevasParDefaut())).toEqual([]);
    expect(avertissementsModele({ ...page, blocs: [texte("a", "#000000")] })).toHaveLength(2);
  });
});

describe("schéma du canevas", () => {
  it("accepte le modèle par défaut", () => {
    const r = SchemaCanevasCertificat.safeParse(canevasParDefaut());
    expect(r.success).toBe(true);
  });

  it("retire le cadre commun et refuse une couleur invalide", () => {
    const avecCadre = { ...canevasParDefaut(), blocs: [...cadreCommun("#4f46e5"), ...canevasParDefaut().blocs] };
    const r = SchemaCanevasCertificat.safeParse(avecCadre);
    expect(r.success && r.data.blocs.some((b) => b.verrouille)).toBe(false);
    const mauvais = { ...page, blocs: [texte("a", "red")] };
    expect(SchemaCanevasCertificat.safeParse(mauvais).success).toBe(false);
  });

  it("refuse un type de bloc inconnu", () => {
    expect(SchemaCanevasCertificat.safeParse({ ...page, blocs: [{ ...texte("a", "#000000"), type: "SCRIPT" }] }).success).toBe(false);
  });
});

describe("vérification", () => {
  it("valide le format du jeton avant toute requête", () => {
    expect(jetonValide("uzdAGlUJgoZ06tP9__x0nAsNDNENPZ-G_ywWNkLddbg")).toBe(true);
    expect(jetonValide("uzdAGlUJgoZ06tP9__x0nAsNDNENPZ-G_ywWNkLddb")).toBe(false);
    expect(jetonValide("uzdAGlUJgoZ06tP9__x0nAsNDNENPZ-G_ywWNkLdd+g")).toBe(false);
    expect(jetonValide("' OR 1=1 --")).toBe(false);
    expect(jetonValide(undefined)).toBe(false);
  });

  it("donne le statut d'un certificat", () => {
    expect(statutCertificat({ revoqueLe: null })).toBe("VALIDE");
    expect(statutCertificat({ revoqueLe: new Date() })).toBe("REVOQUE");
  });

  it("produit un nom de fichier sûr", () => {
    expect(nomFichierPdf("CUR-2026-000042")).toBe("certificat-CUR-2026-000042.pdf");
    expect(nomFichierPdf('../"x')).toBe("certificat-x.pdf");
    expect(dispositionPdf("CUR-2026-000042")).toBe('attachment; filename="certificat-CUR-2026-000042.pdf"');
  });

  it("pré-remplit l'ajout à LinkedIn", () => {
    const url = new URL(
      lienLinkedIn({ nom: "Pitcher avec impact", emisLe: new Date(2026, 9, 7), url: "https://cursus.example/v/abc", numero: "CUR-2026-000042" })
    );
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(url.searchParams.get("startTask")).toBe("CERTIFICATION_NAME");
    expect(url.searchParams.get("name")).toBe("Pitcher avec impact");
    expect(url.searchParams.get("organizationName")).toBe("Cursus");
    expect(url.searchParams.get("issueYear")).toBe("2026");
    expect(url.searchParams.get("issueMonth")).toBe("10");
    expect(url.searchParams.get("certUrl")).toBe("https://cursus.example/v/abc");
    expect(url.searchParams.get("certId")).toBe("CUR-2026-000042");
    expect(url.search).not.toContain("+");
  });

  it("lit l'adresse du client dans X-Forwarded-For", () => {
    expect(ipDepuisEntetes("203.0.113.7, 10.0.0.1", null)).toBe("203.0.113.7");
    expect(ipDepuisEntetes(null, "198.51.100.2")).toBe("198.51.100.2");
    expect(ipDepuisEntetes("", null)).toBe("inconnue");
  });
});

describe("limiteur à fenêtre glissante", () => {
  it("autorise jusqu'à la limite puis refuse, avec le délai d'attente", () => {
    const f = new FenetreGlissante(3, 1000);
    expect(f.essayer("ip", 0).restant).toBe(2);
    expect(f.essayer("ip", 100).autorise).toBe(true);
    expect(f.essayer("ip", 200).autorise).toBe(true);
    const refus = f.essayer("ip", 300);
    expect(refus.autorise).toBe(false);
    expect(refus.reessayerDansMs).toBe(700);
    // Les autres clés ne sont pas touchées.
    expect(f.essayer("autre", 300).autorise).toBe(true);
  });

  it("libère une place quand la plus ancienne requête sort de la fenêtre", () => {
    const f = new FenetreGlissante(2, 1000);
    f.essayer("ip", 0);
    f.essayer("ip", 500);
    expect(f.essayer("ip", 999).autorise).toBe(false);
    expect(f.essayer("ip", 1001).autorise).toBe(true);
    expect(f.essayer("ip", 1002).autorise).toBe(false);
  });

  it("ne compte pas les requêtes refusées", () => {
    const f = new FenetreGlissante(1, 1000);
    f.essayer("ip", 0);
    for (let t = 1; t < 1000; t += 100) f.essayer("ip", t);
    expect(f.essayer("ip", 1001).autorise).toBe(true);
  });

  it("purge les clés inactives quand la table est pleine", () => {
    const f = new FenetreGlissante(5, 1000, 2);
    f.essayer("a", 0);
    f.essayer("b", 0);
    f.essayer("c", 5000);
    expect(f.taille).toBe(1);
    expect(() => new FenetreGlissante(0, 1000)).toThrow();
  });
});
