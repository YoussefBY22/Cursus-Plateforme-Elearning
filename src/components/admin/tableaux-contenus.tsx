"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, BookOpen, ExternalLink, Map as IconeParcours } from "lucide-react";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { BoutonConfirme } from "@/components/ui/confirmation";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable, type FiltreTable } from "@/components/ui/tableau";
import { classesBouton } from "@/components/ui/bouton";
import { depuis } from "@/lib/utils";
import { changerStatutContenu } from "@/server/actions/admin-contenus";
import { LIBELLES_STATUT_CONTENU } from "@/services/rapports";
import { lancerAction } from "./retour-action";

type Base = {
  id: string;
  titre: string;
  statut: string;
  domaineId: string;
  domaine: string;
  couleur: string;
  auteurId: string;
  auteur: string;
  dejaPublie: boolean;
  majLe: Date;
};

export type LigneFormationAdmin = Base & { capsule: boolean; dureeMin: number; inscrits: number; terminees: number; parcoursLies: number };
export type LigneParcoursAdmin = Base & { etapes: number };

const TONS_STATUT: Record<string, "neutre" | "alerte" | "succes" | "danger" | "contour"> = {
  BROUILLON: "neutre",
  EN_VALIDATION: "alerte",
  PUBLIE: "succes",
  REFUSE: "danger",
  ARCHIVE: "contour",
};

export function PastilleStatut({ statut }: { statut: string }) {
  return <Pastille ton={TONS_STATUT[statut] ?? "neutre"}>{LIBELLES_STATUT_CONTENU[statut] ?? statut}</Pastille>;
}

function filtresCommuns<T extends Base>(lignes: T[], domaines: { id: string; nom: string }[]): FiltreTable<T>[] {
  const auteurs = new Map<string, string>();
  for (const l of lignes) auteurs.set(l.auteurId, l.auteur);
  return [
    {
      cle: "statut",
      libelle: "Statut",
      options: Object.entries(LIBELLES_STATUT_CONTENU).map(([valeur, libelle]) => ({ valeur, libelle })),
      predicat: (l, v) => l.statut === v,
    },
    {
      cle: "domaine",
      libelle: "Domaine",
      options: domaines.map((d) => ({ valeur: d.id, libelle: d.nom })),
      predicat: (l, v) => l.domaineId === v,
    },
    {
      cle: "auteur",
      libelle: "Auteur",
      options: [...auteurs.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr")).map(([valeur, libelle]) => ({ valeur, libelle })),
      predicat: (l, v) => l.auteurId === v,
    },
  ];
}

function colonneTitre<T extends Base>(sousTitre: (l: T) => React.ReactNode): ColonneTable<T> {
  return {
    cle: "titre",
    libelle: "Titre",
    rendu: (l) => (
      <span className="block min-w-[14rem] max-w-md">
        <span className="line-clamp-2 font-semibold">{l.titre}</span>
        <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleurLisible(l.couleur) }} aria-hidden />
          {l.domaine} · {sousTitre(l)}
        </span>
      </span>
    ),
    valeurTri: (l) => l.titre.toLowerCase(),
    valeurCsv: (l) => l.titre,
  };
}

const colonneStatut = <T extends Base>(): ColonneTable<T> => ({
  cle: "statut",
  libelle: "Statut",
  rendu: (l) => <PastilleStatut statut={l.statut} />,
  valeurTri: (l) => l.statut,
  valeurCsv: (l) => LIBELLES_STATUT_CONTENU[l.statut] ?? l.statut,
});

const colonneAuteur = <T extends Base>(): ColonneTable<T> => ({
  cle: "auteur",
  libelle: "Auteur",
  rendu: (l) => <span className="whitespace-nowrap">{l.auteur}</span>,
  valeurTri: (l) => l.auteur,
  valeurCsv: (l) => l.auteur,
});

const colonneMaj = <T extends Base>(): ColonneTable<T> => ({
  cle: "maj",
  libelle: "Modifié",
  rendu: (l) => <span className="whitespace-nowrap text-muted-foreground">{depuis(l.majLe)}</span>,
  valeurTri: (l) => l.majLe.getTime(),
  valeurCsv: (l) => l.majLe.toISOString().slice(0, 10),
});

function Actions({
  type,
  ligne,
  peutAgir,
  avertissement,
}: {
  type: "formation" | "parcours";
  ligne: Base;
  peutAgir: boolean;
  avertissement?: string;
}) {
  const studio = type === "formation" ? `/studio/formations/${ligne.id}` : `/studio/parcours/${ligne.id}`;
  const archive = ligne.statut === "ARCHIVE";
  const nom = type === "formation" ? "la formation" : "le parcours";
  return (
    <span className="flex items-center justify-end gap-1">
      <Link href={studio} className={classesBouton("fantome", "sm")} title="Ouvrir dans le studio">
        <ExternalLink size={14} aria-hidden /> <span className="hidden xl:inline">Ouvrir dans le studio</span>
        <span className="sr-only xl:hidden">Ouvrir dans le studio</span>
      </Link>
      {peutAgir && (!archive || ligne.dejaPublie) ? (
        <BoutonConfirme
          variante={archive ? "succes" : "contour"}
          taille="sm"
          titre={archive ? `Republier ${nom}` : `Archiver ${nom}`}
          libelleConfirmation={archive ? "Republier" : "Archiver"}
          message={
            archive
              ? `« ${ligne.titre} » redevient visible des membres, avec son contenu tel qu'il a été archivé.`
              : `« ${ligne.titre} » disparaît du catalogue. Les progressions, notes et certificats déjà obtenus sont conservés.${avertissement ? ` ${avertissement}` : ""}`
          }
          champs={{ type, id: ligne.id, operation: archive ? "republier" : "archiver" }}
          action={async (fd) => {
            await lancerAction(() => changerStatutContenu(fd));
          }}
        >
          {archive ? <ArchiveRestore size={14} /> : <Archive size={14} />} {archive ? "Republier" : "Archiver"}
        </BoutonConfirme>
      ) : null}
    </span>
  );
}

export function TableauFormationsAdmin({
  lignes,
  domaines,
  peutAgir,
}: {
  lignes: LigneFormationAdmin[];
  domaines: { id: string; nom: string }[];
  peutAgir: boolean;
}) {
  const colonnes: ColonneTable<LigneFormationAdmin>[] = [
    colonneTitre((l) => (l.capsule ? `capsule de parcours · ${l.dureeMin} min` : `${l.dureeMin} min`)),
    colonneStatut(),
    colonneAuteur(),
    {
      cle: "terminees",
      libelle: "Terminées",
      rendu: (l) => (
        <span className="chiffres whitespace-nowrap">
          {l.terminees}
          <span className="text-xs text-muted-foreground"> / {l.inscrits} inscrits</span>
        </span>
      ),
      valeurTri: (l) => l.terminees,
      valeurCsv: (l) => l.terminees,
    },
    colonneMaj(),
    {
      cle: "actions",
      libelle: "",
      className: "text-right",
      rendu: (l) => (
        <Actions
          type="formation"
          ligne={l}
          peutAgir={peutAgir}
          avertissement={
            l.parcoursLies > 0
              ? `Attention : elle est une étape de ${l.parcoursLies} parcours publié${l.parcoursLies > 1 ? "s" : ""}, que les membres ne pourront plus terminer.`
              : undefined
          }
        />
      ),
    },
  ];
  return (
    <Tableau
      lignes={lignes}
      cleLigne={(l) => l.id}
      colonnes={colonnes}
      rechercheTexte={(l) => `${l.titre} ${l.auteur} ${l.domaine}`}
      placeholderRecherche="Rechercher une formation, un auteur…"
      filtres={filtresCommuns(lignes, domaines)}
      exportCsv={{ nomFichier: "cursus-formations" }}
      icone={<BookOpen className="h-6 w-6" />}
      titreVide="Aucune formation"
      descriptionVide="Les formations créées dans l'espace formateur apparaîtront ici, quel que soit leur statut."
    />
  );
}

export function TableauParcoursAdmin({
  lignes,
  domaines,
  peutAgir,
}: {
  lignes: LigneParcoursAdmin[];
  domaines: { id: string; nom: string }[];
  peutAgir: boolean;
}) {
  const colonnes: ColonneTable<LigneParcoursAdmin>[] = [
    colonneTitre((l) => `${l.etapes} étape${l.etapes > 1 ? "s" : ""}`),
    colonneStatut(),
    colonneAuteur(),
    colonneMaj(),
    {
      cle: "actions",
      libelle: "",
      className: "text-right",
      rendu: (l) => <Actions type="parcours" ligne={l} peutAgir={peutAgir} />,
    },
  ];
  return (
    <Tableau
      lignes={lignes}
      cleLigne={(l) => l.id}
      colonnes={colonnes}
      rechercheTexte={(l) => `${l.titre} ${l.auteur} ${l.domaine}`}
      placeholderRecherche="Rechercher un parcours, un auteur…"
      filtres={filtresCommuns(lignes, domaines)}
      exportCsv={{ nomFichier: "cursus-parcours" }}
      icone={<IconeParcours className="h-6 w-6" />}
      titreVide="Aucun parcours"
      descriptionVide="Les parcours certifiants créés dans l'espace formateur apparaîtront ici."
    />
  );
}
