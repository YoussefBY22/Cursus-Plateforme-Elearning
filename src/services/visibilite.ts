/**
 * Visibilité des profils — logique pure, testée.
 *
 *  (a) `visibleAnnuaire` : le membre apparaît-il dans l'annuaire des autres ?
 *  (b) `masquerStats` : s'il est visible, masque-t-il niveau et statistiques ?
 *  Invisible, seule sa propre organisation (et les admins) voit son profil.
 *
 * Les formateurs restent toujours consultables sur leur profil formateur :
 * c'est leur vitrine, ils l'acceptent en devenant formateurs.
 */

export type ProfilVisibilite = {
  id: string;
  jeId: string | null;
  visibleAnnuaire: boolean;
  masquerStats: boolean;
  roles: readonly string[];
};

export type Lecteur = { id: string; jeId: string | null; roles: readonly string[] };

const estAdmin = (r: readonly string[]) => r.includes("SUPER_ADMIN") || r.includes("RESP_PEDAGO");

export function memeJE(a: { jeId: string | null }, b: { jeId: string | null }): boolean {
  return !!a.jeId && a.jeId === b.jeId;
}

/** Le lecteur peut-il ouvrir ce profil ? */
export function peutVoirProfil(lecteur: Lecteur, profil: ProfilVisibilite): boolean {
  if (lecteur.id === profil.id) return true;
  if (estAdmin(lecteur.roles)) return true;
  if (memeJE(lecteur, profil)) return true;
  if (lecteur.roles.includes("RESP_RH") && memeJE(lecteur, profil)) return true;
  return profil.visibleAnnuaire;
}

/** Le profil figure-t-il dans l'annuaire de ce lecteur ? */
export function figureDansAnnuaire(lecteur: Lecteur, profil: ProfilVisibilite): boolean {
  if (lecteur.id === profil.id) return false;
  if (profil.visibleAnnuaire) return true;
  return memeJE(lecteur, profil);
}

/** Niveau, XP et statistiques sont-ils visibles pour ce lecteur ? */
export function peutVoirStats(lecteur: Lecteur, profil: ProfilVisibilite): boolean {
  if (lecteur.id === profil.id) return true;
  if (estAdmin(lecteur.roles)) return true;
  // Le RH de l'organisation suit la montée en compétences de ses membres.
  if (lecteur.roles.includes("RESP_RH") && memeJE(lecteur, profil)) return true;
  if (!peutVoirProfil(lecteur, profil)) return false;
  return !profil.masquerStats;
}

/** Profil complet = photo, poste, bio, LinkedIn. Sert au badge et à la jauge. */
export function completudeProfil(p: {
  photoUrl?: string | null;
  poste?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  departement?: string | null;
  jeId?: string | null;
}): { score: number; manquants: string[] } {
  const champs: [string, unknown][] = [
    ["Photo", p.photoUrl],
    ["Poste", p.poste],
    ["Bio", p.bio],
    ["LinkedIn", p.linkedin],
    ["Département", p.departement],
    ["Organisation", p.jeId],
  ];
  const manquants = champs.filter(([, v]) => !v || (typeof v === "string" && !v.trim())).map(([n]) => n);
  return { score: (champs.length - manquants.length) / champs.length, manquants };
}

/** Lien WhatsApp « click to chat » depuis un numéro saisi librement. */
export function lienWhatsapp(numero: string | null | undefined, message?: string): string | null {
  if (!numero) return null;
  let chiffres = numero.replace(/[^\d+]/g, "");
  if (chiffres.startsWith("+")) chiffres = chiffres.slice(1);
  else if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  else return null; // sans indicatif international, le pays est inconnu
  if (chiffres.length < 8) return null;
  const texte = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${chiffres}${texte}`;
}

/** Normalise une URL LinkedIn saisie sans protocole. */
export function normaliserUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
