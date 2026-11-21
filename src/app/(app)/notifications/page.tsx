import Link from "next/link";
import { BellOff, CheckCheck } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Onglets } from "@/components/ui/onglets";
import { cn, depuis } from "@/lib/utils";
import { marquerNotificationLue, marquerToutesLues } from "@/server/actions/notifications";
import { mesNotifications } from "@/server/requetes/gamification";
import { exigerSession } from "@/server/session";

export const metadata = { title: "Notifications" };

export default async function PageNotifications({ searchParams }: PageProps<"/notifications">) {
  const u = await exigerSession();
  const q = await searchParams;
  const onglet = q.filtre === "non-lues" ? "non-lues" : "toutes";
  const { lignes, nonLues } = await mesNotifications(u.id, { seulementNonLues: onglet === "non-lues" });

  return (
    <div>
      <EntetePage
        titre="Notifications"
        description="Validations, badges, certificats, évaluations à froid : tout ce qui vous attend."
        actions={
          nonLues > 0 ? (
            <form
              action={async () => {
                "use server";
                await marquerToutesLues();
              }}
            >
              <Bouton type="submit" variante="contour">
                <CheckCheck className="h-4 w-4" aria-hidden />
                Tout marquer comme lu
              </Bouton>
            </form>
          ) : undefined
        }
      />

      <Onglets
        onglets={[
          { cle: "toutes", libelle: "Toutes", href: "/notifications" },
          { cle: "non-lues", libelle: "Non lues", href: "/notifications?filtre=non-lues", compteur: nonLues },
        ]}
        actif={onglet}
      />

      <div className="mt-5">
        {lignes.length === 0 ? (
          <EtatVide
            icone={<BellOff className="h-6 w-6" />}
            titre={onglet === "non-lues" ? "Tout est lu" : "Aucune notification"}
            description={
              onglet === "non-lues"
                ? "Rien ne vous attend. Repassez plus tard."
                : "Les notifications arrivent quand une formation est validée, un badge décroché ou une évaluation à froid attendue."
            }
          />
        ) : (
          <Carte>
            <CorpsCarte className="pt-0">
              <ul className="divide-y divide-border">
                {lignes.map((n) => {
                  const contenu = (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.lue ? "bg-transparent" : "bg-primary"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[14px] leading-snug", n.lue ? "font-medium" : "font-bold")}>
                          {n.titre}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{depuis(n.creeLe)}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={n.id} className="flex items-start gap-3 py-3.5">
                      {n.lien ? (
                        <Link
                          href={n.lien}
                          className="-mx-2 flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-muted/60"
                        >
                          {contenu}
                        </Link>
                      ) : (
                        <span className="flex min-w-0 flex-1 items-start gap-3 px-2 py-1">{contenu}</span>
                      )}
                      {!n.lue ? (
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            await marquerNotificationLue(formData);
                          }}
                        >
                          <input type="hidden" name="id" value={n.id} />
                          <Bouton type="submit" variante="fantome" taille="sm" aria-label="Marquer comme lue">
                            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                          </Bouton>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </CorpsCarte>
          </Carte>
        )}
      </div>
    </div>
  );
}
