import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  ChevronRight,
  Clock,
  Flame,
  Hexagon,
  Map as MapIcon,
  PlayCircle,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { CarteFormation } from "@/components/catalogue/carte-formation";
import { BadgeVisuel } from "@/components/gamification/badge-visuel";
import { BarreProgression } from "@/components/ui/barre-progression";
import { LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { Stat } from "@/components/ui/stat";
import { cn, pluriel } from "@/lib/utils";
import { donneesAccueil } from "@/server/requetes/accueil";
import { exigerSession } from "@/server/session";
import { NOTE_MAX } from "@/services/radar";
import { formaterDuree } from "@/services/visionnage";

export const metadata = { title: "Accueil" };

export default async function Accueil() {
  const u = await exigerSession();
  const d = await donneesAccueil(u.id);

  const debutant = d.formationsTerminees === 0 && d.aReprendre.length === 0;

  return (
    <div>
      <EntetePage
        titre={`Bonjour ${d.prenom}`}
        description={
          debutant
            ? "Deux minutes d'auto-évaluation, puis une première formation : c'est comme ça que votre profil démarre."
            : d.actions.length
              ? "Voici ce qui vous attend aujourd'hui."
              : "Rien ne vous attend : à vous de choisir la suite."
        }
      />

      {/* Ce qui attend le membre passe avant tout le reste. */}
      {d.actions.length ? (
        <Carte className="mb-6">
          <EnteteCarte titre="À faire" description="Chaque élément ici débloque quelque chose de concret." />
          <CorpsCarte className="pt-0">
            <ul className="divide-y divide-border">
              {d.actions.map((a) => (
                <li key={a.cle}>
                  <Link
                    href={a.lien}
                    className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-muted/60"
                  >
                    {/* Empilé sur mobile : au-dessus de 640 px la pastille tient
                        à côté du texte, en dessous elle le comprimerait. */}
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <Pastille ton={a.ton}>{a.libelle}</Pastille>
                      <span className="text-[13px] leading-relaxed">{a.detail}</span>
                    </span>
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
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Reprendre */}
          {d.aReprendre.length ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[17px] font-bold tracking-tight">Reprendre où vous en étiez</h2>
                <Link href="/catalogue?etat=encours" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                  Tout voir
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
                {d.aReprendre.map((f) => (
                  <CarteFormation key={f.id} f={f} />
                ))}
              </div>
            </section>
          ) : debutant ? (
            <Carte>
              <CorpsCarte className="pt-6">
                <EtatVide
                  icone={<PlayCircle className="h-6 w-6" />}
                  titre="Votre première formation vous attend"
                  description="Le catalogue est classé par domaine. Commencez par ce qui sert votre poste : la progression se mesure sur les compétences, pas sur le nombre de vidéos."
                  action={
                    <LienBouton href="/catalogue">
                      Parcourir le catalogue
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </LienBouton>
                  }
                />
              </CorpsCarte>
            </Carte>
          ) : (
            <Carte>
              <CorpsCarte className="pt-6">
                <EtatVide
                  icone={<PlayCircle className="h-6 w-6" />}
                  titre="Aucune formation en cours"
                  description="Vous avez terminé tout ce que vous avez commencé. Le catalogue en a d'autres."
                  action={<LienBouton href="/catalogue">Parcourir le catalogue</LienBouton>}
                />
              </CorpsCarte>
            </Carte>
          )}

          {/* Parcours */}
          {d.parcoursEnCours.length ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[17px] font-bold tracking-tight">Vos parcours certifiants</h2>
                <Link href="/parcours" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                  Tout voir
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
                {d.parcoursEnCours.map((p) => (
                  <Link
                    key={p.id}
                    href={`/parcours/${p.slug}`}
                    className="group rounded-2xl border border-border bg-card p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/20"
                  >
                    <div className="flex items-center gap-2">
                      <MapIcon className="h-4 w-4 shrink-0" style={{ color: p.domaine.couleur }} aria-hidden />
                      <span className="text-xs font-semibold text-muted-foreground">{p.domaine.nom}</span>
                    </div>
                    <p className="mt-2 text-[15px] font-bold leading-snug">{p.titre}</p>
                    <div className="mt-3.5 flex items-center gap-3">
                      <BarreProgression valeur={p.nbEtapes ? p.etapesTerminees / p.nbEtapes : 0} />
                      <span className="shrink-0 text-[13px] font-bold tabular-nums">
                        {p.etapesTerminees}/{p.nbEtapes}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formaterDuree(p.dureeSec)} au total · certificat à la fin
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Recommandations */}
          {d.recommandations.length ? (
            <Carte>
              <EnteteCarte
                titre="Conseillé pour vous"
                description="Choisi sur vos compétences les plus faibles, pas sur la popularité."
              />
              <CorpsCarte className="pt-0">
                <ul className="divide-y divide-border">
                  {d.recommandations.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/formations/${r.slug}`}
                        className="group -mx-2 flex flex-wrap items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-muted/60"
                      >
                        <span aria-hidden className="h-9 w-1 shrink-0 rounded-full" style={{ background: r.couleur }} />
                        <span className="min-w-40 flex-1">
                          <span className="block text-[14px] font-semibold leading-snug">{r.titre}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {r.domaine} · {formaterDuree(r.dureeSec)}
                            {r.cible.length ? ` · pour ${r.cible.slice(0, 2).join(", ")}` : ""}
                          </span>
                        </span>
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
          ) : null}
        </div>

        {/* Colonne de droite : où j'en suis */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Carte>
            <CorpsCarte className="pt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-muted-foreground">Niveau {d.niveau.niveau}</p>
                  <p className="text-[17px] font-bold leading-tight">{d.niveau.titre}</p>
                </div>
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="mt-3">
                <BarreProgression valeur={d.niveau.avancement} />
                <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                  {d.xp.toLocaleString("fr-FR")} XP
                  {d.niveau.xpSuivant > d.xp ? ` · ${(d.niveau.xpSuivant - d.xp).toLocaleString("fr-FR")} avant le niveau ${d.niveau.niveau + 1}` : ""}
                </p>
              </div>
            </CorpsCarte>
          </Carte>

          <div className="grid grid-cols-2 gap-4">
            <Stat
              libelle="Série"
              valeur={d.serie}
              indice={d.serie > 0 ? pluriel(d.serie, "jour d'affilée", "jours d'affilée") : "aucune en cours"}
              icone={<Flame className="h-4 w-4" />}
              accent={d.serie >= 3 ? "var(--primary)" : undefined}
            />
            <Stat
              libelle="Cette semaine"
              valeur={`${d.minutesSemaine} min`}
              indice="d'activité"
              icone={<Clock className="h-4 w-4" />}
            />
            <Stat libelle="Formations" valeur={d.formationsTerminees} indice="terminées" />
            <Stat libelle="Certificats" valeur={d.certificats} icone={<ScrollText className="h-4 w-4" />} />
          </div>

          <Carte>
            <EnteteCarte titre="Mes compétences" />
            <CorpsCarte className="pt-0">
              {d.noteGenerale > 0 ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-[34px] font-black leading-none tabular-nums">{d.noteGenerale}</span>
                    <span className="pb-1 text-[13px] font-semibold text-muted-foreground">/ {NOTE_MAX}</span>
                    <span className="ml-auto pb-1 text-[13px] font-semibold">{d.palier.libelle}</span>
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    {d.domainesMesures} des {d.domainesTotal} domaines mesurés.
                  </p>
                  <LienBouton href="/competences" variante="contour" className="mt-3 w-full">
                    <Hexagon className="h-4 w-4" aria-hidden />
                    Voir mon radar
                  </LienBouton>
                </>
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Votre profil démarre à la première auto-évaluation : une vingtaine de questions, dix secondes
                    chacune.
                  </p>
                  <LienBouton href="/competences" className="mt-3 w-full">
                    Commencer
                  </LienBouton>
                </>
              )}
            </CorpsCarte>
          </Carte>

          {d.badgesRecents.length ? (
            <Carte>
              <EnteteCarte titre="Derniers badges" action={<Link href="/badges" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">Tous</Link>} />
              <CorpsCarte className="pt-0">
                <ul className={cn("grid gap-3", d.badgesRecents.length > 2 ? "grid-cols-4" : "grid-cols-2")}>
                  {d.badgesRecents.map((b) => (
                    <li key={b.id} className="flex flex-col items-center gap-1 text-center">
                      <BadgeVisuel
                        apparence={{
                          forme: b.forme,
                          matiere: b.matiere,
                          rarete: b.rarete,
                          effet: b.effet,
                          couleur: b.couleur,
                          icone: b.icone,
                        }}
                        taille={52}
                        anime={false}
                      />
                      <span className="text-[11px] font-semibold leading-tight">{b.nom}</span>
                    </li>
                  ))}
                </ul>
              </CorpsCarte>
            </Carte>
          ) : (
            <Carte>
              <EnteteCarte titre="Badges" />
              <CorpsCarte className="pt-0">
                <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
                  <Award className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Le premier badge tombe dès votre première formation terminée.
                </p>
              </CorpsCarte>
            </Carte>
          )}

          {d.evaluationsFroid.length > 2 ? (
            <Link
              href="/evaluations"
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-[13px] font-semibold transition-colors hover:bg-muted/60"
            >
              <CalendarCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              {pluriel(d.evaluationsFroid.length, "évaluation à froid", "évaluations à froid")} en attente
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
