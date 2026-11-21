"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { CaseACocher, Champ, Groupe, ZoneTexte } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { BarreProgression } from "@/components/ui/barre-progression";
import type { Resultat } from "@/lib/resultat";
import { ajouterEtapeHistorique, enregistrerMonProfil, supprimerEtapeHistorique } from "@/server/actions/profils";
import type { MonProfil } from "@/server/requetes/profils";
import { lancerAction, useRetourAction } from "@/components/admin/retour-action";

/**
 * Mon profil.
 *
 * Deux réglages de visibilité, écrits comme ce qu'ils font et non comme des
 * options : « figurer dans l'annuaire » et « masquer mes statistiques ». Un
 * membre doit pouvoir rester discret sans quitter la plateforme.
 */
export function FormulaireProfil({ profil }: { profil: MonProfil }) {
  const [etat, envoyer] = useActionState<Resultat, FormData>(enregistrerMonProfil, {});
  useRetourAction(etat);

  const [photoUrl, setPhotoUrl] = React.useState(profil.photoUrl ?? "");
  const [prenom, setPrenom] = React.useState(profil.prenom);
  const [nom, setNom] = React.useState(profil.nom);
  const [poste, setPoste] = React.useState(profil.poste ?? "");
  const [departement, setDepartement] = React.useState(profil.departement ?? "");
  const [bio, setBio] = React.useState(profil.bio ?? "");
  const [linkedin, setLinkedin] = React.useState(profil.linkedin ?? "");
  const [whatsapp, setWhatsapp] = React.useState(profil.whatsapp ?? "");
  const [instagram, setInstagram] = React.useState(profil.reseaux.instagram ?? "");
  const [github, setGithub] = React.useState(profil.reseaux.github ?? "");
  const [site, setSite] = React.useState(profil.reseaux.site ?? "");
  const [visibleAnnuaire, setVisibleAnnuaire] = React.useState(profil.visibleAnnuaire);
  const [masquerStats, setMasquerStats] = React.useState(profil.masquerStats);

  const formateur = profil.roles.includes("FORMATEUR");
  const pourcentage = Math.round(profil.completude.score * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <form action={envoyer} className="min-w-0 space-y-5">
        <Carte>
          <EnteteCarte titre="Identité" description="Ce que les autres membres voient de vous." />
          <CorpsCarte className="space-y-4 pt-0">
            <div className="flex items-center gap-4">
              <Avatar nom={`${prenom} ${nom}`} photo={photoUrl || null} taille="xl" />
              <Groupe
                id="photoUrl"
                label="Photo"
                aide="Lien d'une image en ligne (LinkedIn, Drive public…)."
                erreur={etat.erreurs?.photoUrl}
                className="min-w-0 flex-1"
              >
                <Champ
                  id="photoUrl"
                  name="photoUrl"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://…"
                  maxLength={300}
                />
              </Groupe>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Groupe id="prenom" label="Prénom" erreur={etat.erreurs?.prenom}>
                <Champ id="prenom" name="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={60} required />
              </Groupe>
              <Groupe id="nom" label="Nom" erreur={etat.erreurs?.nom}>
                <Champ id="nom" name="nom" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required />
              </Groupe>
              <Groupe id="poste" label="Poste" aide="Votre rôle dans votre organisation." erreur={etat.erreurs?.poste}>
                <Champ
                  id="poste"
                  name="poste"
                  value={poste}
                  onChange={(e) => setPoste(e.target.value)}
                  placeholder="Responsable trésorerie"
                  maxLength={80}
                />
              </Groupe>
              <Groupe id="departement" label="Département" erreur={etat.erreurs?.departement}>
                <Champ
                  id="departement"
                  name="departement"
                  value={departement}
                  onChange={(e) => setDepartement(e.target.value)}
                  placeholder="Administration et finances"
                  maxLength={80}
                />
              </Groupe>
            </div>

            <Groupe id="bio" label="Présentation" aide="Quelques lignes : ce que vous faites, ce qui vous intéresse." erreur={etat.erreurs?.bio}>
              <ZoneTexte id="bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} rows={4} />
            </Groupe>
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte
            titre="Liens"
            description="Il n'y a pas de messagerie interne : ce sont ces liens qui permettent de vous joindre."
          />
          <CorpsCarte className="grid gap-4 pt-0 sm:grid-cols-2">
            <Groupe id="linkedin" label="LinkedIn" erreur={etat.erreurs?.linkedin}>
              <Champ
                id="linkedin"
                name="linkedin"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="linkedin.com/in/…"
                maxLength={300}
              />
            </Groupe>
            <Groupe
              id="whatsapp"
              label="WhatsApp"
              aide={formateur ? "Affiché comme bouton sur votre profil formateur." : "Utilisé seulement si vous devenez formateur."}
              erreur={etat.erreurs?.whatsapp}
            >
              <Champ
                id="whatsapp"
                name="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                maxLength={25}
                inputMode="tel"
              />
            </Groupe>
            <Groupe id="instagram" label="Instagram" erreur={etat.erreurs?.instagram}>
              <Champ id="instagram" name="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={300} />
            </Groupe>
            <Groupe id="github" label="GitHub" erreur={etat.erreurs?.github}>
              <Champ id="github" name="github" value={github} onChange={(e) => setGithub(e.target.value)} maxLength={300} />
            </Groupe>
            <Groupe id="site" label="Site personnel" erreur={etat.erreurs?.site} className="sm:col-span-2">
              <Champ id="site" name="site" value={site} onChange={(e) => setSite(e.target.value)} maxLength={300} />
            </Groupe>
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre="Visibilité" description="Vous restez toujours visible de votre propre organisation." />
          <CorpsCarte className="space-y-1 pt-0">
            <CaseACocher
              name="visibleAnnuaire"
              checked={visibleAnnuaire}
              onChange={(e) => setVisibleAnnuaire(e.target.checked)}
              label="Figurer dans l'annuaire"
              description="Décoché, seuls les membres de votre organisation et les administrateurs voient votre profil."
            />
            <CaseACocher
              name="masquerStats"
              checked={masquerStats}
              onChange={(e) => setMasquerStats(e.target.checked)}
              label="Masquer mes statistiques"
              description="Niveau, XP, badges et certificats restent privés. Votre responsable RH les voit toujours."
            />
            {formateur ? (
              <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
                Votre profil formateur reste consultable quoi qu&apos;il arrive : c&apos;est la vitrine des formations
                que vous animez.
              </p>
            ) : null}
          </CorpsCarte>
        </Carte>

        <BoutonSoumission enCours="Enregistrement…">Enregistrer le profil</BoutonSoumission>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Carte>
          <EnteteCarte titre="Complétude" />
          <CorpsCarte className="space-y-3 pt-0">
            <div className="flex items-center gap-3">
              <BarreProgression valeur={profil.completude.score} />
              <span className="shrink-0 text-[15px] font-bold tabular-nums">{pourcentage} %</span>
            </div>
            {profil.completude.manquants.length ? (
              <>
                {/* Sans cette phrase, la liste ressemble à une étiquette isolée
                    (« Photo ») au lieu d'une consigne. */}
                <p className="text-[13px] font-semibold">Il reste à remplir :</p>
                <ul className="space-y-1.5">
                  {profil.completude.manquants.map((m) => (
                    <li key={m} className="text-[13px] text-muted-foreground">
                      {m}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="flex items-start gap-2 text-[13px] text-success">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Profil complet.
              </p>
            )}
          </CorpsCarte>
        </Carte>

        <Carte>
          <EnteteCarte titre="Mon compte" />
          <CorpsCarte className="space-y-2 pt-0 text-[13px]">
            <p className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Courriel</span>
              <span className="truncate font-medium">{profil.email}</span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Organisation</span>
              <span className="font-medium">{profil.je ? (profil.je.sigle ?? profil.je.nom) : "Non rattaché"}</span>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Le rattachement et les rôles se changent côté administration.
            </p>
          </CorpsCarte>
        </Carte>

        <FriseHistorique historique={profil.historique} />
      </aside>
    </div>
  );
}

function FriseHistorique({ historique }: { historique: MonProfil["historique"] }) {
  const [etat, envoyer] = useActionState<Resultat, FormData>(ajouterEtapeHistorique, {});
  const [ouvert, setOuvert] = React.useState(false);
  useRetourAction(etat, { onSucces: () => setOuvert(false) });

  return (
    <Carte>
      <EnteteCarte
        titre="Parcours associatif"
        description="Vos mandats et postes. C'est ce qui donne du poids à un profil formateur."
      />
      <CorpsCarte className="space-y-3 pt-0">
        {historique.length ? (
          <ol className="space-y-2.5">
            {historique.map((h) => (
              <li key={h.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                  {h.annee}
                  {h.anneeFin ? `–${String(h.anneeFin).slice(-2)}` : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{h.poste}</span>
                  <span className="block text-xs text-muted-foreground">{h.organisation}</span>
                </span>
                <BoutonConfirme
                  action={async (fd) => {
                    await lancerAction(() => supprimerEtapeHistorique(fd));
                  }}
                  champs={{ id: h.id }}
                  variante="fantome"
                  taille="icone"
                  titre="Retirer cette étape ?"
                  message={`« ${h.poste} » disparaîtra de votre frise.`}
                  libelleConfirmation="Retirer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Retirer {h.poste}</span>
                </BoutonConfirme>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-muted-foreground">Aucune étape pour l&apos;instant.</p>
        )}

        {ouvert ? (
          <form action={envoyer} className="space-y-3 rounded-xl border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <Groupe id="annee" label="De" erreur={etat.erreurs?.annee}>
                <Champ id="annee" name="annee" type="number" min={2000} max={new Date().getFullYear() + 1} required className="h-10" />
              </Groupe>
              <Groupe id="anneeFin" label="À" aide="Vide si en cours." erreur={etat.erreurs?.anneeFin}>
                <Champ id="anneeFin" name="anneeFin" type="number" min={2000} max={new Date().getFullYear() + 7} className="h-10" />
              </Groupe>
            </div>
            <Groupe id="poste" label="Poste" erreur={etat.erreurs?.poste}>
              <Champ id="poste" name="poste" placeholder="Trésorier" maxLength={80} required className="h-10" />
            </Groupe>
            <Groupe id="organisation" label="Organisation" erreur={etat.erreurs?.organisation}>
              <Champ id="organisation" name="organisation" placeholder="Aurora" maxLength={100} required className="h-10" />
            </Groupe>
            <div className="flex gap-2">
              <BoutonSoumission taille="sm" enCours="Ajout…">
                Ajouter l&apos;étape
              </BoutonSoumission>
              <Bouton type="button" variante="fantome" taille="sm" onClick={() => setOuvert(false)}>
                Annuler
              </Bouton>
            </div>
          </form>
        ) : (
          <Bouton type="button" variante="contour" taille="sm" onClick={() => setOuvert(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Ajouter une étape
          </Bouton>
        )}
      </CorpsCarte>
    </Carte>
  );
}
