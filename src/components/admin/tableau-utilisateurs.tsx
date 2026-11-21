"use client";

import { UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Pastille } from "@/components/ui/pastille";
import { Tableau, type ColonneTable } from "@/components/ui/tableau";
import { depuis } from "@/lib/utils";
import { libelleRole } from "@/services/rbac";
import { LIBELLES_RATTACHEMENT } from "@/services/rapports";
import { ORDRE_ROLES, PastillesRoles } from "./roles";

export type LigneTableauUtilisateur = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  photoUrl: string | null;
  roles: string[];
  actif: boolean;
  rattachement: string;
  jeId: string | null;
  je: string | null;
  jeSigle: string | null;
  xp: number;
  niveau: number;
  titreNiveau: string;
  dernierAcces: Date | null;
};

const colonnes: ColonneTable<LigneTableauUtilisateur>[] = [
  {
    cle: "nom",
    libelle: "Membre",
    rendu: (u) => (
      <span className="flex min-w-[12rem] items-center gap-3">
        <Avatar nom={`${u.prenom} ${u.nom}`} photo={u.photoUrl} taille="sm" />
        <span className="min-w-0">
          <span className="block truncate">
            {u.prenom} {u.nom}
          </span>
          {!u.actif ? (
            <Pastille ton="danger" className="mt-0.5">
              Désactivé
            </Pastille>
          ) : u.jeId && u.rattachement !== "VALIDE" ? (
            <span className="block text-xs font-normal text-muted-foreground">
              Rattachement {LIBELLES_RATTACHEMENT[u.rattachement]?.toLowerCase()}
            </span>
          ) : null}
        </span>
      </span>
    ),
    valeurTri: (u) => `${u.nom} ${u.prenom}`.toLowerCase(),
    valeurCsv: (u) => `${u.prenom} ${u.nom}`,
  },
  {
    cle: "email",
    libelle: "E-mail",
    rendu: (u) => <span className="text-muted-foreground">{u.email}</span>,
    valeurTri: (u) => u.email,
    valeurCsv: (u) => u.email,
  },
  {
    cle: "je",
    libelle: "Organisation",
    rendu: (u) =>
      u.je ? (
        <span title={u.je}>{u.jeSigle ?? u.je}</span>
      ) : (
        <span className="text-xs text-muted-foreground">Sans organisation</span>
      ),
    valeurTri: (u) => u.jeSigle ?? u.je ?? "~",
    valeurCsv: (u) => u.je ?? "",
  },
  {
    cle: "roles",
    libelle: "Rôles",
    rendu: (u) => <PastillesRoles roles={u.roles} />,
    valeurTri: (u) => ORDRE_ROLES.findIndex((r) => u.roles.includes(r)),
    valeurCsv: (u) => u.roles.map(libelleRole).join(" | "),
  },
  {
    cle: "xp",
    libelle: "Niveau",
    rendu: (u) => (
      <span className="whitespace-nowrap">
        <span className="chiffres font-bold">Niv. {u.niveau}</span>
        <span className="chiffres ml-1.5 text-xs text-muted-foreground">{u.xp.toLocaleString("fr-FR")} XP</span>
      </span>
    ),
    valeurTri: (u) => u.xp,
    valeurCsv: (u) => u.xp,
  },
  {
    cle: "acces",
    libelle: "Dernier accès",
    rendu: (u) => (
      <span className="whitespace-nowrap text-muted-foreground">{u.dernierAcces ? depuis(u.dernierAcces) : "Jamais"}</span>
    ),
    valeurTri: (u) => u.dernierAcces?.getTime() ?? 0,
    valeurCsv: (u) => u.dernierAcces?.toISOString().slice(0, 10) ?? "",
  },
];

export function TableauUtilisateurs({
  lignes,
  jes,
}: {
  lignes: LigneTableauUtilisateur[];
  jes: { id: string; nom: string }[];
}) {
  return (
    <Tableau
      lignes={lignes}
      cleLigne={(u) => u.id}
      colonnes={colonnes}
      rechercheTexte={(u) => `${u.prenom} ${u.nom} ${u.email} ${u.je ?? ""} ${u.jeSigle ?? ""}`}
      placeholderRecherche="Rechercher un nom, un e-mail, une organisation…"
      lienLigne={(u) => `/admin/utilisateurs/${u.id}`}
      exportCsv={{ nomFichier: "cursus-comptes" }}
      icone={<UserCheck className="h-6 w-6" />}
      titreVide="Aucun compte"
      descriptionVide="Les comptes apparaissent ici dès la première inscription."
      filtres={[
        {
          cle: "role",
          libelle: "Rôle",
          options: ORDRE_ROLES.map((r) => ({ valeur: r, libelle: libelleRole(r) })),
          predicat: (u, v) => u.roles.includes(v),
        },
        {
          cle: "je",
          libelle: "Organisation",
          options: [{ valeur: "__aucune", libelle: "Sans organisation" }, ...jes.map((j) => ({ valeur: j.id, libelle: j.nom }))],
          predicat: (u, v) => (v === "__aucune" ? !u.jeId : u.jeId === v),
        },
        {
          cle: "rattachement",
          libelle: "Rattachement",
          options: Object.entries(LIBELLES_RATTACHEMENT).map(([valeur, libelle]) => ({ valeur, libelle })),
          predicat: (u, v) => u.rattachement === v,
        },
        {
          cle: "actif",
          libelle: "État",
          options: [
            { valeur: "oui", libelle: "Actifs" },
            { valeur: "non", libelle: "Désactivés" },
          ],
          predicat: (u, v) => u.actif === (v === "oui"),
        },
      ]}
    />
  );
}
