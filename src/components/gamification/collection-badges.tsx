"use client";

import * as React from "react";
import { Lock, Medal } from "lucide-react";
import { BadgeVisuel } from "@/components/gamification/badge-visuel";
import { BarreProgression } from "@/components/ui/barre-progression";
import { Dialogue } from "@/components/ui/dialogue";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { cn, formaterDate, pluriel } from "@/lib/utils";
import type { BadgeCollection } from "@/server/requetes/gamification";
import { LIBELLES } from "@/services/badges";
import { PastilleRarete } from "@/components/admin/badges-communs";

type Onglet = "tous" | "obtenus" | "a-decrocher";

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "tous", libelle: "Tous" },
  { cle: "obtenus", libelle: "Obtenus" },
  { cle: "a-decrocher", libelle: "À décrocher" },
];

/**
 * Collection de badges.
 *
 * Un badge non obtenu montre où l'on en est, pas une silhouette grise : sans
 * l'écart qui reste à combler, une collection verrouillée ne motive
 * personne. Les badges secrets, eux, ne révèlent rien avant l'obtention.
 */
export function CollectionBadges({ badges }: { badges: BadgeCollection[] }) {
  const [onglet, setOnglet] = React.useState<Onglet>("tous");
  const [ouvert, setOuvert] = React.useState<BadgeCollection | null>(null);

  const visibles = badges.filter((b) =>
    onglet === "obtenus" ? b.obtenuLe : onglet === "a-decrocher" ? !b.obtenuLe : true
  );

  // Les plus proches de l'obtention d'abord : c'est l'ordre utile.
  const tries = [...visibles].sort((a, b) => {
    if (!!a.obtenuLe !== !!b.obtenuLe) return a.obtenuLe ? -1 : 1;
    if (a.obtenuLe && b.obtenuLe) return b.obtenuLe.getTime() - a.obtenuLe.getTime();
    return b.avancement - a.avancement;
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Filtrer les badges">
        {ONGLETS.map((o) => {
          const n = o.cle === "obtenus" ? badges.filter((b) => b.obtenuLe).length : o.cle === "a-decrocher" ? badges.filter((b) => !b.obtenuLe).length : badges.length;
          return (
            <button
              key={o.cle}
              type="button"
              role="tab"
              aria-selected={onglet === o.cle}
              onClick={() => setOnglet(o.cle)}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors",
                onglet === o.cle ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.libelle}
              <span className="ml-1.5 tabular-nums opacity-60">{n}</span>
            </button>
          );
        })}
      </div>

      {tries.length === 0 ? (
        <EtatVide
          icone={<Medal className="h-6 w-6" />}
          titre={onglet === "obtenus" ? "Aucun badge pour l'instant" : "Tout est décroché"}
          description={
            onglet === "obtenus"
              ? "Terminez une première formation : le premier badge tombe vite."
              : "Vous avez l'intégralité de la collection. Il faudra attendre les prochains."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 min-[520px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tries.map((b) => {
            const obtenu = !!b.obtenuLe;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setOuvert(b)}
                  className={cn(
                    "flex h-full w-full flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-[border-color,transform]",
                    "hover:-translate-y-0.5 hover:border-foreground/20",
                    obtenu ? "border-border bg-card" : "border-dashed border-border bg-card/60"
                  )}
                >
                  <BadgeVisuel
                    apparence={{
                      forme: b.forme,
                      matiere: b.matiere,
                      rarete: b.rarete,
                      effet: b.effet,
                      couleur: b.couleur,
                      icone: b.icone,
                    }}
                    taille={76}
                    verrouille={!obtenu}
                    anime={obtenu}
                  />
                  <span className="text-[13px] font-semibold leading-snug">{b.nom}</span>
                  {obtenu ? (
                    <span className="text-xs text-muted-foreground">Obtenu le {formaterDate(b.obtenuLe!)}</span>
                  ) : b.seuil !== null && b.valeurActuelle !== null ? (
                    <span className="w-full">
                      <BarreProgression valeur={b.avancement} />
                      <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                        {b.valeurActuelle} / {b.seuil} {b.unite}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden />
                      Secret
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialogue ouvert={!!ouvert} onFermer={() => setOuvert(null)} titre={ouvert?.nom}>
        {ouvert ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <BadgeVisuel
                apparence={{
                  forme: ouvert.forme,
                  matiere: ouvert.matiere,
                  rarete: ouvert.rarete,
                  effet: ouvert.effet,
                  couleur: ouvert.couleur,
                  icone: ouvert.icone,
                }}
                taille={132}
                verrouille={!ouvert.obtenuLe}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <PastilleRarete rarete={ouvert.rarete} />
              <Pastille ton="contour">{LIBELLES.matiere[ouvert.matiere as keyof typeof LIBELLES.matiere] ?? ouvert.matiere}</Pastille>
              {ouvert.xpBonus > 0 ? <Pastille ton="or">+{ouvert.xpBonus} XP</Pastille> : null}
            </div>
            <p className="text-center text-[15px] leading-relaxed">{ouvert.description}</p>

            {ouvert.critere && ouvert.seuil !== null ? (
              <div className="rounded-xl bg-muted/60 p-3.5">
                <p className="text-[13px] font-semibold">{ouvert.critere}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Seuil : {ouvert.seuil} {ouvert.unite}
                </p>
                {!ouvert.obtenuLe && ouvert.valeurActuelle !== null ? (
                  <div className="mt-2.5">
                    <BarreProgression valeur={ouvert.avancement} />
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      Vous en êtes à {ouvert.valeurActuelle} {ouvert.unite}.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              {ouvert.obtenuLe
                ? `Obtenu le ${formaterDate(ouvert.obtenuLe)} · ${pluriel(ouvert.obtenusAilleurs, "membre l'a", "membres l'ont")} décroché`
                : `${pluriel(ouvert.obtenusAilleurs, "membre l'a", "membres l'ont")} déjà décroché`}
            </p>
          </div>
        ) : null}
      </Dialogue>
    </div>
  );
}
