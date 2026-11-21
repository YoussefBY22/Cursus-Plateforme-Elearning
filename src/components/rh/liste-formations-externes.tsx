"use client";

import { ClipboardList } from "lucide-react";
import { couleurLisible } from "@/components/graphiques/couleurs";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable } from "@/components/ui/tableau";
import { formaterDate } from "@/lib/utils";
import { avecJe } from "@/services/rh";

export type FormationExterneLigne = {
  id: string;
  titre: string;
  date: Date;
  dureeHeures: number;
  formateurInterne: string;
  statut: string;
  domaine: string;
  couleur: string;
  participants: number;
};

export function ListeFormationsExternes({ lignes, je }: { lignes: FormationExterneLigne[]; je: string | null }) {
  const colonnes: ColonneTable<FormationExterneLigne>[] = [
    {
      cle: "titre",
      libelle: "Formation",
      rendu: (f) => <span className="block min-w-48">{f.titre}</span>,
      valeurTri: (f) => f.titre.toLowerCase(),
      valeurCsv: (f) => f.titre,
    },
    {
      cle: "domaine",
      libelle: "Domaine",
      rendu: (f) => <Pastille couleur={couleurLisible(f.couleur)}>{f.domaine}</Pastille>,
      valeurTri: (f) => f.domaine,
      valeurCsv: (f) => f.domaine,
    },
    {
      cle: "date",
      libelle: "Date",
      rendu: (f) => <span className="whitespace-nowrap">{formaterDate(f.date)}</span>,
      valeurTri: (f) => f.date.getTime(),
      valeurCsv: (f) => f.date.toISOString().slice(0, 10),
    },
    {
      cle: "formateur",
      libelle: "Formateur interne",
      rendu: (f) => <span className="whitespace-nowrap">{f.formateurInterne}</span>,
      valeurTri: (f) => f.formateurInterne,
      valeurCsv: (f) => f.formateurInterne,
    },
    {
      cle: "participants",
      libelle: "Participants",
      rendu: (f) => <span className="chiffres">{f.participants}</span>,
      valeurTri: (f) => f.participants,
      valeurCsv: (f) => f.participants,
      className: "text-right",
    },
    {
      cle: "statut",
      libelle: "Statut",
      rendu: (f) =>
        f.statut === "CLOTUREE" ? <Pastille ton="succes">Clôturée</Pastille> : <Pastille ton="alerte">Ouverte</Pastille>,
      valeurTri: (f) => f.statut,
      valeurCsv: (f) => (f.statut === "CLOTUREE" ? "Clôturée" : "Ouverte"),
    },
  ];
  return (
    <Tableau
      lignes={lignes}
      cleLigne={(f) => f.id}
      colonnes={colonnes}
      rechercheTexte={(f) => `${f.titre} ${f.domaine} ${f.formateurInterne}`}
      placeholderRecherche="Rechercher une formation…"
      filtres={[
        {
          cle: "statut",
          libelle: "Statut",
          options: [
            { valeur: "OUVERTE", libelle: "Ouvertes" },
            { valeur: "CLOTUREE", libelle: "Clôturées" },
          ],
          predicat: (f, v) => f.statut === v,
        },
      ]}
      lienLigne={(f) => avecJe(`/mon-organisation/formations-externes/${f.id}`, je)}
      exportCsv={{ nomFichier: "formations-externes" }}
      icone={<ClipboardList className="h-6 w-6" />}
      titreVide="Aucune formation externe"
      descriptionVide="Saisissez les formations animées dans votre organisation : leurs mesures feront progresser les niveaux de vos membres."
    />
  );
}
