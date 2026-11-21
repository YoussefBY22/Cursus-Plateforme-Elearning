"use client";

import { LifeBuoy, PauseCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable, type FiltreTable } from "@/components/ui/tableau";
import { formaterNombre } from "@/services/rapports";
import { ETATS_JE, formaterVariation, LIBELLES_ETAT_JE, type EtatJE, type Variation } from "@/services/tendances";

export type LigneSuiviVue = {
  id: string;
  nom: string;
  sigle: string | null;
  couleur: string;
  charge: { id: string; nom: string } | null;
  membres: number;
  membresActifs: number;
  enCours: number;
  enPanne: number;
  terminees: number;
  heures: number;
  niveauMoyen: number | null;
  joursDepuisActivite: number | null;
  variation: Variation;
  etat: EtatJE;
};

function Tendance({ v }: { v: Variation }) {
  if (v.sens === "stable") return <span className="text-muted-foreground">=</span>;
  const hausse = v.sens === "hausse";
  const Icone = hausse ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${hausse ? "text-success" : "text-danger"}`}>
      <Icone size={14} aria-hidden />
      {formaterVariation(v)}
    </span>
  );
}

/** « il y a 3 j », « aujourd'hui », « jamais ». */
function silence(jours: number | null): string {
  if (jours === null) return "jamais";
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} j`;
}

export function TableauSuivi({ jes }: { jes: LigneSuiviVue[] }) {
  const colonnes: ColonneTable<LigneSuiviVue>[] = [
    {
      cle: "je",
      libelle: "Organisation",
      rendu: (j) => (
        <span className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: j.couleur }} aria-hidden />
          <span>
            <span className="font-bold">{j.sigle ?? j.nom}</span>
            {j.sigle ? <span className="block text-xs text-muted-foreground">{j.nom}</span> : null}
          </span>
        </span>
      ),
      valeurTri: (j) => j.nom,
      valeurCsv: (j) => j.nom,
    },
    {
      cle: "etat",
      libelle: "État",
      rendu: (j) => <Pastille ton={LIBELLES_ETAT_JE[j.etat].ton}>{LIBELLES_ETAT_JE[j.etat].libelle}</Pastille>,
      valeurTri: (j) => ETATS_JE.indexOf(j.etat),
      valeurCsv: (j) => LIBELLES_ETAT_JE[j.etat].libelle,
    },
    {
      cle: "actifs",
      libelle: "Actifs / membres",
      rendu: (j) => (
        <span>
          <span className="font-bold">{j.membresActifs}</span>
          <span className="text-muted-foreground"> / {j.membres}</span>
        </span>
      ),
      valeurTri: (j) => (j.membres > 0 ? j.membresActifs / j.membres : -1),
      valeurCsv: (j) => `${j.membresActifs}/${j.membres}`,
    },
    {
      cle: "enCours",
      libelle: "En cours",
      rendu: (j) => (
        <span className="flex items-center gap-2">
          {j.enCours}
          {j.enPanne > 0 ? (
            <span
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-warning"
              title={`${j.enPanne} formation(s) sans relevé depuis deux semaines`}
            >
              <PauseCircle size={13} aria-hidden />
              <span>{j.enPanne} à l&apos;arrêt</span>
            </span>
          ) : null}
        </span>
      ),
      valeurTri: (j) => j.enCours,
      valeurCsv: (j) => j.enCours,
    },
    {
      cle: "terminees",
      libelle: "Terminées (30 j)",
      rendu: (j) => (
        <span className="flex items-center gap-2">
          <span className="font-bold">{j.terminees}</span>
          <Tendance v={j.variation} />
        </span>
      ),
      valeurTri: (j) => j.terminees,
      valeurCsv: (j) => j.terminees,
    },
    {
      cle: "heures",
      libelle: "Heures (30 j)",
      rendu: (j) => formaterNombre(j.heures, 1),
      valeurTri: (j) => j.heures,
      valeurCsv: (j) => j.heures,
    },
    {
      cle: "niveau",
      libelle: "Niveau moyen",
      rendu: (j) => (j.niveauMoyen === null ? <span className="text-muted-foreground">—</span> : Math.round(j.niveauMoyen)),
      valeurTri: (j) => j.niveauMoyen ?? -1,
      valeurCsv: (j) => (j.niveauMoyen === null ? "" : Math.round(j.niveauMoyen)),
    },
    {
      cle: "silence",
      libelle: "Dernière activité",
      rendu: (j) => <span className="text-muted-foreground">{silence(j.joursDepuisActivite)}</span>,
      valeurTri: (j) => j.joursDepuisActivite ?? Number.MAX_SAFE_INTEGER,
      valeurCsv: (j) => silence(j.joursDepuisActivite),
    },
    {
      cle: "charge",
      libelle: "Chargé de suivi",
      rendu: (j) =>
        j.charge ? j.charge.nom : <span className="text-muted-foreground">Personne</span>,
      valeurTri: (j) => j.charge?.nom ?? "",
      valeurCsv: (j) => j.charge?.nom ?? "",
    },
  ];

  const filtres: FiltreTable<LigneSuiviVue>[] = [
    {
      cle: "etat",
      libelle: "État",
      options: ETATS_JE.map((e) => ({ valeur: e, libelle: LIBELLES_ETAT_JE[e].libelle })),
      predicat: (j, v) => j.etat === v,
    },
    {
      cle: "charge",
      libelle: "Suivi",
      options: [
        { valeur: "oui", libelle: "Avec chargé de suivi" },
        { valeur: "non", libelle: "Sans chargé de suivi" },
      ],
      predicat: (j, v) => (v === "oui" ? !!j.charge : !j.charge),
    },
  ];

  return (
    <Tableau
      lignes={jes}
      cleLigne={(j) => j.id}
      colonnes={colonnes}
      rechercheTexte={(j) => `${j.nom} ${j.sigle ?? ""} ${j.charge?.nom ?? ""}`}
      placeholderRecherche="Rechercher une organisation…"
      filtres={filtres}
      lienLigne={(j) => `/admin/suivi/${j.id}`}
      exportCsv={{ nomFichier: "cursus-suivi-je.csv" }}
      icone={<LifeBuoy size={20} />}
      titreVide="Aucune organisation à suivre"
      descriptionVide="Aucune organisation ne vous est rattachée pour l'instant. Le équipe pédagogique attribue les portefeuilles."
    />
  );
}
