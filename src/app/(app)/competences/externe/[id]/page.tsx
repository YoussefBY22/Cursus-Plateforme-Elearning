import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Check, Clock, Hourglass, TrendingUp } from "lucide-react";
import { Icone } from "@/components/icones";
import { LienBouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { cn, formaterDate, pluriel } from "@/lib/utils";
import { participationExterne } from "@/server/requetes/competences";
import { exigerPermissionPage } from "@/server/session";
import { NOTE_MAX } from "@/services/radar";

export const metadata = { title: "Formation de mon organisation" };

/**
 * Formation organisée par l'organisation elle-même, vue par le participant.
 *
 * Tout l'enjeu de cet écran : une formation maison se mesure avec la même
 * méthode qu'une formation Cursus. L'auto-évaluation d'avant et celle
 * d'après sont les deux seules choses demandées au membre ; le reste (gain
 * appliqué, part en attente) est calculé à la clôture par le responsable RH.
 */
export default async function PageFormationExterne({ params }: PageProps<"/competences/externe/[id]">) {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const { id } = await params;
  const p = await participationExterne(u.id, id);
  if (!p) notFound();

  const { formation: f } = p;
  const ouverte = f.statut === "OUVERTE";
  const lienAuto = (contexte: "INITIALE" | "FINALE") =>
    `/competences/auto-evaluation/${f.domaine.code}?contexte=${contexte}&externe=${f.id}&retour=/competences/externe/${f.id}`;

  const prochaine = !p.initiale.faite ? "INITIALE" : !p.finale.faite ? "FINALE" : null;

  return (
    <div>
      <EntetePage
        titre={f.titre}
        description={`Formation organisée par ${f.je}${f.formateurInterne ? `, animée par ${f.formateurInterne}` : ""}.`}
        retour={{ href: "/competences", libelle: "Mes compétences" }}
        actions={
          ouverte && prochaine ? (
            <LienBouton href={lienAuto(prochaine)} taille="lg">
              {prochaine === "INITIALE" ? "Me situer avant la formation" : "Me situer après la formation"}
            </LienBouton>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Carte>
            <EnteteCarte
              titre="Les deux mesures"
              description="Avant, puis après. L'écart entre les deux est ce qui rend cette formation comparable à toutes les autres."
            />
            <CorpsCarte className="space-y-3">
              <Etape
                numero={1}
                titre="Auto-évaluation d'avant"
                faite={p.initiale.faite}
                le={p.initiale.le}
                couleur={f.domaine.couleur}
                description="À faire idéalement avant la formation. Sans ce point de départ, aucun gain ne peut être calculé."
                action={
                  ouverte && !p.initiale.faite ? (
                    <LienBouton href={lienAuto("INITIALE")} taille="sm">
                      Commencer
                    </LienBouton>
                  ) : undefined
                }
              />
              <Etape
                numero={2}
                titre="Auto-évaluation d'après"
                faite={p.finale.faite}
                le={p.finale.le}
                couleur={f.domaine.couleur}
                description={
                  p.initiale.faite
                    ? "À faire après la formation. Votre regard compte, mais il reste plafonné par les mesures objectives."
                    : "Disponible une fois la mesure d'avant enregistrée."
                }
                bloquee={!p.initiale.faite}
                action={
                  ouverte && p.initiale.faite && !p.finale.faite ? (
                    <LienBouton href={lienAuto("FINALE")} taille="sm">
                      Commencer
                    </LienBouton>
                  ) : undefined
                }
              />
            </CorpsCarte>
          </Carte>

          {p.gains.length ? (
            <Carte>
              <EnteteCarte
                titre="Ce que cette formation a changé"
                description="Calculé à la clôture, avec la méthode commune à toute la plateforme."
              />
              <CorpsCarte>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {p.gains.map((g) => (
                    <li key={g.competenceId} className="flex flex-wrap items-center gap-3 p-3.5">
                      <span className="min-w-0 flex-1 text-[13px] font-medium">{g.nom}</span>
                      <span className="flex items-center gap-2 text-[13px] tabular-nums text-muted-foreground">
                        {g.niveauAvant}
                        <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden />
                        <span className="text-[15px] font-bold text-foreground">{g.niveauApres}</span>
                        <span className="text-xs">/ {NOTE_MAX}</span>
                      </span>
                      {g.gainEnAttente > 0 ? (
                        <Pastille ton="neutre">{g.gainEnAttente} en attente du froid</Pastille>
                      ) : g.consolide ? (
                        <Pastille ton="succes">Confirmé</Pastille>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  Une part du gain reste provisoire jusqu&apos;à l&apos;évaluation à froid, un mois après : c&apos;est la
                  mise en pratique qui confirme l&apos;acquis.
                </p>
              </CorpsCarte>
            </Carte>
          ) : !ouverte ? (
            <Carte>
              <CorpsCarte className="pt-5">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Cette formation est clôturée et aucun gain n&apos;a été calculé pour vous : il manquait l&apos;une des
                  deux auto-évaluations. Votre responsable RH peut vous dire laquelle.
                </p>
              </CorpsCarte>
            </Carte>
          ) : p.initiale.faite && p.finale.faite ? (
            <Carte>
              <CorpsCarte className="flex items-center gap-3 pt-5">
                <Hourglass className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Vos deux mesures sont enregistrées. Le calcul se fera à la clôture de la formation par votre
                  responsable RH.
                </p>
              </CorpsCarte>
            </Carte>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Carte>
            <EnteteCarte titre="La formation" />
            <CorpsCarte className="space-y-3 pt-0 text-[13px]">
              <Ligne libelle="Domaine">
                <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: f.domaine.couleur }}>
                  <Icone nom={f.domaine.icone} className="h-3.5 w-3.5" />
                  {f.domaine.nom}
                </span>
              </Ligne>
              <Ligne libelle="Date">{formaterDate(f.date)}</Ligne>
              <Ligne libelle="Durée">{f.dureeHeures} h</Ligne>
              <Ligne libelle="Organisation">{f.je}</Ligne>
              <Ligne libelle="État">
                {ouverte ? <Pastille ton="primaire">Ouverte</Pastille> : <Pastille ton="neutre">Clôturée</Pastille>}
              </Ligne>
            </CorpsCarte>
          </Carte>

          <Carte>
            <EnteteCarte titre={pluriel(p.competences.length, "compétence visée", "compétences visées")} />
            <CorpsCarte className="flex flex-wrap gap-2 pt-0">
              {p.competences.map((c) => (
                <Pastille key={c.id} ton="contour">
                  {c.nom}
                </Pastille>
              ))}
            </CorpsCarte>
          </Carte>

          {f.description ? (
            <Carte>
              <EnteteCarte titre="Programme" />
              <CorpsCarte className="whitespace-pre-line pt-0 text-[13px] leading-relaxed text-muted-foreground">
                {f.description}
              </CorpsCarte>
            </Carte>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Etape({
  numero,
  titre,
  description,
  faite,
  le,
  couleur,
  bloquee = false,
  action,
}: {
  numero: number;
  titre: string;
  description: string;
  faite: boolean;
  le: Date | null;
  couleur: string;
  bloquee?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-4 rounded-xl border p-4",
        faite ? "border-success/30 bg-success-soft/40" : bloquee ? "border-border bg-muted/40" : "border-border"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums",
          faite ? "bg-success text-white" : bloquee ? "bg-muted text-muted-foreground" : "text-white"
        )}
        style={!faite && !bloquee ? { background: couleur } : undefined}
        aria-hidden
      >
        {faite ? <Check className="h-4 w-4" /> : numero}
      </span>
      <div className="min-w-48 flex-1">
        <p className="text-[13px] font-semibold">{titre}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        {faite && le ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            Faite le {formaterDate(le)}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{libelle}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
