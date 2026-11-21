"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, Power } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { CaseACocher, Groupe, Selecteur } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { Dialogue } from "@/components/ui/dialogue";
import type { Resultat } from "@/lib/resultat";
import { changerActivationCompte, enregistrerCompte, reinitialiserMotDePasse } from "@/server/actions/admin-utilisateurs";
import { ROLES } from "@/services/rbac";
import { LIBELLES_RATTACHEMENT } from "@/services/rapports";
import { lancerAction, useRetourAction } from "./retour-action";
import { ORDRE_ROLES } from "./roles";

type Compte = {
  id: string;
  prenom: string;
  nom: string;
  roles: string[];
  jeId: string | null;
  rattachement: string;
  actif: boolean;
};

export function FormulaireCompte({
  compte,
  jes,
  peutEcrire,
  estSoiMeme,
  acteurSuperAdmin,
}: {
  compte: Compte;
  jes: { id: string; nom: string; active: boolean }[];
  peutEcrire: boolean;
  estSoiMeme: boolean;
  acteurSuperAdmin: boolean;
}) {
  const [etat, action] = useActionState<Resultat, FormData>(enregistrerCompte, {});
  useRetourAction(etat);
  const e = etat.erreurs ?? {};
  const [jeId, setJeId] = useState(compte.jeId ?? "");

  return (
    <Carte>
      <EnteteCarte titre="Rôles et rattachement" description="Les droits suivent les rôles ; ils prennent effet à la prochaine navigation du membre (quelques minutes au plus)." />
      <CorpsCarte>
        <form action={action} noValidate>
          <input type="hidden" name="id" value={compte.id} />
          <fieldset disabled={!peutEcrire} className="grid gap-6 disabled:opacity-80">
            <div>
              <p className="mb-2 text-[13px] font-semibold">Rôles cumulables</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ORDRE_ROLES.map((r) => {
                  const coche = compte.roles.includes(r);
                  // MEMBRE est le socle de tout compte ; SUPER_ADMIN ne s'attribue que par un super admin
                  // et ne se retire pas soi-même.
                  const verrouSuperAdmin = r === "SUPER_ADMIN" && (!acteurSuperAdmin || (estSoiMeme && coche));
                  const verrou = r === "MEMBRE" || verrouSuperAdmin;
                  return (
                    <div key={r} className="rounded-xl border border-border p-3">
                      <CaseACocher
                        name="roles"
                        value={r}
                        defaultChecked={r === "MEMBRE" || coche}
                        disabled={verrou}
                        label={ROLES[r].libelle}
                        description={
                          r === "MEMBRE"
                            ? "Toujours présent : c'est le socle de tout compte."
                            : verrouSuperAdmin && estSoiMeme
                              ? "Vous ne pouvez pas retirer votre propre rôle de super admin."
                              : verrouSuperAdmin
                                ? "Seul un super admin peut attribuer ce rôle."
                                : ROLES[r].description
                        }
                      />
                      {verrou && coche && r !== "MEMBRE" ? <input type="hidden" name="roles" value={r} /> : null}
                    </div>
                  );
                })}
              </div>
              {e.roles ? (
                <p role="alert" className="mt-2 text-xs font-medium text-danger">
                  {e.roles}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Groupe id="jeId" label="Organisation" erreur={e.jeId} aide="Un responsable RH ne gère que son organisation.">
                <Selecteur id="jeId" name="jeId" value={jeId} onChange={(ev) => setJeId(ev.target.value)} aria-invalid={!!e.jeId}>
                  <option value="">Aucune organisation</option>
                  {jes.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nom}
                      {j.active ? "" : " (désactivée)"}
                    </option>
                  ))}
                </Selecteur>
              </Groupe>
              <Groupe
                id="rattachement"
                label="Rattachement"
                aide={jeId ? "Validé : le membre apparaît dans l'annuaire de son organisation." : "Choisissez d'abord une organisation."}
              >
                <Selecteur id="rattachement" name="rattachement" defaultValue={compte.rattachement} disabled={!jeId}>
                  {Object.entries(LIBELLES_RATTACHEMENT).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Selecteur>
                {!jeId ? <input type="hidden" name="rattachement" value="EN_ATTENTE" /> : null}
              </Groupe>
            </div>

            {peutEcrire ? (
              <div className="flex justify-end">
                <BoutonSoumission enCours="Enregistrement…">Enregistrer le compte</BoutonSoumission>
              </div>
            ) : (
              <p className="rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
                Consultation seule : seul le super admin modifie les rôles et les rattachements.
              </p>
            )}
          </fieldset>
        </form>
      </CorpsCarte>
    </Carte>
  );
}

export function ActionsCompte({
  compte,
  peutEcrire,
  estSoiMeme,
}: {
  compte: Compte;
  peutEcrire: boolean;
  estSoiMeme: boolean;
}) {
  const [motDePasse, setMotDePasse] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const nom = `${compte.prenom} ${compte.nom}`;

  if (!peutEcrire) return null;

  return (
    <Carte>
      <EnteteCarte titre="Accès au compte" description="Rien ne se supprime : un compte désactivé garde son historique et ses certificats." />
      <CorpsCarte className="grid gap-3">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Mot de passe</p>
            <p className="text-xs text-muted-foreground">Génère un mot de passe temporaire, affiché une seule fois.</p>
          </div>
          <BoutonConfirme
            variante="contour"
            taille="sm"
            titre="Réinitialiser le mot de passe"
            libelleConfirmation="Réinitialiser"
            message={`L'ancien mot de passe de ${nom} cessera de fonctionner immédiatement. Le nouveau ne s'affichera qu'une fois : transmettez-le par un canal sûr.`}
            champs={{ id: compte.id }}
            action={async (fd) => {
              const r = await lancerAction(() => reinitialiserMotDePasse(fd));
              if (r.ok && r.donnees) {
                setCopie(false);
                setMotDePasse(r.donnees.motDePasse);
              }
            }}
          >
            <KeyRound size={14} /> Réinitialiser
          </BoutonConfirme>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{compte.actif ? "Compte actif" : "Compte désactivé"}</p>
            <p className="text-xs text-muted-foreground">
              {estSoiMeme
                ? "Vous ne pouvez pas désactiver votre propre compte."
                : compte.actif
                  ? "Le membre ne pourra plus se connecter."
                  : "Le membre pourra de nouveau se connecter."}
            </p>
          </div>
          {estSoiMeme ? null : (
            <BoutonConfirme
              variante={compte.actif ? "danger" : "succes"}
              taille="sm"
              titre={compte.actif ? "Désactiver le compte" : "Réactiver le compte"}
              libelleConfirmation={compte.actif ? "Désactiver" : "Réactiver"}
              message={
                compte.actif
                  ? `${nom} sera déconnecté dans les minutes qui viennent et ne pourra plus se connecter. Ses données restent intactes et vous pourrez réactiver le compte.`
                  : `${nom} pourra de nouveau se connecter avec ses identifiants.`
              }
              champs={{ id: compte.id, actif: compte.actif ? "false" : "true" }}
              action={async (fd) => {
                await lancerAction(() => changerActivationCompte(fd));
              }}
            >
              <Power size={14} /> {compte.actif ? "Désactiver" : "Réactiver"}
            </BoutonConfirme>
          )}
        </div>
      </CorpsCarte>

      <Dialogue
        ouvert={motDePasse !== null}
        onFermer={() => setMotDePasse(null)}
        titre="Mot de passe temporaire"
        description={`À transmettre à ${nom}. Il ne sera plus jamais affiché.`}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
          <code className="chiffres flex-1 select-all text-lg font-bold tracking-wider">{motDePasse}</code>
          <Bouton
            variante="contour"
            taille="sm"
            onClick={async () => {
              if (!motDePasse) return;
              try {
                await navigator.clipboard.writeText(motDePasse);
                setCopie(true);
              } catch {
                setCopie(false);
              }
            }}
          >
            {copie ? <Check size={14} /> : <Copy size={14} />} {copie ? "Copié" : "Copier"}
          </Bouton>
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Conseillez au membre de le changer depuis son profil dès sa prochaine connexion.
        </p>
        <div className="mt-6 flex justify-end">
          <Bouton onClick={() => setMotDePasse(null)}>J&apos;ai transmis le mot de passe</Bouton>
        </div>
      </Dialogue>
    </Carte>
  );
}
