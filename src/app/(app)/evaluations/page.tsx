import Link from "next/link";
import { CalendarCheck, ChevronRight, TrendingUp } from "lucide-react";
import { Icone } from "@/components/icones";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { formaterDate, pluriel } from "@/lib/utils";
import { evaluationsAFroidDues } from "@/server/requetes/evaluations";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Évaluations à froid" };

export default async function PageEvaluations() {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const dues = await evaluationsAFroidDues(u.id);
  const enAttente = dues.reduce((s, d) => s + d.gainEnAttente, 0);

  return (
    <div>
      <EntetePage
        titre="Évaluations à froid"
        description="Un mois après une formation, une question : qu'en avez-vous fait ? C'est elle qui confirme vos acquis."
      />

      {dues.length === 0 ? (
        <EtatVide
          icone={<CalendarCheck className="h-6 w-6" />}
          titre="Rien à évaluer pour l'instant"
          description="Les formations que vous terminez réapparaissent ici un mois plus tard. Vous recevrez une notification."
        />
      ) : (
        <>
          {enAttente > 0 ? (
            <Carte className="mb-5 border-l-4 border-l-[var(--primary)]">
              <CorpsCarte className="flex flex-wrap items-center gap-3 pt-5">
                <TrendingUp className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="min-w-48 flex-1 text-[13px] leading-relaxed">
                  <strong className="font-semibold">
                    {Math.round(enAttente * 10) / 10} points de compétence
                  </strong>{" "}
                  attendent ces réponses. Tant qu&apos;elles manquent, cette part reste provisoire.
                </p>
              </CorpsCarte>
            </Carte>
          ) : null}

          <Carte>
            <EnteteCarte titre={pluriel(dues.length, "formation à évaluer", "formations à évaluer")} />
            <CorpsCarte className="pt-0">
              <ul className="divide-y divide-border">
                {dues.map((d) => (
                  <li key={d.formationId}>
                    <Link
                      href={`/evaluations/${d.slug}`}
                      className="group -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-muted/60"
                    >
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ background: d.couleur }}
                      >
                        <Icone nom={d.icone} className="h-4 w-4" />
                      </span>
                      <span className="min-w-40 flex-1">
                        <span className="block text-[14px] font-semibold leading-snug">{d.titre}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {d.domaine} · terminée le {formaterDate(d.termineeLe)} ({d.joursEcoules} jours)
                        </span>
                      </span>
                      {d.gainEnAttente > 0 ? (
                        <Pastille ton="primaire">+{d.gainEnAttente} en jeu</Pastille>
                      ) : null}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </CorpsCarte>
          </Carte>
        </>
      )}
    </div>
  );
}
