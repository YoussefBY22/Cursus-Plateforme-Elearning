/**
 * Vérification et partage des certificats — logique pure.
 */

/**
 * Jeton de vérification : 32 octets aléatoires en base64url, soit exactement
 * 43 caractères. On refuse tout le reste AVANT d'interroger la base : une
 * URL fantaisiste ne coûte qu'une expression régulière.
 */
export const FORMAT_JETON = /^[A-Za-z0-9_-]{43}$/;

export function jetonValide(jeton: unknown): jeton is string {
  return typeof jeton === "string" && FORMAT_JETON.test(jeton);
}

export type StatutCertificat = "VALIDE" | "REVOQUE";

export function statutCertificat(c: { revoqueLe: Date | string | null }): StatutCertificat {
  return c.revoqueLe ? "REVOQUE" : "VALIDE";
}

/** Nom du fichier téléchargé : « certificat-CUR-2026-000042.pdf ». */
export function nomFichierPdf(numero: string): string {
  const propre = numero.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
  return `certificat-${propre || "cursus"}.pdf`;
}

/** En-tête Content-Disposition avec un nom de fichier sûr. */
export function dispositionPdf(numero: string, mode: "attachment" | "inline" = "attachment"): string {
  return `${mode}; filename="${nomFichierPdf(numero)}"`;
}

/**
 * Lien « Ajouter au profil » de LinkedIn, pré-rempli.
 * https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&…
 */
export function lienLinkedIn(c: {
  nom: string;
  emisLe: Date;
  url: string;
  numero: string;
  organisation?: string;
}): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: c.nom,
    organizationName: c.organisation ?? "Cursus",
    issueYear: String(c.emisLe.getFullYear()),
    issueMonth: String(c.emisLe.getMonth() + 1),
    certUrl: c.url,
    certId: c.numero,
  });
  // URLSearchParams encode les espaces en « + » ; LinkedIn attend %20.
  return `https://www.linkedin.com/profile/add?${params.toString().replace(/\+/g, "%20")}`;
}

/** Première adresse de l'en-tête X-Forwarded-For (celle du client), sinon repli. */
export function ipDepuisEntetes(forwardedFor: string | null, realIp: string | null): string {
  const premiere = forwardedFor?.split(",")[0]?.trim();
  if (premiere) return premiere.slice(0, 64);
  const reelle = realIp?.trim();
  return reelle ? reelle.slice(0, 64) : "inconnue";
}
