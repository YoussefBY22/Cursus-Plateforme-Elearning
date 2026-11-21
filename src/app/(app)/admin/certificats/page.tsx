import { BoutonCreationModele } from "@/components/certificats/admin/creation-modele";
import { GrilleModeles } from "@/components/certificats/admin/grille-modeles";
import { TableauCertificatsEmis } from "@/components/certificats/admin/tableau-emis";
import { EntetePage } from "@/components/ui/entete-page";
import { Onglets } from "@/components/ui/onglets";
import { certificatsEmis, listeModeles, qrExemple } from "@/server/requetes/certificats";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Certificats" };

export default async function PageCertificatsAdmin({ searchParams }: PageProps<"/admin/certificats">) {
  const u = await exigerPermissionPage("certificats", "lire");
  const { onglet } = await searchParams;
  const actif = onglet === "emis" ? "emis" : "modeles";
  const peutEcrire = can(u.roles, "certificats", "ecrire");

  const [modeles, emis, qr] = await Promise.all([listeModeles(), certificatsEmis(), actif === "modeles" ? qrExemple() : Promise.resolve("")]);
  const actifs = modeles.filter((m) => !m.archive);
  const revoques = emis.filter((c) => c.revoqueLe).length;

  return (
    <div>
      <EntetePage
        titre="Certificats"
        description={
          actif === "modeles"
            ? "Chaque modèle habille le cadre commun de la plateforme à la couleur de sa thématique. Un certificat émis garde la mise en page du jour de son émission."
            : `${emis.length.toLocaleString("fr-FR")} certificats émis${revoques ? `, dont ${revoques} révoqué${revoques > 1 ? "s" : ""}` : ""}. Chaque certificat se vérifie publiquement par son QR code.`
        }
        actions={
          peutEcrire && actif === "modeles" ? (
            <BoutonCreationModele sources={actifs.map((m) => ({ id: m.id, nom: m.nom, parDefaut: m.parDefaut }))} />
          ) : null
        }
      />
      <Onglets
        actif={actif}
        onglets={[
          { cle: "modeles", libelle: "Modèles", href: "/admin/certificats", compteur: actifs.length },
          { cle: "emis", libelle: "Certificats émis", href: "/admin/certificats?onglet=emis", compteur: emis.length },
        ]}
      />
      {actif === "modeles" ? (
        <GrilleModeles
          modeles={modeles.map((m) => ({
            id: m.id,
            nom: m.nom,
            couleurTheme: m.couleurTheme,
            canevas: m.canevas,
            parDefaut: m.parDefaut,
            archive: m.archive,
            domaine: m.domaine,
            emis: m.emis,
            parcours: m.parcours,
          }))}
          qrExemple={qr}
          peutEcrire={peutEcrire}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <TableauCertificatsEmis lignes={emis} peutEcrire={peutEcrire} />
        </div>
      )}
    </div>
  );
}
