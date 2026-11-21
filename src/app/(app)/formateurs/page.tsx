import Link from "next/link";
import { GraduationCap, Star, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { pluriel } from "@/lib/utils";
import { listeFormateurs } from "@/server/requetes/profils";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Formateurs" };

export default async function PageFormateurs() {
  await exigerPermissionPage("annuaire", "lire");
  const formateurs = await listeFormateurs();

  return (
    <div>
      <EntetePage
        titre="Formateurs"
        description="Celles et ceux qui transmettent. Leur profil dit ce qu'ils animent et ce qu'en pensent les apprenants."
      />

      {formateurs.length === 0 ? (
        <EtatVide
          icone={<GraduationCap className="h-6 w-6" />}
          titre="Aucun formateur pour l'instant"
          description="L'équipe pédagogique attribue le rôle de formateur depuis l'administration."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3">
          {formateurs.map((f) => (
            <li key={f.id}>
              <Link
                href={`/formateurs/${f.id}`}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <div className="flex items-center gap-3">
                  <Avatar nom={f.nom} photo={f.photoUrl} taille="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{f.nom}</p>
                    {f.poste ? <p className="truncate text-[13px] text-muted-foreground">{f.poste}</p> : null}
                  </div>
                </div>

                {f.je ? (
                  <div className="mt-3">
                    <Pastille ton="contour">{f.je}</Pastille>
                  </div>
                ) : null}

                <dl className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3.5 text-[13px]">
                  <div>
                    <dt className="text-xs text-muted-foreground">Formations</dt>
                    <dd className="font-bold tabular-nums">{f.formations}</dd>
                  </div>
                  <div>
                    <dt className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" aria-hidden />
                      Apprenants
                    </dt>
                    <dd className="font-bold tabular-nums">{f.apprenants}</dd>
                  </div>
                  {f.satisfaction !== null ? (
                    <div>
                      <dt className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" aria-hidden />
                        Satisfaction
                      </dt>
                      <dd className="font-bold tabular-nums">{f.satisfaction} / 5</dd>
                    </div>
                  ) : null}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {formateurs.length ? (
        <p className="mt-5 text-[13px] text-muted-foreground">{pluriel(formateurs.length, "formateur")}</p>
      ) : null}
    </div>
  );
}
