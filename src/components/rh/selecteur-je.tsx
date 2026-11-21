import { Bouton } from "@/components/ui/bouton";
import { Selecteur } from "@/components/ui/champ";

/**
 * Choix de l'organisation consultée — réservé au super admin. Un simple formulaire
 * GET : l'organisation vit dans l'URL (`?je=`), partageable et sans JavaScript.
 */
export function SelecteurJe({
  jes,
  actuelle,
  onglet,
}: {
  jes: { id: string; nom: string }[];
  actuelle: string | null;
  onglet?: string;
}) {
  return (
    <form method="get" action="/mon-organisation" className="flex flex-wrap items-center gap-2">
      {onglet ? <input type="hidden" name="onglet" value={onglet} /> : null}
      <label htmlFor="choix-je" className="sr-only">
        Organisation consultée
      </label>
      <Selecteur id="choix-je" name="je" defaultValue={actuelle ?? ""} className="h-10 w-auto min-w-56 rounded-full">
        {actuelle ? null : <option value="">Choisir une organisation…</option>}
        {jes.map((j) => (
          <option key={j.id} value={j.id}>
            {j.nom}
          </option>
        ))}
      </Selecteur>
      <Bouton type="submit" variante="contour" taille="sm">
        Afficher
      </Bouton>
    </form>
  );
}
