import { notFound } from "next/navigation";
import { ActionsCompte, FormulaireCompte } from "@/components/admin/fiche-compte";
import { PastillesRoles } from "@/components/admin/roles";
import { Avatar } from "@/components/ui/avatar";
import { BarreProgression } from "@/components/ui/barre-progression";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Pastille } from "@/components/ui/pastille";
import { depuis, formaterDate } from "@/lib/utils";
import { ficheUtilisateur } from "@/server/requetes/admin-utilisateurs";
import { exigerPermissionPage } from "@/server/session";
import { can, libelleRole } from "@/services/rbac";
import { LIBELLES_RATTACHEMENT } from "@/services/rapports";

export const metadata = { title: "Fiche du compte" };

const LIBELLES_ACTIONS: Record<string, string> = {
  INSCRIPTION: "Inscription",
  COMPTE_MODIFIE: "Rôles ou rattachement modifiés",
  COMPTE_DESACTIVE: "Compte désactivé",
  COMPTE_REACTIVE: "Compte réactivé",
  MOT_DE_PASSE_REINITIALISE: "Mot de passe réinitialisé",
};

function resumeChangement(details: Record<string, unknown>, jes: Map<string, string>): string | null {
  const avant = details.avant as { roles?: string[]; jeId?: string | null; rattachement?: string } | undefined;
  const apres = details.apres as { roles?: string[]; jeId?: string | null; rattachement?: string } | undefined;
  if (!avant || !apres) return null;
  const morceaux: string[] = [];
  const ajoutes = (apres.roles ?? []).filter((r) => !(avant.roles ?? []).includes(r));
  const retires = (avant.roles ?? []).filter((r) => !(apres.roles ?? []).includes(r));
  if (ajoutes.length) morceaux.push(`+ ${ajoutes.map(libelleRole).join(", ")}`);
  if (retires.length) morceaux.push(`− ${retires.map(libelleRole).join(", ")}`);
  if (avant.jeId !== apres.jeId) morceaux.push(`Organisation : ${apres.jeId ? (jes.get(apres.jeId) ?? "?") : "aucune"}`);
  if (avant.rattachement !== apres.rattachement && apres.rattachement)
    morceaux.push(`rattachement ${LIBELLES_RATTACHEMENT[apres.rattachement]?.toLowerCase() ?? apres.rattachement}`);
  return morceaux.length ? morceaux.join(" · ") : "Aucun changement effectif";
}

export default async function PageFicheCompte({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const u = await exigerPermissionPage("utilisateurs", "lire");
  const { id } = await params;
  const fiche = await ficheUtilisateur(id);
  if (!fiche) notFound();
  const { utilisateur: c, jes, historique } = fiche;
  const peutEcrire = can(u.roles, "utilisateurs", "ecrire") && u.roles.includes("SUPER_ADMIN");
  const estSoiMeme = u.id === c.id;
  const nomsJes = new Map(jes.map((j) => [j.id, j.nom]));
  const compte = { id: c.id, prenom: c.prenom, nom: c.nom, roles: c.roles, jeId: c.jeId, rattachement: c.rattachement, actif: c.actif };

  return (
    <div>
      <EntetePage
        retour={{ href: "/admin/utilisateurs", libelle: "Membres et rôles" }}
        titre={`${c.prenom} ${c.nom}`}
        description={c.email}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid min-w-0 gap-6 self-start">
          <FormulaireCompte compte={compte} jes={jes} peutEcrire={peutEcrire} estSoiMeme={estSoiMeme} acteurSuperAdmin={u.roles.includes("SUPER_ADMIN")} />

          <Carte>
            <EnteteCarte titre="Historique du compte" description="Chaque changement est journalisé avec son auteur." />
            <CorpsCarte>
              {historique.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Aucun changement enregistré pour ce compte. Les modifications de rôles, d'organisation et d&apos;accès s&apos;afficheront ici.
                </p>
              ) : (
                <ol className="grid gap-0">
                  {historique.map((h) => (
                    <li key={h.id} className="flex gap-3 border-b border-border/60 py-3 last:border-0">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{LIBELLES_ACTIONS[h.action] ?? h.action}</p>
                        {resumeChangement(h.details, nomsJes) ? (
                          <p className="text-[13px] text-muted-foreground">{resumeChangement(h.details, nomsJes)}</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {h.acteurPrenom ? `${h.acteurPrenom} ${h.acteurNom}` : "Système"} · {formaterDate(h.creeLe, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CorpsCarte>
          </Carte>
        </div>

        <div className="grid gap-6 self-start">
          <Carte>
            <CorpsCarte className="pt-5">
              <div className="flex items-center gap-4">
                <Avatar nom={`${c.prenom} ${c.nom}`} photo={c.photoUrl} taille="lg" />
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    {c.prenom} {c.nom}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">{c.poste ?? c.departement ?? "Poste non renseigné"}</p>
                  <div className="mt-1.5">
                    <PastillesRoles roles={c.roles} />
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                  <span className="font-bold">
                    Niveau {c.niveau.niveau} · {c.niveau.titre}
                  </span>
                  <span className="chiffres text-muted-foreground">{c.xp.toLocaleString("fr-FR")} XP</span>
                </div>
                <BarreProgression valeur={c.niveau.avancement} couleur="var(--or)" libelle="Avancement dans le niveau" />
              </div>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
                <dt className="text-muted-foreground">État</dt>
                <dd>{c.actif ? <Pastille ton="succes">Actif</Pastille> : <Pastille ton="danger">Désactivé</Pastille>}</dd>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>{c.emailVerifieLe ? "Vérifié" : <span className="text-warning">Non vérifié</span>}</dd>
                <dt className="text-muted-foreground">Connexion</dt>
                <dd>{[c.aMotDePasse ? "mot de passe" : null, c.googleId ? "Google" : null].filter(Boolean).join(" et ") || "aucune méthode"}</dd>
                <dt className="text-muted-foreground">Inscrit</dt>
                <dd>{formaterDate(c.creeLe)}</dd>
                <dt className="text-muted-foreground">Dernier accès</dt>
                <dd>{c.dernierAcces ? depuis(c.dernierAcces) : "Jamais"}</dd>
              </dl>
            </CorpsCarte>
          </Carte>
          <ActionsCompte compte={compte} peutEcrire={peutEcrire} estSoiMeme={estSoiMeme} />
        </div>
      </div>
    </div>
  );
}
