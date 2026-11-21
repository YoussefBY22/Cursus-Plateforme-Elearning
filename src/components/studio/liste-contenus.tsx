import Link from "next/link";
import { ChevronRight, Eye, EyeOff, Star, Users } from "lucide-react";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { Pastille } from "@/components/ui/pastille";
import { depuis, pluriel } from "@/lib/utils";
import { estStatutContenu, LIBELLES_STATUT, TONS_STATUT } from "@/services/studio";
import { formaterDuree } from "@/services/visionnage";
import type { FormationStudio, ParcoursStudio } from "@/server/requetes/studio";

/**
 * Mes contenus, par état. Le motif de refus s'affiche sur la carte : le
 * formateur doit savoir quoi corriger sans ouvrir l'éditeur.
 */
export function ListeContenus(
  props:
    | { titre: string; type: "formation"; lignes: FormationStudio[] }
    | { titre: string; type: "parcours"; lignes: ParcoursStudio[] }
) {
  const { titre, type, lignes } = props;
  const base = type === "formation" ? "/studio/formations" : "/studio/parcours";

  return (
    <Carte>
      <EnteteCarte titre={titre} description={pluriel(lignes.length, "contenu", "contenus")} />
      <CorpsCarte className="pt-0">
        <ul className="divide-y divide-border">
          {lignes.map((l) => {
            const statut = estStatutContenu(l.statut) ? l.statut : "BROUILLON";
            return (
              <li key={l.id}>
                <Link
                  href={`${base}/${l.id}`}
                  className="group -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <span
                    aria-hidden
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ background: l.couleur }}
                  />
                  <span className="min-w-48 flex-1">
                    <span className="block text-[14px] font-semibold leading-snug">{l.titre}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {l.domaine} · modifié {depuis(l.majLe)}
                    </span>
                    {statut === "REFUSE" && l.motifRefus ? (
                      <span className="mt-1.5 block rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs font-medium text-danger">
                        À corriger : {l.motifRefus}
                      </span>
                    ) : null}
                  </span>

                  {"inscrits" in l ? (
                    <span className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center gap-1" title="Apprenants inscrits">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        {l.inscrits}
                      </span>
                      {l.note !== null ? (
                        <span className="inline-flex items-center gap-1" title={pluriel(l.avis, "avis")}>
                          <Star className="h-3.5 w-3.5 fill-or text-or" aria-hidden />
                          {l.note.toFixed(1)}
                        </span>
                      ) : null}
                      {l.dureeSec > 0 ? <span>{formaterDuree(l.dureeSec)}</span> : null}
                      {l.visibleCatalogue ? (
                        <Eye className="h-3.5 w-3.5" aria-label="Visible au catalogue" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" aria-label="Hors catalogue" />
                      )}
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pluriel(l.etapes, "étape")}
                    </span>
                  )}

                  <Pastille ton={TONS_STATUT[statut]}>{LIBELLES_STATUT[statut]}</Pastille>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </CorpsCarte>
    </Carte>
  );
}
