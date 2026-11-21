"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowBigUp, Lightbulb, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Bouton } from "@/components/ui/bouton";
import { BoutonSoumission } from "@/components/ui/bouton-soumission";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { Champ, Groupe, Selecteur, ZoneTexte } from "@/components/ui/champ";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { Dialogue } from "@/components/ui/dialogue";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { lancerAction, useRetourAction } from "@/components/admin/retour-action";
import { depuis, pluriel } from "@/lib/utils";
import type { Resultat } from "@/lib/resultat";
import { arbitrerDemande, basculerVote, creerDemande, retirerDemande } from "@/server/actions/demandes";
import type { DemandeVue } from "@/server/requetes/demandes";

const VIDE: Resultat = { ok: false };

const STATUTS: Record<DemandeVue["statut"], { libelle: string; ton: "primaire" | "nuit" | "succes" | "neutre" }> = {
  OUVERTE: { libelle: "Ouverte", ton: "primaire" },
  PLANIFIEE: { libelle: "Retenue", ton: "nuit" },
  SATISFAITE: { libelle: "Formation en ligne", ton: "succes" },
  REFUSEE: { libelle: "Non retenue", ton: "neutre" },
};

/* ------------------------------------------------------------------ */

const VIDE_VOTE: Resultat<{ vote: boolean }> = { ok: false };

function BoutonVote({ demande }: { demande: DemandeVue }) {
  const [etat, action] = useActionState(
    async (_: Resultat<{ vote: boolean }>, fd: FormData) => basculerVote(fd),
    VIDE_VOTE
  );
  useRetourAction(etat);
  const actif = demande.vote;

  if (demande.statut !== "OUVERTE") {
    return (
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-muted/40 px-2 py-2">
        <ArrowBigUp size={18} className="text-muted-foreground" aria-hidden />
        <span className="text-sm font-bold">{demande.votes}</span>
      </div>
    );
  }

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="demandeId" value={demande.id} />
      <button
        type="submit"
        aria-pressed={actif}
        aria-label={actif ? "Retirer mon soutien" : "Soutenir cette demande"}
        className={`flex w-14 flex-col items-center rounded-xl border px-2 py-2 transition-colors ${
          actif
            ? "border-primary bg-primary-soft text-primary"
            : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
        }`}
      >
        <ArrowBigUp size={18} aria-hidden />
        <span className="text-sm font-bold">{demande.votes}</span>
      </button>
    </form>
  );
}

function Arbitrage({ demande }: { demande: DemandeVue }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action] = useActionState(async (_: Resultat, fd: FormData) => arbitrerDemande(fd), VIDE);
  useRetourAction(etat, { onSucces: () => setOuvert(false) });

  return (
    <>
      <Bouton variante="contour" taille="sm" onClick={() => setOuvert(true)}>
        Répondre
      </Bouton>
      <Dialogue
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre="Répondre à la demande"
        description={demande.titre}
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="demandeId" value={demande.id} />
          <Groupe id={`statut-${demande.id}`} label="Décision">
            <Selecteur id={`statut-${demande.id}`} name="statut" defaultValue="PLANIFIEE">
              <option value="PLANIFIEE">Retenue — la formation sera produite</option>
              <option value="SATISFAITE">Déjà couverte — une formation existe</option>
              <option value="REFUSEE">Non retenue</option>
            </Selecteur>
          </Groupe>
          <Groupe
            id={`reponse-${demande.id}`}
            label="Réponse"
            aide="Elle est envoyée à toutes les personnes qui ont soutenu la demande."
          >
            <ZoneTexte
              id={`reponse-${demande.id}`}
              name="reponse"
              rows={3}
              maxLength={1000}
              placeholder="Retenue pour le premier trimestre : Amira Trabelsi en prend la production."
            />
          </Groupe>
          <BoutonSoumission enCours="Envoi…">Envoyer la réponse</BoutonSoumission>
        </form>
      </Dialogue>
    </>
  );
}

function CarteDemande({ demande, peutArbitrer }: { demande: DemandeVue; peutArbitrer: boolean }) {
  const s = STATUTS[demande.statut];
  return (
    <li className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <BoutonVote demande={demande} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{demande.titre}</h3>
          <Pastille ton={s.ton}>{s.libelle}</Pastille>
          {demande.domaine ? <Pastille couleur={demande.domaine.couleur}>{demande.domaine.nom}</Pastille> : null}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{demande.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Avatar nom={demande.demandeur.nom} photo={demande.demandeur.photo} taille="xs" />
          <span>{demande.demandeur.nom}</span>
          {demande.je ? <span>· {demande.je}</span> : null}
          <span>· {depuis(demande.creeLe)}</span>
          {demande.jes > 1 ? (
            <span className="font-bold text-primary">· {pluriel(demande.jes, "organisation")} concernées</span>
          ) : null}
        </div>

        {demande.reponse ? (
          <p className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <span className="font-bold">Réponse de l'équipe pédagogique — </span>
            {demande.reponse}
            {demande.formation ? (
              <>
                {" "}
                <a className="font-bold text-primary underline" href={`/formations/${demande.formation.slug}`}>
                  Voir la formation
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {peutArbitrer && demande.statut === "OUVERTE" ? (
          <div className="mt-3">
            <Arbitrage demande={demande} />
          </div>
        ) : null}
        {demande.sienne ? (
          <div className="mt-3">
            <BoutonConfirme
              action={async (fd) => {
                await lancerAction(() => retirerDemande(fd));
              }}
              champs={{ demandeId: demande.id }}
              titre="Retirer cette demande ?"
              message="Elle disparaîtra du mur, avec les soutiens qu'elle a reçus."
              libelleConfirmation="Retirer la demande"
            >
              Retirer
            </BoutonConfirme>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */

export function MurDemandes({
  demandes,
  domaines,
  peutArbitrer,
}: {
  demandes: DemandeVue[];
  domaines: { id: string; nom: string }[];
  peutArbitrer: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, action] = useActionState(async (_: Resultat, fd: FormData) => creerDemande(fd), VIDE);
  useRetourAction(etat, {
    onSucces: () => {
      formulaire.current?.reset();
      setOuvert(false);
    },
  });

  const ouvertes = demandes.filter((d) => d.statut === "OUVERTE");
  const traitees = demandes.filter((d) => d.statut !== "OUVERTE");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Bouton variante="primaire" onClick={() => setOuvert(true)}>
          <Plus size={16} aria-hidden />
          Proposer une formation
        </Bouton>
      </div>

      <Dialogue
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre="Proposer une formation"
        description="Décrivez ce qui vous manque. Les autres membres pourront soutenir votre demande."
      >
        <form ref={formulaire} action={action} className="space-y-4">
          <Groupe id="titre" label="Sujet" erreur={etat.erreurs?.titre}>
            <Champ id="titre" name="titre" maxLength={140} placeholder="Négocier le prix d'une mission sans se brader" />
          </Groupe>
          <Groupe id="domaineId" label="Domaine" aide="Facultatif.">
            <Selecteur id="domaineId" name="domaineId" defaultValue="">
              <option value="">Je ne sais pas</option>
              {domaines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </Selecteur>
          </Groupe>
          <Groupe
            id="description"
            label="Pourquoi c'est utile"
            aide="Une situation concrète convainc mieux qu'un intitulé."
            erreur={etat.erreurs?.description}
          >
            <ZoneTexte
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="En rendez-vous, on cède souvent 30 % du devis dès la première objection. Personne ne nous a appris à défendre un prix."
            />
          </Groupe>
          <BoutonSoumission enCours="Publication…">Publier la demande</BoutonSoumission>
        </form>
      </Dialogue>

      <Carte>
        <EnteteCarte
          titre="Demandes ouvertes"
          description="Classées par soutien, par nombre d'organisation concernées et par fraîcheur. Soutenez celles qui vous parlent : c'est ce classement qui oriente les prochaines formations."
        />
        <CorpsCarte>
          {ouvertes.length === 0 ? (
            <EtatVide
              icone={<Lightbulb size={22} />}
              titre="Aucune demande en attente"
              description="Il manque une formation au catalogue ? Proposez-la, les autres organisations voteront."
              action={<Bouton onClick={() => setOuvert(true)}>Proposer une formation</Bouton>}
            />
          ) : (
            <ul className="space-y-3">
              {ouvertes.map((d) => (
                <CarteDemande key={d.id} demande={d} peutArbitrer={peutArbitrer} />
              ))}
            </ul>
          )}
        </CorpsCarte>
      </Carte>

      {traitees.length > 0 ? (
        <Carte>
          <EnteteCarte
            titre="Demandes traitées"
            description="Ce que la plateforme a répondu, et les formations qui en sont nées."
          />
          <CorpsCarte>
            <ul className="space-y-3">
              {traitees.map((d) => (
                <CarteDemande key={d.id} demande={d} peutArbitrer={false} />
              ))}
            </ul>
          </CorpsCarte>
        </Carte>
      ) : null}
    </div>
  );
}
