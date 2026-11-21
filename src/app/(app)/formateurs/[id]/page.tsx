import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Star, ThumbsUp, Users } from "lucide-react";
import { CarteProfil, FriseProfil } from "@/components/profils/carte-profil";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { Stat } from "@/components/ui/stat";
import { pluriel } from "@/lib/utils";
import { profilFormateur } from "@/server/requetes/profils";
import { exigerPermissionPage } from "@/server/session";
import { formaterDuree } from "@/services/visionnage";

export const metadata = { title: "Profil formateur" };

export default async function PageFormateur({ params }: PageProps<"/formateurs/[id]">) {
  const u = await exigerPermissionPage("annuaire", "lire");
  const { id } = await params;
  const f = await profilFormateur(u, id);
  if (!f) notFound();

  return (
    <div className="space-y-6">
      <EntetePage
        titre={f.profil.nom}
        description="Profil formateur"
        retour={{ href: "/formateurs", libelle: "Formateurs" }}
      />

      <CarteProfil profil={f.profil} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat libelle="Formations animées" valeur={f.stats.formations} />
        <Stat libelle="Apprenants touchés" valeur={f.stats.apprenants} icone={<Users className="h-4 w-4" />} />
        <Stat
          libelle="Formations terminées"
          valeur={f.stats.terminees}
          indice="par les apprenants"
          icone={<ThumbsUp className="h-4 w-4" />}
        />
        <Stat
          libelle="Satisfaction"
          valeur={f.stats.satisfaction !== null ? `${f.stats.satisfaction} / 5` : "—"}
          indice={f.stats.satisfaction !== null ? "enquêtes à chaud" : "pas encore d'enquête"}
          icone={<Star className="h-4 w-4" />}
          accent="var(--or)"
        />
      </div>

      <Carte>
        <EnteteCarte
          titre="Ses formations"
          description={
            f.stats.note !== null
              ? `Note moyenne ${f.stats.note} / 5 sur ${pluriel(f.stats.avis, "avis")}`
              : "Aucune note déposée pour l'instant."
          }
        />
        <CorpsCarte className="pt-0">
          {f.formations.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Aucune formation publiée pour l&apos;instant.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {f.formations.map((fo) => (
                <li key={fo.id}>
                  <Link
                    href={`/formations/${fo.slug}`}
                    className="group -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-muted/60"
                  >
                    <span aria-hidden className="h-9 w-1 shrink-0 rounded-full" style={{ background: fo.couleur }} />
                    <span className="min-w-40 flex-1">
                      <span className="block text-[14px] font-semibold leading-snug">{fo.titre}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {fo.domaine} · {formaterDuree(fo.dureeSec)}
                      </span>
                    </span>
                    {fo.note !== null ? (
                      <Pastille ton="or">
                        <Star className="mr-1 inline h-3 w-3 fill-current" aria-hidden />
                        {fo.note.toFixed(1)}
                      </Pastille>
                    ) : null}
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pluriel(fo.apprenants, "apprenant")}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CorpsCarte>
      </Carte>

      <FriseProfil profil={f.profil} />
    </div>
  );
}
