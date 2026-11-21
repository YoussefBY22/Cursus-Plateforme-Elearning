"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EyeOff, Medal, Search, Sparkles, Users } from "lucide-react";
import { BadgeVisuel } from "@/components/gamification/badge-visuel";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { cn } from "@/lib/utils";
import { attribuerRetroactivement } from "@/server/actions/admin-badges";
import { LIBELLES, RARETES } from "@/services/badges";
import { PastilleRarete, phraseCritere } from "./badges-communs";
import { lancerAction } from "./retour-action";

export type CarteBadge = {
  id: string;
  nom: string;
  description: string;
  couleur: string;
  forme: string;
  matiere: string;
  rarete: string;
  effet: string;
  icone: string;
  critereCode: string;
  critere: string;
  unite: string;
  seuil: number;
  parametre: string | null;
  xpBonus: number;
  secret: boolean;
  actif: boolean;
  obtenus: number;
};

const classeFiltre = "h-10 rounded-full border border-border bg-card px-3 text-sm text-foreground";

export function BoutonAttributionRetroactive() {
  return (
    <BoutonConfirme
      variante="contour"
      titre="Attribuer rétroactivement"
      libelleConfirmation="Lancer la vérification"
      message="Les critères de tous les badges actifs sont recalculés pour chaque membre actif. Les badges mérités sont attribués avec leur notification et leur bonus d'XP ; aucun badge n'est retiré. Comptez quelques secondes par centaine de membres."
      action={async () => {
        await lancerAction(() => attribuerRetroactivement());
      }}
    >
      <Sparkles size={16} /> Attribuer rétroactivement
    </BoutonConfirme>
  );
}

export function GalerieBadges({
  badges,
  membresActifs,
  nomsParametres,
}: {
  badges: CarteBadge[];
  membresActifs: number;
  nomsParametres: Record<string, string>;
}) {
  const [terme, setTerme] = useState("");
  const [rarete, setRarete] = useState("");
  const [critere, setCritere] = useState("");
  const [etat, setEtat] = useState("actifs");

  const criteres = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of badges) m.set(b.critereCode, b.critere);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [badges]);

  const visibles = useMemo(() => {
    const t = terme.trim().toLowerCase();
    return badges.filter(
      (b) =>
        (!t || `${b.nom} ${b.description}`.toLowerCase().includes(t)) &&
        (!rarete || b.rarete === rarete) &&
        (!critere || b.critereCode === critere) &&
        (etat === "tous" || (etat === "actifs" ? b.actif : !b.actif))
    );
  }, [badges, terme, rarete, critere, etat]);

  if (badges.length === 0) {
    return (
      <EtatVide
        icone={<Medal className="h-6 w-6" />}
        titre="Aucun badge pour l'instant"
        description="Composez le premier badge : une forme, une matière, une rareté et un critère de déblocage. Les membres le verront dans leur collection."
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            placeholder="Rechercher un badge…"
            aria-label="Rechercher un badge"
            className={cn(classeFiltre, "w-full pl-9 focus:border-primary focus:outline-none")}
          />
        </div>
        <select value={rarete} onChange={(e) => setRarete(e.target.value)} className={classeFiltre} aria-label="Filtrer par rareté">
          <option value="">Rareté — toutes</option>
          {RARETES.map((r) => (
            <option key={r} value={r}>
              {LIBELLES.rarete[r]}
            </option>
          ))}
        </select>
        <select value={critere} onChange={(e) => setCritere(e.target.value)} className={cn(classeFiltre, "max-w-[14rem]")} aria-label="Filtrer par critère">
          <option value="">Critère — tous</option>
          {criteres.map(([code, libelle]) => (
            <option key={code} value={code}>
              {libelle}
            </option>
          ))}
        </select>
        <select value={etat} onChange={(e) => setEtat(e.target.value)} className={classeFiltre} aria-label="Filtrer par état">
          <option value="actifs">Actifs</option>
          <option value="archives">Archivés</option>
          <option value="tous">Tous</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {visibles.length} / {badges.length}
        </span>
      </div>

      {visibles.length === 0 ? (
        <EtatVide
          compact
          icone={<Medal className="h-6 w-6" />}
          titre="Aucun badge ne correspond"
          description="Changez la rareté, le critère ou l'état, ou effacez la recherche."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibles.map((b) => {
            const part = membresActifs > 0 ? b.obtenus / membresActifs : 0;
            return (
              <li key={b.id}>
                <Link
                  href={`/admin/badges/${b.id}`}
                  className={cn(
                    "group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/25",
                    !b.actif && "border-dashed"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <BadgeVisuel
                      apparence={{ forme: b.forme, matiere: b.matiere, rarete: b.rarete, effet: b.effet, couleur: b.couleur, icone: b.icone }}
                      taille={72}
                      verrouille={!b.actif}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight group-hover:text-primary">{b.nom}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <PastilleRarete rarete={b.rarete} />
                        {!b.actif ? <Pastille ton="contour">Archivé</Pastille> : null}
                        {b.secret ? (
                          <Pastille ton="nuit" title="Caché aux membres tant qu'il n'est pas obtenu">
                            <EyeOff size={11} aria-hidden /> Secret
                          </Pastille>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[13px] text-muted-foreground">{b.description}</p>
                  <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-[13px] font-medium">
                    {phraseCritere(b.critere, b.unite, b.seuil, b.parametre ? (nomsParametres[b.parametre] ?? "?") : null)}
                    {b.xpBonus > 0 ? <span className="chiffres ml-1.5 font-bold text-or">+{b.xpBonus} XP</span> : null}
                  </p>
                  <div className="mt-auto pt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users size={12} aria-hidden />
                        {b.obtenus === 0 ? "Pas encore obtenu" : `Obtenu par ${b.obtenus.toLocaleString("fr-FR")} membre${b.obtenus > 1 ? "s" : ""}`}
                      </span>
                      <span className="chiffres">{Math.round(part * 100)} %</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-or" style={{ width: `${Math.min(100, part * 100)}%` }} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
