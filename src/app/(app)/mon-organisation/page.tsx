import { Building2, Plus } from "lucide-react";
import { CompetencesJe } from "@/components/rh/competences-je";
import { ExportsRh } from "@/components/rh/exports-rh";
import { ListeFormationsExternes } from "@/components/rh/liste-formations-externes";
import { MembresRh } from "@/components/rh/membres-rh";
import { ReferentielJe } from "@/components/rh/referentiel-je";
import { SelecteurJe } from "@/components/rh/selecteur-je";
import { LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { Onglets } from "@/components/ui/onglets";
import {
  compteursRh,
  donneesCompetencesJe,
  donneesMembres,
  donneesReferentielJe,
  listeFormationsExternes,
  listeJes,
  resoudreJe,
} from "@/server/requetes/rh";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";
import { avecJe } from "@/services/rh";

export const metadata = { title: "Mon organisation" };

const ONGLETS = ["membres", "competences", "referentiel", "formations", "exports"] as const;
type Onglet = (typeof ONGLETS)[number];

export default async function PageMaJe({ searchParams }: PageProps<"/mon-organisation">) {
  const u = await exigerPermissionPage("rh", "lire");
  const sp = await searchParams;
  const demande = typeof sp.onglet === "string" ? sp.onglet : "";
  const onglet: Onglet = (ONGLETS as readonly string[]).includes(demande) ? (demande as Onglet) : "membres";
  const jeParam = typeof sp.je === "string" ? sp.je : null;
  const superAdmin = u.roles.includes("SUPER_ADMIN");

  const [je, jes] = await Promise.all([resoudreJe(u, jeParam), superAdmin ? listeJes() : Promise.resolve([])]);

  if (!je) {
    return (
      <div>
        <EntetePage
          titre="Mon organisation"
          description="Membres, compétences, référentiel adapté et formations internes de votre organisation."
          actions={superAdmin ? <SelecteurJe jes={jes} actuelle={null} /> : undefined}
        />
        <EtatVide
          icone={<Building2 className="h-6 w-6" />}
          titre={superAdmin ? "Choisissez une organisation" : "Aucune organisation rattachée"}
          description={
            superAdmin
              ? "Sélectionnez l'organisation à consulter dans la liste ci-dessus : vous verrez son espace RH tel que son responsable le voit."
              : "Votre compte n'est rattaché à aucune organisation. Choisissez la vôtre dans votre profil, puis demandez à la plateforme de confirmer votre rôle de responsable RH."
          }
          action={superAdmin ? undefined : <LienBouton href="/profil">Choisir mon organisation</LienBouton>}
        />
      </div>
    );
  }

  const peutEcrire = can(u.roles, "rh", "ecrire");
  // Le super admin garde l'organisation consultée dans tous les liens ; pour un RH, `je` est ignoré côté serveur.
  const lienJe = superAdmin ? je.id : null;
  const sigle = je.sigle ?? je.nom;
  const compteurs = await compteursRh(je.id);
  const lien = (o: Onglet) => avecJe(`/mon-organisation?onglet=${o}`, lienJe);

  let contenu: React.ReactNode;
  if (onglet === "membres") {
    const d = await donneesMembres(je.id);
    contenu = <MembresRh enAttente={d.enAttente} valides={d.valides} je={je.id} peutEcrire={peutEcrire} />;
  } else if (onglet === "competences") {
    const d = await donneesCompetencesJe(je.id);
    contenu = <CompetencesJe membres={d.membres} domaines={d.domaines} niveaux={d.niveaux} indicateurs={d.indicateurs} />;
  } else if (onglet === "referentiel") {
    const domaines = await donneesReferentielJe(je.id);
    contenu = (
      <ReferentielJe
        je={je.id}
        sigle={sigle}
        peutEcrire={peutEcrire}
        domaines={domaines.map((d) => ({
          id: d.id,
          nom: d.nom,
          description: d.description,
          couleur: d.couleur,
          icone: d.icone,
          adapte: d.adapte,
          dejaAdapte: d.dejaAdapte,
          lignes: d.lignes,
          nonReprises: d.nonReprises,
        }))}
      />
    );
  } else if (onglet === "formations") {
    const lignes = await listeFormationsExternes(je.id);
    contenu = (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Les formations animées dans votre organisation, hors Cursus. Leurs mesures (auto-évaluations, évaluation du formateur, test)
            font progresser les niveaux avec la même méthode que les formations en ligne.
          </p>
          {peutEcrire ? (
            <LienBouton href={avecJe("/mon-organisation/formations-externes/nouvelle", lienJe)}>
              <Plus size={16} aria-hidden /> Nouvelle formation externe
            </LienBouton>
          ) : null}
        </div>
        <ListeFormationsExternes lignes={lignes} je={lienJe} />
      </div>
    );
  } else {
    contenu = <ExportsRh je={lienJe} />;
  }

  return (
    <div>
      <EntetePage
        titre={je.nom}
        description="Espace RH : rattachements, compétences des membres, référentiel adapté, formations internes et exports."
        actions={superAdmin ? <SelecteurJe jes={jes} actuelle={je.id} onglet={onglet} /> : undefined}
      />
      <Onglets
        actif={onglet}
        onglets={[
          { cle: "membres", libelle: "Membres", href: lien("membres"), compteur: compteurs.enAttente || undefined },
          { cle: "competences", libelle: "Compétences", href: lien("competences") },
          { cle: "referentiel", libelle: "Référentiel", href: lien("referentiel") },
          {
            cle: "formations",
            libelle: "Formations externes",
            href: lien("formations"),
            compteur: compteurs.formationsOuvertes || undefined,
          },
          { cle: "exports", libelle: "Exports", href: lien("exports") },
        ]}
      />
      {contenu}
    </div>
  );
}
