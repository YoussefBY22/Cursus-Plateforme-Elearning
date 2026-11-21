import { Medal, Sparkles, Trophy } from "lucide-react";
import { CollectionBadges } from "@/components/gamification/collection-badges";
import { BarreProgression } from "@/components/ui/barre-progression";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Stat } from "@/components/ui/stat";
import { maCollection } from "@/server/requetes/gamification";
import { exigerPermissionPage } from "@/server/session";
import { LIBELLES } from "@/services/badges";

export const metadata = { title: "Badges" };

export default async function PageBadges() {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const c = await maCollection(u.id);

  return (
    <div>
      <EntetePage
        titre="Badges"
        description="Chaque badge marque quelque chose de précis. Ceux qui restent affichent ce qu'il manque pour les décrocher."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid grid-cols-2 gap-4 min-[520px]:grid-cols-3">
          <Stat
            libelle="Badges obtenus"
            valeur={`${c.obtenus} / ${c.total}`}
            icone={<Medal className="h-4 w-4" />}
            accent="var(--or)"
          />
          <Stat libelle="Niveau" valeur={c.niveau.niveau} indice={c.niveau.titre} icone={<Sparkles className="h-4 w-4" />} />
          <Stat libelle="Expérience" valeur={c.xp.toLocaleString("fr-FR")} indice="XP cumulés" />
        </div>

        <Carte>
          <EnteteCarte titre="Par rareté" />
          <CorpsCarte className="space-y-3 pt-0">
            {c.parRarete.map((r) => (
              <div key={r.rarete}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-semibold">
                    {LIBELLES.rarete[r.rarete as keyof typeof LIBELLES.rarete] ?? r.rarete}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.obtenus} / {r.total}
                  </span>
                </div>
                <BarreProgression valeur={r.total ? r.obtenus / r.total : 0} />
              </div>
            ))}
          </CorpsCarte>
        </Carte>
      </div>

      {c.total === 0 ? (
        <Carte>
          <CorpsCarte className="flex items-center gap-3 pt-5 text-[13px] text-muted-foreground">
            <Trophy className="h-5 w-5 shrink-0" aria-hidden />
            Aucun badge n&apos;est encore défini. L'équipe pédagogique les crée depuis
            l&apos;administration.
          </CorpsCarte>
        </Carte>
      ) : (
        <CollectionBadges badges={c.badges} />
      )}
    </div>
  );
}
