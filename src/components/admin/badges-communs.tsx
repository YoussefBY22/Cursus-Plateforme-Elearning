import { Pastille } from "@/components/ui/pastille";
import { LIBELLES, type Rarete } from "@/services/badges";

/** Rareté d'un badge, du plus courant au plus rare : neutre, turquoise, violet, or, rouge. */
export function PastilleRarete({ rarete }: { rarete: string }) {
  const libelle = LIBELLES.rarete[rarete as Rarete] ?? rarete;
  switch (rarete) {
    case "RARE":
      return <Pastille couleur="var(--turquoise)">{libelle}</Pastille>;
    case "EPIQUE":
      return <Pastille couleur="#7B5CD6">{libelle}</Pastille>;
    case "LEGENDAIRE":
      return <Pastille ton="or">{libelle}</Pastille>;
    case "MYTHIQUE":
      return <Pastille ton="primaire">{libelle}</Pastille>;
    default:
      return <Pastille ton="neutre">{libelle}</Pastille>;
  }
}

/** « Formations terminées ≥ 5 formations », « Profil complété ». */
export function phraseCritere(critere: string, unite: string, seuil: number, parametre?: string | null): string {
  const cible = parametre ? ` (${parametre})` : "";
  if (!unite) return `${critere}${cible}`;
  return `${critere}${cible} ≥ ${seuil.toLocaleString("fr-FR")} ${unite}`;
}
