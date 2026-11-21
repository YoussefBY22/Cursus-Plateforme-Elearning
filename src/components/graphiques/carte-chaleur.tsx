import { Icone } from "@/components/icones";
import { intensiteChaleur, tableCroisee } from "@/services/rapports";
import { couleurLisible, fondChaleur, texteChaleur } from "./couleurs";

export type AxeChaleur = { id: string; libelle: string; court?: string | null; couleur?: string | null; icone?: string };
export type CelluleChaleur = { ligne: string; colonne: string; valeur: number; membres?: number };

/**
 * Carte de chaleur ligne × colonne (ici organisation × domaine), niveau 0–99.
 * Une seule teinte (turquoise) dont l'intensité porte la valeur, et le
 * chiffre écrit dans chaque case : on lit sans deviner une couleur.
 * Les cases sans mesure restent vides, en pointillés — « pas mesuré »
 * n'est pas « niveau 0 ».
 */
export function CarteChaleur({
  lignes,
  colonnes,
  cellules,
  titre,
}: {
  lignes: AxeChaleur[];
  colonnes: AxeChaleur[];
  cellules: CelluleChaleur[];
  titre: string;
}) {
  const table = tableCroisee(cellules);
  const membres = new Map(cellules.map((c) => [`${c.ligne}|${c.colonne}`, c.membres ?? 0]));

  return (
    <figure>
      <figcaption className="sr-only">{titre}</figcaption>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                Organisation
              </th>
              {colonnes.map((c) => (
                <th key={c.id} scope="col" className="min-w-[3.25rem] px-0.5 pb-1 align-bottom font-medium text-muted-foreground">
                  <span className="flex flex-col items-center gap-1" title={c.libelle}>
                    {c.icone ? (
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-lg"
                        style={{ background: `color-mix(in srgb, ${couleurLisible(c.couleur)} 16%, transparent)`, color: couleurLisible(c.couleur) }}
                      >
                        <Icone nom={c.icone} className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    <span className="line-clamp-2 max-w-[5.5rem] text-center text-[11px] leading-tight">{c.court ?? c.libelle}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <th scope="row" className="pr-2 text-left font-semibold whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleurLisible(l.couleur) }} aria-hidden />
                    <span title={l.libelle}>{l.court ?? l.libelle}</span>
                  </span>
                </th>
                {colonnes.map((c) => {
                  const v = table.get(l.id)?.get(c.id);
                  if (v === undefined) {
                    return (
                      <td key={c.id} className="h-9 rounded-lg border border-dashed border-border text-center text-muted-foreground">
                        <span aria-label="Non mesuré">·</span>
                      </td>
                    );
                  }
                  const i = intensiteChaleur(v);
                  const n = membres.get(`${l.id}|${c.id}`) ?? 0;
                  return (
                    <td
                      key={c.id}
                      className="chiffres h-9 rounded-lg text-center text-[13px] font-bold"
                      style={{ background: fondChaleur(i), color: texteChaleur(i) }}
                      title={`${l.libelle} — ${c.libelle} : niveau moyen ${Math.round(v)}/99 (${n} membre${n > 1 ? "s" : ""} mesuré${n > 1 ? "s" : ""})`}
                    >
                      {Math.round(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground" aria-hidden>
        <span className="flex items-center gap-2">
          Niveau moyen /99
          <span className="flex overflow-hidden rounded-full">
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <span key={i} className="h-2.5 w-6" style={{ background: fondChaleur(i) }} />
            ))}
          </span>
          <span className="chiffres">10 → 80+</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded border border-dashed border-border" /> pas encore mesuré
        </span>
      </div>
    </figure>
  );
}
