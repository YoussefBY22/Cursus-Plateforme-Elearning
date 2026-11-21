"use client";

import { useTransition } from "react";
import { Check, UserPlus, Users } from "lucide-react";
import { lancerAction } from "@/components/admin/retour-action";
import { Avatar } from "@/components/ui/avatar";
import { Bouton } from "@/components/ui/bouton";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable } from "@/components/ui/tableau";
import { depuis, formaterDate } from "@/lib/utils";
import { deciderRattachement } from "@/server/actions/rh";

export type MembreEnAttente = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  photoUrl: string | null;
  poste: string | null;
  departement: string | null;
  creeLe: Date;
};

export type MembreValide = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  photoUrl: string | null;
  poste: string | null;
  departement: string | null;
  actif: boolean;
  niveau: { niveau: number; titre: string };
  xp: number;
  formationsTerminees: number;
  derniereActivite: Date | null;
};

function DemandeRattachement({ m, je, peutEcrire }: { m: MembreEnAttente; je: string; peutEcrire: boolean }) {
  const [enCours, demarrer] = useTransition();
  const nom = `${m.prenom} ${m.nom}`;
  const fd = (decision: "accepter" | "refuser") => {
    const f = new FormData();
    f.set("membreId", m.id);
    f.set("decision", decision);
    f.set("je", je);
    return f;
  };
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border/60 py-3 last:border-0">
      <Avatar nom={nom} photo={m.photoUrl} taille="md" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-semibold">{nom}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {[m.poste, m.departement].filter(Boolean).join(" · ") || m.email}
        </p>
        <p className="text-xs text-muted-foreground">Demande envoyée {depuis(m.creeLe)}</p>
      </div>
      {peutEcrire ? (
        <div className="flex gap-2">
          <BoutonConfirme
            variante="contour"
            taille="sm"
            titre="Refuser le rattachement"
            libelleConfirmation="Refuser le rattachement"
            message={
              <>
                {nom} ne sera plus rattaché(e) à votre organisation et sera prévenu(e). Ses données d&apos;apprentissage sont conservées ; il ou
                elle pourra choisir une autre organisation depuis son profil.
              </>
            }
            action={async () => {
              await lancerAction(() => deciderRattachement(fd("refuser")));
            }}
          >
            Refuser
          </BoutonConfirme>
          <Bouton
            variante="succes"
            taille="sm"
            disabled={enCours}
            onClick={() => demarrer(async () => void (await lancerAction(() => deciderRattachement(fd("accepter")))))}
          >
            <Check size={14} aria-hidden /> Accepter
          </Bouton>
        </div>
      ) : null}
    </li>
  );
}

export function MembresRh({
  enAttente,
  valides,
  je,
  peutEcrire,
}: {
  enAttente: MembreEnAttente[];
  valides: MembreValide[];
  je: string;
  peutEcrire: boolean;
}) {
  const colonnes: ColonneTable<MembreValide>[] = [
    {
      cle: "membre",
      libelle: "Membre",
      rendu: (m) => (
        <span className="flex min-w-48 items-center gap-2.5">
          <Avatar nom={`${m.prenom} ${m.nom}`} photo={m.photoUrl} taille="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {m.prenom} {m.nom}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{m.poste ?? "Poste non renseigné"}</span>
          </span>
          {!m.actif ? <Pastille ton="danger">Compte désactivé</Pastille> : null}
        </span>
      ),
      valeurTri: (m) => `${m.nom} ${m.prenom}`.toLowerCase(),
      valeurCsv: (m) => `${m.prenom} ${m.nom}`,
    },
    {
      cle: "departement",
      libelle: "Département",
      rendu: (m) => <span className="whitespace-nowrap">{m.departement ?? "—"}</span>,
      valeurTri: (m) => m.departement ?? "",
      valeurCsv: (m) => m.departement ?? "",
    },
    {
      cle: "niveau",
      libelle: "Niveau",
      rendu: (m) => (
        <span className="whitespace-nowrap">
          <span className="chiffres font-bold">{m.niveau.niveau}</span>{" "}
          <span className="text-xs text-muted-foreground">{m.niveau.titre}</span>
        </span>
      ),
      valeurTri: (m) => m.xp,
      valeurCsv: (m) => m.niveau.niveau,
    },
    {
      cle: "formations",
      libelle: "Formations terminées",
      rendu: (m) => <span className="chiffres">{m.formationsTerminees}</span>,
      valeurTri: (m) => m.formationsTerminees,
      valeurCsv: (m) => m.formationsTerminees,
      className: "text-right",
    },
    {
      cle: "activite",
      libelle: "Dernière activité",
      rendu: (m) => (
        <span className="whitespace-nowrap text-muted-foreground" title={m.derniereActivite ? formaterDate(m.derniereActivite) : undefined}>
          {m.derniereActivite ? depuis(m.derniereActivite) : "Jamais"}
        </span>
      ),
      valeurTri: (m) => m.derniereActivite?.getTime() ?? 0,
      valeurCsv: (m) => (m.derniereActivite ? m.derniereActivite.toISOString().slice(0, 10) : ""),
    },
  ];

  return (
    <div className="grid gap-6">
      {enAttente.length ? (
        <Carte className="border-warning/40">
          <EnteteCarte
            titre={`Rattachements à confirmer (${enAttente.length})`}
            description="Ces personnes se déclarent membres de votre organisation. Confirmez seulement celles que vous connaissez."
          />
          <CorpsCarte>
            <ul>
              {enAttente.map((m) => (
                <DemandeRattachement key={m.id} m={m} je={je} peutEcrire={peutEcrire} />
              ))}
            </ul>
          </CorpsCarte>
        </Carte>
      ) : null}

      <Carte>
        <EnteteCarte
          titre="Membres validés"
          description="Cliquez sur un membre pour voir son profil de compétences et son parcours."
        />
        <CorpsCarte>
          {valides.length === 0 ? (
            <EtatVide
              compact
              icone={enAttente.length ? <UserPlus className="h-6 w-6" /> : <Users className="h-6 w-6" />}
              titre="Aucun membre validé"
              description={
                enAttente.length
                  ? "Confirmez les rattachements ci-dessus : les membres acceptés apparaîtront ici."
                  : "Invitez vos membres à créer leur compte Cursus et à choisir votre organisation dans leur profil : leurs demandes arriveront ici."
              }
            />
          ) : (
            <Tableau
              lignes={valides}
              cleLigne={(m) => m.id}
              colonnes={colonnes}
              rechercheTexte={(m) => `${m.prenom} ${m.nom} ${m.email} ${m.poste ?? ""} ${m.departement ?? ""}`}
              placeholderRecherche="Rechercher un membre…"
              filtres={[
                {
                  cle: "departement",
                  libelle: "Département",
                  options: [...new Set(valides.map((m) => m.departement).filter((d): d is string => !!d))]
                    .sort()
                    .map((d) => ({ valeur: d, libelle: d })),
                  predicat: (m, v) => m.departement === v,
                },
              ]}
              lienLigne={(m) => `/membres/${m.id}`}
              exportCsv={{ nomFichier: "membres-je" }}
              icone={<Users className="h-6 w-6" />}
            />
          )}
        </CorpsCarte>
      </Carte>
    </div>
  );
}
