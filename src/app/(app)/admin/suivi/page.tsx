import { LifeBuoy, PauseCircle, TriangleAlert, UserRoundX } from "lucide-react";
import { TableauSuivi } from "@/components/admin/tableau-suivi";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { Stat } from "@/components/ui/stat";
import { donneesSuivi } from "@/server/requetes/admin-suivi";
import { exigerPermissionPage } from "@/server/session";
import { estAdmin } from "@/services/rbac";

export const metadata = { title: "Suivi des organisations" };

export default async function PageSuivi() {
  const u = await exigerPermissionPage("suivi", "lire");

  // Le équipe pédagogique voit toute la plateforme ; un chargé
  // de mission ne voit que les organisations qui lui sont rattachées.
  const vueGlobale = estAdmin(u.roles);
  const { jes, totaux } = await donneesSuivi(vueGlobale ? {} : { chargeId: u.id });

  return (
    <div>
      <EntetePage
        titre={vueGlobale ? "Suivi des organisations" : "Mon portefeuille"}
        description={
          vueGlobale
            ? "Où en est chaque organisation, et laquelle a besoin qu'on l'appelle. Les chiffres portent sur les 30 derniers jours, comparés aux 30 précédents."
            : "Les organisations que vous suivez, sur les 30 derniers jours comparés aux 30 précédents."
        }
      />

      <section aria-label="Indicateurs de suivi" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          libelle="Organisations suivies"
          valeur={totaux.suivies}
          icone={<LifeBuoy size={16} />}
          indice={vueGlobale ? "Inscrites sur la plateforme" : "Rattachées à votre portefeuille"}
        />
        <Stat
          libelle="À rappeler"
          valeur={totaux.enDecrochage}
          icone={<TriangleAlert size={16} />}
          accent={totaux.enDecrochage > 0 ? "var(--danger)" : undefined}
          indice="Sans la moindre activité depuis 30 jours"
        />
        <Stat
          libelle="Formations à l'arrêt"
          valeur={totaux.enPanne}
          icone={<PauseCircle size={16} />}
          accent={totaux.enPanne > 0 ? "var(--warning)" : undefined}
          indice="Commencées, sans relevé depuis deux semaines"
        />
        <Stat
          libelle="Sans chargé de suivi"
          valeur={totaux.sansCharge}
          icone={<UserRoundX size={16} />}
          indice="Personne n'en assure le suivi"
        />
      </section>

      <Carte className="mt-6">
        <EnteteCarte
          titre="État des organisations"
          description="Une organisation est « ralentie » quand moins d'un tiers de ses membres se forme, « en décrochage » après 30 jours de silence. Cliquez sur une ligne pour ouvrir son carnet de suivi."
        />
        <CorpsCarte>
          <TableauSuivi jes={jes} />
        </CorpsCarte>
      </Carte>
    </div>
  );
}
