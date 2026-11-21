import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, Hourglass, ListChecks, TriangleAlert, Users } from "lucide-react";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { ActionsFormationExterne } from "@/components/rh/actions-formation-externe";
import { GrilleEvaluation } from "@/components/rh/grille-evaluation";
import { Avatar } from "@/components/ui/avatar";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { Stat } from "@/components/ui/stat";
import { cn, formaterDate } from "@/lib/utils";
import { detailFormationExterne, resoudreJe } from "@/server/requetes/rh";
import { exigerPermissionPage } from "@/server/session";
import { formaterNombre } from "@/services/rapports";
import { can } from "@/services/rbac";
import {
  avecJe,
  evaluationsSaisies,
  LIBELLES_ETAT_AUTO_EVAL,
  TON_ETAT_AUTO_EVAL,
  type EtatAutoEval,
} from "@/services/rh";

export const metadata = { title: "Formation externe" };

function EtatAutoEvalPastille({ etat, demandeLe }: { etat: EtatAutoEval; demandeLe: Date | null }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <Pastille ton={TON_ETAT_AUTO_EVAL[etat]}>{LIBELLES_ETAT_AUTO_EVAL[etat]}</Pastille>
      {etat === "DEMANDEE" && demandeLe ? (
        <span className="text-[11px] text-muted-foreground">le {formaterDate(demandeLe, { day: "numeric", month: "short" })}</span>
      ) : null}
    </span>
  );
}

const signe = (v: number) => `${v > 0 ? "+" : ""}${formaterNombre(v, 1)}`;

export default async function PageFormationExterne({ params, searchParams }: PageProps<"/mon-organisation/formations-externes/[id]">) {
  const u = await exigerPermissionPage("rh", "lire");
  const { id } = await params;
  const sp = await searchParams;
  const jeParam = typeof sp.je === "string" ? sp.je : null;
  const je = await resoudreJe(u, jeParam);
  if (!je) notFound();
  const d = await detailFormationExterne(je.id, id);
  // Une formation d'une autre organisation n'existe pas pour ce RH.
  if (!d) notFound();

  const lienJe = u.roles.includes("SUPER_ADMIN") ? je.id : null;
  const peutEcrire = can(u.roles, "rh", "ecrire");
  const { formation: f, competences, participants, bilan } = d;
  const ouverte = f.statut === "OUVERTE";
  const ids = competences.map((c) => c.id);
  const n = participants.length;
  const initiales = participants.filter((p) => p.initiale === "TERMINEE").length;
  const finales = participants.filter((p) => p.finale === "TERMINEE").length;
  const completes = participants.filter((p) => evaluationsSaisies(p.evaluationFormateur, ids) === ids.length).length;

  return (
    <div>
      <EntetePage
        titre={f.titre}
        retour={{ href: avecJe("/mon-organisation?onglet=formations", lienJe), libelle: "Formations externes" }}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Pastille couleur={couleurLisible(f.couleur)}>{f.domaine}</Pastille>
            {ouverte ? <Pastille ton="alerte">Ouverte</Pastille> : <Pastille ton="succes">Clôturée</Pastille>}
            <span>{formaterDate(f.date)}</span>
            <span>· {formaterNombre(f.dureeHeures, 1)} h</span>
            <span>· animée par {f.formateurInterne}</span>
          </span>
        }
        actions={
          ouverte && peutEcrire ? (
            <ActionsFormationExterne
              formationExterneId={f.id}
              je={je.id}
              restantsInitiale={n - initiales}
              restantsFinale={n - finales}
              cloturePossible={bilan.possible}
              avertissements={bilan.avertissements}
            />
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <Stat libelle="Participants" valeur={n} icone={<Users size={16} aria-hidden />} indice={`${competences.length} compétence${competences.length > 1 ? "s" : ""} visée${competences.length > 1 ? "s" : ""}`} />
        <Stat libelle="Auto-éval. initiales" valeur={`${initiales}/${n}`} icone={<ListChecks size={16} aria-hidden />} indice="terminées avant la formation" />
        <Stat libelle="Auto-éval. finales" valeur={`${finales}/${n}`} icone={<ClipboardCheck size={16} aria-hidden />} indice="terminées après la formation" />
        <Stat libelle="Évaluations du formateur" valeur={`${completes}/${n}`} icone={<Hourglass size={16} aria-hidden />} indice="complètes sur toutes les compétences" />
      </div>

      {ouverte && bilan.avertissements.length ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div className="grid gap-1">
            {!bilan.possible ? (
              <p className="font-semibold">
                Clôture impossible pour l&apos;instant : aucune mesure. Saisissez l&apos;évaluation du formateur ou un score de test, ou
                attendez les auto-évaluations finales.
              </p>
            ) : null}
            {bilan.avertissements.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6">
        {f.description ? (
          <Carte>
            <EnteteCarte titre="Contenu" />
            <CorpsCarte>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </CorpsCarte>
          </Carte>
        ) : null}

        <Carte>
          <EnteteCarte
            titre="Participants"
            description="Les auto-évaluations se font depuis le compte de chaque membre ; envoyez la demande avec les boutons en haut de page."
          />
          <CorpsCarte>
            {!n ? (
              <EtatVide compact icone={<Users className="h-6 w-6" />} titre="Aucun participant" description="Cette formation n'a aucun participant enregistré." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[13px] text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-medium">Membre</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Auto-éval. initiale</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Auto-éval. finale</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Éval. formateur</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Test</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const saisies = evaluationsSaisies(p.evaluationFormateur, ids);
                      return (
                        <tr key={p.id} className="border-b border-border/60">
                          <td className="py-2 pr-3">
                            <Link href={`/membres/${p.utilisateurId}`} className="flex min-w-44 items-center gap-2.5 font-semibold hover:text-primary">
                              <Avatar nom={`${p.prenom} ${p.nom}`} photo={p.photoUrl} taille="sm" />
                              <span className="truncate">
                                {p.prenom} {p.nom}
                              </span>
                            </Link>
                          </td>
                          <td className="py-2 pr-3">
                            <EtatAutoEvalPastille etat={p.initiale} demandeLe={p.demandeInitialeLe} />
                          </td>
                          <td className="py-2 pr-3">
                            <EtatAutoEvalPastille etat={p.finale} demandeLe={p.demandeFinaleLe} />
                          </td>
                          <td className="chiffres py-2 pr-3 text-right">
                            <span className={cn(saisies === ids.length ? "text-success" : saisies ? "text-warning" : "text-muted-foreground")}>
                              {saisies}/{ids.length}
                            </span>
                          </td>
                          <td className="chiffres py-2 pr-3 text-right">{p.scoreTest === null ? "—" : `${formaterNombre(p.scoreTest, 1)}/100`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CorpsCarte>
        </Carte>

        {ouverte ? (
          peutEcrire && n && competences.length ? (
            <section aria-labelledby="titre-grille" id="grille">
              <h2 id="titre-grille" className="mb-1 text-[17px] font-extrabold tracking-tight">
                Évaluation du formateur
              </h2>
              <p className="mb-4 max-w-3xl text-[13px] text-muted-foreground">
                Pour chaque participant, la note que le formateur interne donne à sa maîtrise de chaque compétence, de 1 à 10, après
                la formation. Cliquez de nouveau sur une note pour l&apos;effacer. Le score du test interne est facultatif.
              </p>
              <GrilleEvaluation
                formationExterneId={f.id}
                je={je.id}
                competences={competences.map((c) => ({ id: c.id, nom: c.nom }))}
                participants={participants.map((p) => ({
                  id: p.id,
                  prenom: p.prenom,
                  nom: p.nom,
                  photoUrl: p.photoUrl,
                  poste: p.poste,
                  evaluationFormateur: p.evaluationFormateur,
                  scoreTest: p.scoreTest,
                }))}
              />
            </section>
          ) : null
        ) : (
          <Carte>
            <EnteteCarte
              titre="Résultats"
              description="Calculés à la clôture avec la méthode standardisée. Une part du gain reste en attente jusqu'à l'évaluation à froid : elle n'est acquise que si le membre déclare avoir mis en pratique."
            />
            <CorpsCarte className="grid gap-4 lg:grid-cols-2">
              {participants.map((p) => (
                <div key={p.id} className="rounded-xl border border-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Avatar nom={`${p.prenom} ${p.nom}`} photo={p.photoUrl} taille="xs" />
                    {p.prenom} {p.nom}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th scope="col" className="pb-1 pr-2 font-medium">Compétence</th>
                          <th scope="col" className="pb-1 pr-2 text-right font-medium">Avant → après</th>
                          <th scope="col" className="pb-1 pr-2 text-right font-medium">Gain</th>
                          <th scope="col" className="pb-1 text-right font-medium">En attente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competences.map((c) => {
                          const g = p.resultats.find((r) => r.competenceId === c.id)?.gain ?? null;
                          return (
                            <tr key={c.id} className="border-t border-border/60">
                              <td className="py-1.5 pr-2">{c.nom}</td>
                              {g ? (
                                <>
                                  <td className="chiffres whitespace-nowrap py-1.5 pr-2 text-right">
                                    {formaterNombre(g.niveauAvant, 0)} → <strong>{formaterNombre(g.niveauApres, 0)}</strong>
                                  </td>
                                  <td
                                    className={cn(
                                      "chiffres py-1.5 pr-2 text-right font-semibold",
                                      g.gainApplique > 0 ? "text-success" : g.gainApplique < 0 ? "text-danger" : "text-muted-foreground"
                                    )}
                                  >
                                    {signe(g.gainApplique)}
                                  </td>
                                  <td className="chiffres py-1.5 text-right text-muted-foreground" title={g.consolideLe ? `Évaluation à froid le ${formaterDate(g.consolideLe)}` : "En attente de l'évaluation à froid"}>
                                    {g.gainEnAttente > 0 ? (g.consolideLe ? "traité" : signe(g.gainEnAttente)) : "—"}
                                  </td>
                                </>
                              ) : (
                                <td colSpan={3} className="py-1.5 text-right text-xs text-muted-foreground">
                                  Non calculé
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {!n ? <p className="text-sm text-muted-foreground">Aucun participant.</p> : null}
            </CorpsCarte>
          </Carte>
        )}

        <Carte>
          <EnteteCarte titre="Compétences visées" description="Issues du référentiel de votre organisation au moment de la création." />
          <CorpsCarte>
            <ul className="flex flex-wrap gap-2">
              {competences.map((c) => (
                <li key={c.id}>
                  <Pastille ton="contour">{c.nom}</Pastille>
                </li>
              ))}
            </ul>
          </CorpsCarte>
        </Carte>
      </div>
    </div>
  );
}
