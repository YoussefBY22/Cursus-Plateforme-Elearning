"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Champ, Selecteur } from "@/components/ui/champ";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { cn, pluriel } from "@/lib/utils";
import type { LigneAnnuaire } from "@/server/requetes/profils";
import { ROLES, type CodeRole } from "@/services/rbac";

const ROLES_FILTRE: CodeRole[] = ["FORMATEUR", "RESP_RH", "RESP_PEDAGO", "SUPER_ADMIN"];

/**
 * Annuaire : recherche et filtres dans l'URL.
 *
 * L'état vit dans l'URL plutôt qu'en mémoire : un membre peut envoyer le
 * lien de sa recherche, et le retour arrière du navigateur fait ce qu'on
 * attend de lui.
 */
export function ListeAnnuaire({
  lignes,
  jes,
}: {
  lignes: LigneAnnuaire[];
  jes: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();

  const q = parametres.get("q") ?? "";
  const jeId = parametres.get("je") ?? "";
  const role = parametres.get("role") ?? "";
  const [recherche, setRecherche] = React.useState(q);

  function naviguer(modif: Record<string, string>) {
    const p = new URLSearchParams(parametres.toString());
    for (const [cle, valeur] of Object.entries(modif)) {
      if (valeur) p.set(cle, valeur);
      else p.delete(cle);
    }
    router.replace(`${chemin}?${p.toString()}`, { scroll: false });
  }

  // La recherche part après la frappe, pas à chaque touche.
  React.useEffect(() => {
    if (recherche === q) return;
    const t = setTimeout(() => naviguer({ q: recherche }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  const filtre = !!(q || jeId || role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 basis-full md:basis-auto md:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Champ
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher un nom, un poste, un département…"
            className="rounded-full pl-10"
            aria-label="Chercher dans l'annuaire"
          />
        </div>
        <Selecteur
          value={jeId}
          onChange={(e) => naviguer({ je: e.target.value })}
          aria-label="Filtrer par organisation"
          className="min-w-0 flex-1 basis-36 rounded-full md:w-auto md:flex-none"
        >
          <option value="">Toutes les organisations</option>
          {jes.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nom}
            </option>
          ))}
        </Selecteur>
        <Selecteur
          value={role}
          onChange={(e) => naviguer({ role: e.target.value })}
          aria-label="Filtrer par rôle"
          className="min-w-0 flex-1 basis-36 rounded-full md:w-auto md:flex-none"
        >
          <option value="">Tous les rôles</option>
          {ROLES_FILTRE.map((r) => (
            <option key={r} value={r}>
              {ROLES[r].libelle}
            </option>
          ))}
        </Selecteur>
        {filtre ? (
          <button
            type="button"
            onClick={() => {
              setRecherche("");
              router.replace(chemin, { scroll: false });
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Effacer
          </button>
        ) : null}
      </div>

      {lignes.length === 0 ? (
        <EtatVide
          icone={<Users className="h-6 w-6" />}
          titre={filtre ? "Aucun membre ne correspond" : "L'annuaire est vide"}
          description={
            filtre
              ? "Élargissez la recherche : un autre département, une autre organisation, ou aucun filtre."
              : "Les membres apparaissent ici dès qu'ils ont confirmé leur courriel et accepté de figurer dans l'annuaire."
          }
        />
      ) : (
        <>
          <p className="text-[13px] text-muted-foreground">{pluriel(lignes.length, "membre")}</p>
          <ul className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-3">
            {lignes.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/membres/${l.id}`}
                  className={cn(
                    "flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-4",
                    "transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/20"
                  )}
                >
                  <Avatar nom={l.nom} photo={l.photoUrl} taille="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{l.nom}</span>
                    {l.poste ? <span className="block truncate text-[13px] text-muted-foreground">{l.poste}</span> : null}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      {l.je ? <Pastille couleur={l.jeCouleur}>{l.je}</Pastille> : null}
                      {l.roles.includes("FORMATEUR") ? <Pastille ton="nuit">Formateur</Pastille> : null}
                    </span>
                  </span>
                  {l.niveau !== null ? (
                    <span className="shrink-0 text-center">
                      <span className="block text-[17px] font-black leading-none tabular-nums">{l.niveau}</span>
                      <span className="block text-[10px] font-semibold text-muted-foreground">niveau</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
