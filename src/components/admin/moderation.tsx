"use client";

import { EyeOff, Flag, History, ShieldCheck, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { EtatVide } from "@/components/ui/etat-vide";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable } from "@/components/ui/tableau";
import { depuis, formaterDate } from "@/lib/utils";
import { masquerCommentaire, rejeterSignalements } from "@/server/actions/admin-moderation";
import { lancerAction } from "./retour-action";

export type GroupeSignalement = {
  commentaireId: string;
  texte: string;
  masque: boolean;
  commentaireCreeLe: Date;
  auteur: { id: string; nom: string; photo: string | null };
  formation: { titre: string };
  motifs: { motif: string; n: number }[];
  signalements: { id: string; par: string; motif: string; details: string | null; creeLe: Date }[];
};

export function FileModeration({ groupes, peutValider }: { groupes: GroupeSignalement[]; peutValider: boolean }) {
  if (groupes.length === 0) {
    return (
      <EtatVide
        icone={<ShieldCheck className="h-6 w-6" />}
        titre="Aucun signalement à traiter"
        description="Les discussions sont saines. Les nouveaux signalements des membres apparaîtront ici, regroupés par commentaire."
      />
    );
  }
  return (
    <ul className="grid gap-4">
      {groupes.map((g) => (
        <li key={g.commentaireId} className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-start gap-3 px-5 pt-5">
            <Avatar nom={g.auteur.nom} photo={g.auteur.photo} taille="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{g.auteur.nom}</p>
              <p className="text-[13px] text-muted-foreground">
                sur « {g.formation.titre} » · {depuis(g.commentaireCreeLe)}
              </p>
            </div>
            <Pastille ton="danger" className="shrink-0">
              <Flag size={12} aria-hidden /> {g.signalements.length} signalement{g.signalements.length > 1 ? "s" : ""}
            </Pastille>
          </div>

          <blockquote className="mx-5 mt-4 whitespace-pre-line rounded-xl border-l-4 border-danger/60 bg-muted/60 px-4 py-3 text-sm leading-relaxed">
            {g.texte}
          </blockquote>

          <div className="px-5 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {g.motifs.map((m) => (
                <Pastille key={m.motif} ton="alerte">
                  {m.motif}
                  {m.n > 1 ? <span className="chiffres">× {m.n}</span> : null}
                </Pastille>
              ))}
            </div>
            <ul className="mt-3 grid gap-1.5">
              {g.signalements.map((s) => (
                <li key={s.id} className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{s.par}</span> · {s.motif.toLowerCase()} · {depuis(s.creeLe)}
                  {s.details ? <span className="block pl-3 italic">« {s.details} »</span> : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
            {peutValider ? (
              <>
                <BoutonConfirme
                  variante="contour"
                  taille="sm"
                  titre="Rejeter le signalement"
                  libelleConfirmation="Rejeter"
                  message="Le commentaire reste visible et les signalements sont classés sans suite. L'auteur n'est pas prévenu."
                  champs={{ commentaireId: g.commentaireId }}
                  action={async (fd) => {
                    await lancerAction(() => rejeterSignalements(fd));
                  }}
                >
                  <X size={14} /> Rejeter le signalement
                </BoutonConfirme>
                <BoutonConfirme
                  variante="danger"
                  taille="sm"
                  titre="Masquer le commentaire"
                  libelleConfirmation="Masquer"
                  message={`Le commentaire disparaît de la discussion (il reste en base, pour la trace). ${g.auteur.nom} reçoit une notification avec le motif.`}
                  champs={{ commentaireId: g.commentaireId }}
                  action={async (fd) => {
                    await lancerAction(() => masquerCommentaire(fd));
                  }}
                >
                  <EyeOff size={14} /> Masquer le commentaire
                </BoutonConfirme>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Consultation seule : la décision revient aux modérateurs.</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export type LigneHistorique = {
  id: string;
  motif: string;
  statut: string;
  creeLe: Date;
  traiteLe: Date | null;
  texte: string;
  formationTitre: string;
  auteur: string;
  par: string;
  moderateur: string | null;
};

const colonnesHistorique: ColonneTable<LigneHistorique>[] = [
  {
    cle: "decision",
    libelle: "Décision",
    rendu: (l) => (l.statut === "MASQUE" ? <Pastille ton="danger">Masqué</Pastille> : <Pastille ton="neutre">Rejeté</Pastille>),
    valeurTri: (l) => l.statut,
    valeurCsv: (l) => (l.statut === "MASQUE" ? "Masqué" : "Rejeté"),
  },
  {
    cle: "commentaire",
    libelle: "Commentaire",
    rendu: (l) => (
      <span className="block min-w-[14rem] max-w-md">
        <span className="line-clamp-2">{l.texte}</span>
        <span className="block text-xs text-muted-foreground">
          {l.auteur} · {l.formationTitre}
        </span>
      </span>
    ),
    valeurCsv: (l) => l.texte,
  },
  {
    cle: "motif",
    libelle: "Motif",
    rendu: (l) => (
      <span className="whitespace-nowrap">
        {l.motif}
        <span className="block text-xs text-muted-foreground">par {l.par}</span>
      </span>
    ),
    valeurTri: (l) => l.motif,
    valeurCsv: (l) => l.motif,
  },
  {
    cle: "traite",
    libelle: "Traité",
    rendu: (l) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formaterDate(l.traiteLe, { day: "numeric", month: "short", year: "numeric" })}
        <span className="block text-xs">{l.moderateur ?? "—"}</span>
      </span>
    ),
    valeurTri: (l) => l.traiteLe?.getTime() ?? 0,
    valeurCsv: (l) => l.traiteLe?.toISOString().slice(0, 10) ?? "",
  },
];

export function HistoriqueModeration({ lignes }: { lignes: LigneHistorique[] }) {
  return (
    <Tableau
      lignes={lignes}
      cleLigne={(l) => l.id}
      colonnes={colonnesHistorique}
      rechercheTexte={(l) => `${l.texte} ${l.auteur} ${l.par} ${l.formationTitre} ${l.motif}`}
      placeholderRecherche="Rechercher un texte, un membre, une formation…"
      icone={<History className="h-6 w-6" />}
      titreVide="Aucun signalement traité"
      descriptionVide="Les décisions de modération (masquage ou rejet) s'archiveront ici."
      exportCsv={{ nomFichier: "cursus-moderation" }}
      filtres={[
        {
          cle: "statut",
          libelle: "Décision",
          options: [
            { valeur: "MASQUE", libelle: "Masqués" },
            { valeur: "REJETE", libelle: "Rejetés" },
          ],
          predicat: (l, v) => l.statut === v,
        },
      ]}
    />
  );
}
