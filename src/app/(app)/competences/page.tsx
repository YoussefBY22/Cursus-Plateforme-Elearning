import Link from "next/link";
import { CalendarClock, Hexagon } from "lucide-react";
import { CarteJoueur } from "@/components/competences/carte-joueur";
import { Explorateur } from "@/components/competences/explorateur";
import { LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { pluriel } from "@/lib/utils";
import {
  detailsDomaines,
  formationsExternesAEvaluer,
  identiteJoueur,
  profilCompetences,
} from "@/server/requetes/competences";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Mes compétences" };

export default async function PageCompetences() {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const [profil, identite, details, externes] = await Promise.all([
    profilCompetences(u.id),
    identiteJoueur(u.id),
    detailsDomaines(u.id),
    formationsExternesAEvaluer(u.id),
  ]);

  const aEvaluer = profil.domaines.filter((d) => d.mesurees === 0 && d.total > 0);

  return (
    <div>
      <EntetePage
        titre="Mes compétences"
        description="Une mesure commune à toutes les organisations de la plateforme : même méthode pour les formations Cursus et pour celles que votre organisation organise elle-même."
        actions={
          aEvaluer.length ? (
            <LienBouton href={`/competences/auto-evaluation/${aEvaluer[0].code}`} taille="lg">
              Commencer une auto-évaluation
            </LienBouton>
          ) : undefined
        }
      />

      {externes.length ? (
        <Carte className="mb-6 border-l-4 border-l-[var(--primary)]">
          <CorpsCarte className="flex flex-wrap items-center gap-4 pt-5">
            <CalendarClock className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-48 flex-1">
              <p className="text-[13px] font-semibold">
                {pluriel(externes.length, "formation externe")} en attente de votre mesure
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Votre responsable RH a enregistré votre participation. L&apos;auto-évaluation d&apos;avant et
                d&apos;après est ce qui rend cette formation comparable aux autres.
              </p>
            </div>
            <LienBouton href={`/competences/externe/${externes[0].id}`} taille="sm">
              Ouvrir
            </LienBouton>
          </CorpsCarte>
        </Carte>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {identite ? (
            <CarteJoueur
              identite={identite}
              noteGenerale={profil.noteGenerale}
              palier={profil.palier}
              domaines={profil.domaines}
            />
          ) : null}

          <Carte>
            <EnteteCarte titre="Comment c'est calculé" />
            <CorpsCarte className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
              <p>
                Votre point de départ vient de votre auto-évaluation. Il bouge ensuite selon trois mesures : vos
                résultats aux quiz, l&apos;évaluation du formateur, et votre propre regard après la formation.
              </p>
              <p>
                Une partie du gain reste provisoire jusqu&apos;à l&apos;évaluation à froid, un mois après : c&apos;est
                la mise en pratique qui confirme l&apos;acquis.
              </p>
              <p>
                Se surnoter ne sert à rien — la part déclarative est plafonnée par les mesures objectives.
              </p>
            </CorpsCarte>
          </Carte>

          {profil.autoEvaluations > 0 ? (
            <p className="text-[13px] text-muted-foreground">
              {pluriel(profil.autoEvaluations, "auto-évaluation", "auto-évaluations")} à ce jour.
            </p>
          ) : null}
        </aside>

        <div>
          {profil.domaines.length === 0 ? (
            <EtatVide
              icone={<Hexagon className="h-6 w-6" />}
              titre="Aucun référentiel pour votre organisation"
              description="Votre responsable RH n'a pas encore adopté de référentiel de compétences. Prévenez-le : c'est lui qui choisit les compétences suivies dans votre organisation."
            />
          ) : !profil.aDesMesures ? (
            <Carte>
              <CorpsCarte className="pt-6">
                <EtatVide
                  icone={<Hexagon className="h-6 w-6" />}
                  titre="Votre profil démarre ici"
                  description="Une auto-évaluation par domaine, une vingtaine de questions, dix secondes chacune. Répondez d'instinct : l'objectif n'est pas d'avoir juste, mais de savoir d'où vous partez."
                  action={
                    aEvaluer.length ? (
                      <LienBouton href={`/competences/auto-evaluation/${aEvaluer[0].code}`}>
                        Commencer par {aEvaluer[0].nom}
                      </LienBouton>
                    ) : undefined
                  }
                />
              </CorpsCarte>
            </Carte>
          ) : (
            <Explorateur domaines={profil.domaines} details={details} />
          )}

          {aEvaluer.length && profil.aDesMesures ? (
            <Carte className="mt-6">
              <EnteteCarte
                titre="Domaines pas encore mesurés"
                description="Quelques minutes par domaine, et votre radar se complète."
              />
              <CorpsCarte className="flex flex-wrap gap-2">
                {aEvaluer.map((d) => (
                  <Link
                    key={d.id}
                    href={`/competences/auto-evaluation/${d.code}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-[13px] font-semibold hover:border-foreground/30 hover:bg-muted"
                  >
                    {d.nom}
                    <span className="text-muted-foreground">{pluriel(d.total, "compétence")}</span>
                  </Link>
                ))}
              </CorpsCarte>
            </Carte>
          ) : null}
        </div>
      </div>
    </div>
  );
}

