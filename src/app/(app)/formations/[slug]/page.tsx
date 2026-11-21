import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, Check, Clock, ListChecks, Play, Route, Target } from "lucide-react";
import { BlocNotation } from "@/components/catalogue/bloc-notation";
import { Commentaires } from "@/components/catalogue/commentaires";
import { Etoiles } from "@/components/catalogue/etoiles";
import { Icone } from "@/components/icones";
import { Avatar } from "@/components/ui/avatar";
import { LienBouton } from "@/components/ui/bouton";
import { BarreProgression } from "@/components/ui/barre-progression";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { db } from "@/db";
import { formations, utilisateurs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nomComplet, pluriel } from "@/lib/utils";
import { detailFormation } from "@/server/requetes/catalogue";
import { NIVEAUX } from "@/services/catalogue";
import { exigerPermissionPage } from "@/server/session";
import { formaterDuree, horodatage } from "@/services/visionnage";

export async function generateMetadata({ params }: PageProps<"/formations/[slug]">) {
  const { slug } = await params;
  const [f] = await db.select({ titre: formations.titre }).from(formations).where(eq(formations.slug, slug)).limit(1);
  return { title: f?.titre ?? "Formation" };
}

const LIBELLES_CTA = {
  absente: "Commencer la formation",
  EN_COURS: "Reprendre la lecture",
  ENQUETE_REQUISE: "Terminer l'évaluation",
  TERMINEE: "Revoir la formation",
} as const;

export default async function PageFormation({ params }: PageProps<"/formations/[slug]">) {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const { slug } = await params;
  const f = await detailFormation(slug, u.id);
  if (!f) notFound();

  const [moi] = await db
    .select({ id: utilisateurs.id, prenom: utilisateurs.prenom, nom: utilisateurs.nom, photoUrl: utilisateurs.photoUrl })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, u.id))
    .limit(1);

  const prog = f.progression;
  const couverture = prog ? Math.min(1, prog.secondesVues / Math.max(1, f.dureeSec)) : 0;
  const cta = LIBELLES_CTA[prog?.statut ?? "absente"];
  const couleur = f.domaine.couleur;

  return (
    <div>
      <EntetePage
        retour={{ href: "/catalogue", libelle: "Catalogue" }}
        titre={f.titre}
        description={f.resume}
        actions={
          <LienBouton href={`/formations/${f.slug}/lecture`} taille="lg">
            <Play className="h-4 w-4 fill-current" aria-hidden />
            {cta}
          </LienBouton>
        }
      />

      <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
        <Pastille couleur={couleur}>
          <Icone nom={f.domaine.icone} className="h-3.5 w-3.5" />
          {f.domaine.nom}
        </Pastille>
        <span className="font-semibold text-foreground">{NIVEAUX[f.niveau]}</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden />
          {formaterDuree(f.dureeSec)}
        </span>
        {f.quizIntegres.length || f.aQuizFinal ? (
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" aria-hidden />
            {f.quizIntegres.length > 0 ? `${f.quizIntegres.length} quiz pendant la vidéo` : "Sans quiz intégré"}
            {f.aQuizFinal ? ", puis un quiz final" : ""}
          </span>
        ) : null}
        <Etoiles note={f.note} nb={f.nbNotes} />
      </div>

      {prog ? (
        <Carte className="mb-7 border-l-4" style={{ borderLeftColor: couleur }}>
          <CorpsCarte className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-5">
            <div className="min-w-48 flex-1">
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="font-semibold">
                  {prog.statut === "TERMINEE"
                    ? "Formation terminée"
                    : prog.statut === "ENQUETE_REQUISE"
                      ? "Vidéo et quiz faits — il reste l'enquête de satisfaction"
                      : `Reprise à ${horodatage(prog.positionSec)}`}
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round(couverture * 100)} % vus</span>
              </div>
              <BarreProgression
                valeur={couverture}
                couleur={prog.statut === "TERMINEE" ? "var(--success)" : couleur}
                libelle="Avancement du visionnage"
              />
            </div>
            {prog.statut === "TERMINEE" ? (
              <Pastille ton="succes">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Validée
              </Pastille>
            ) : null}
          </CorpsCarte>
        </Carte>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {f.objectifs.length ? (
            <Carte>
              <EnteteCarte titre="Ce que vous saurez faire après" />
              <CorpsCarte>
                <ul className="space-y-2.5">
                  {f.objectifs.map((o) => (
                    <li key={o} className="flex gap-3 text-sm leading-relaxed">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {o}
                    </li>
                  ))}
                </ul>
              </CorpsCarte>
            </Carte>
          ) : null}

          <Carte>
            <EnteteCarte titre="Présentation" />
            <CorpsCarte>
              <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                {f.description.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
              {f.tags.length ? (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <Pastille key={t} ton="contour">
                      {t}
                    </Pastille>
                  ))}
                </div>
              ) : null}
            </CorpsCarte>
          </Carte>

          {f.quizIntegres.length || f.aQuizFinal ? (
            <Carte>
              <EnteteCarte
                titre="Déroulé"
                description="Les quiz s'ouvrent au fil de la vidéo. Il faut y répondre pour continuer — c'est ce qui rend la progression fiable."
              />
              <CorpsCarte>
                <ol className="relative space-y-4 border-l-2 border-border pl-5">
                  {f.quizIntegres.map((q) => (
                    <li key={q.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-card"
                        style={{ background: couleur }}
                      />
                      <p className="text-sm font-semibold">{q.titre}</p>
                      <p className="text-xs text-muted-foreground">
                        À {horodatage(q.tempsSec ?? 0)} dans la vidéo
                      </p>
                    </li>
                  ))}
                  {f.aQuizFinal ? (
                    <li className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-card"
                      />
                      <p className="text-sm font-semibold">Quiz final</p>
                      <p className="text-xs text-muted-foreground">
                        À la fin, une fois la vidéo vue et les quiz intégrés faits.
                      </p>
                    </li>
                  ) : null}
                </ol>
              </CorpsCarte>
            </Carte>
          ) : null}

          <Carte>
            <EnteteCarte titre="Votre avis" description="Visible uniquement après avoir commencé la formation." />
            <CorpsCarte>
              {prog ? (
                <BlocNotation
                  formationId={f.id}
                  maNote={f.maNote}
                  note={f.note}
                  nbNotes={f.nbNotes}
                  repartition={f.repartition}
                />
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Commencez la formation pour la noter. Les notes viennent de membres qui l'ont réellement suivie.
                </p>
              )}
            </CorpsCarte>
          </Carte>

          <Carte>
            <EnteteCarte titre="Discussion" description={pluriel(nbMessages(f.commentaires), "message")} />
            <CorpsCarte>
              <Commentaires
                formationId={f.id}
                fil={f.commentaires}
                moi={moi ?? { id: u.id, prenom: "Moi", nom: "", photoUrl: null }}
                peutEcrire={Boolean(prog)}
              />
            </CorpsCarte>
          </Carte>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {f.acquis.length ? (
            <Carte>
              <EnteteCarte
                titre="Compétences visées"
                description="Terminer la formation fait monter ces compétences sur votre profil."
              />
              <CorpsCarte>
                <ul className="space-y-2">
                  {f.acquis.map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5 text-[13px]">
                      <Target className="mt-0.5 h-4 w-4 shrink-0" style={{ color: c.domaineCouleur }} aria-hidden />
                      <span className="min-w-0 flex-1 font-medium">{c.nom}</span>
                      {c.poids > 1 ? (
                        <Pastille ton="neutre" className="shrink-0">
                          {c.poids === 3 ? "cœur" : "important"}
                        </Pastille>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/competences"
                  className="mt-4 inline-block text-[13px] font-semibold text-primary hover:underline"
                >
                  Voir mon profil de compétences
                </Link>
              </CorpsCarte>
            </Carte>
          ) : null}

          {f.formateur ? (
            <Carte>
              <EnteteCarte titre="Formateur" />
              <CorpsCarte>
                <div className="flex items-center gap-3">
                  <Avatar nom={nomComplet(f.formateur)} photo={f.formateur.photoUrl} taille="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{nomComplet(f.formateur)}</p>
                    {f.formateur.poste ? (
                      <p className="truncate text-[13px] text-muted-foreground">{f.formateur.poste}</p>
                    ) : null}
                  </div>
                </div>
                {f.formateur.bio ? (
                  <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">{f.formateur.bio}</p>
                ) : null}
                {f.formateur.visibleAnnuaire ? (
                  <Link
                    href={`/formateurs/${f.formateur.id}`}
                    className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline"
                  >
                    Voir son profil
                  </Link>
                ) : null}
              </CorpsCarte>
            </Carte>
          ) : null}

          {f.parcours.length ? (
            <Carte>
              <EnteteCarte titre="Fait partie d'un parcours" />
              <CorpsCarte className="space-y-2">
                {f.parcours.map((p) => (
                  <Link
                    key={p.id}
                    href={`/parcours/${p.slug}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border p-3 text-[13px] font-semibold hover:border-foreground/30 hover:bg-muted"
                  >
                    <Route className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{p.titre}</span>
                  </Link>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  Terminer toutes les étapes d'un parcours donne droit à un certificat.
                </p>
              </CorpsCarte>
            </Carte>
          ) : null}

          {f.aQuizFinal ? (
            <div className="flex gap-3 rounded-2xl border border-or/30 bg-or-soft/60 p-4">
              <Award className="h-5 w-5 shrink-0 text-[var(--or)]" aria-hidden />
              <p className="text-[13px] leading-relaxed">
                Pour valider : voir la vidéo en entier, réussir les quiz, puis remplir l'enquête de satisfaction.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function nbMessages(fil: { reponses: unknown[] }[]): number {
  return fil.reduce((s, c) => s + 1 + c.reponses.length, 0);
}
