import { FileModeration, HistoriqueModeration } from "@/components/admin/moderation";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Onglets } from "@/components/ui/onglets";
import { compteHistorique, historiqueModeration, signalementsOuverts } from "@/server/requetes/admin-moderation";
import { exigerPermissionPage } from "@/server/session";
import { can } from "@/services/rbac";

export const metadata = { title: "Modération" };

export default async function PageModeration({ searchParams }: PageProps<"/admin/moderation">) {
  const u = await exigerPermissionPage("moderation", "lire");
  const { onglet } = await searchParams;
  const actif = onglet === "historique" ? "historique" : "ouverts";
  const [groupes, nbHistorique] = await Promise.all([signalementsOuverts(), compteHistorique()]);
  const historique = actif === "historique" ? await historiqueModeration() : [];

  return (
    <div>
      <EntetePage
        titre="Modération"
        description="Les commentaires signalés par les membres, regroupés. Masquez ce qui enfreint la charte, rejetez le reste : l'auteur d'un commentaire masqué est prévenu."
      />
      <Onglets
        actif={actif}
        onglets={[
          { cle: "ouverts", libelle: "À traiter", href: "/admin/moderation", compteur: groupes.length },
          { cle: "historique", libelle: "Historique", href: "/admin/moderation?onglet=historique", compteur: nbHistorique },
        ]}
      />
      {actif === "ouverts" ? (
        <FileModeration groupes={groupes} peutValider={can(u.roles, "moderation", "valider")} />
      ) : (
        <Carte>
          <CorpsCarte className="pt-5">
            <HistoriqueModeration
              lignes={historique.map((h) => ({
                id: h.id,
                motif: h.motif,
                statut: h.statut,
                creeLe: h.creeLe,
                traiteLe: h.traiteLe,
                texte: h.texte,
                formationTitre: h.formationTitre,
                auteur: `${h.auteurPrenom} ${h.auteurNom}`,
                par: `${h.parPrenom} ${h.parNom}`,
                moderateur: h.moderateurPrenom ? `${h.moderateurPrenom} ${h.moderateurNom}` : null,
              }))}
            />
          </CorpsCarte>
        </Carte>
      )}
    </div>
  );
}
