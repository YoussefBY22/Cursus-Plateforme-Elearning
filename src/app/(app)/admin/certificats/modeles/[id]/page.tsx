import { notFound } from "next/navigation";
import { EditeurModele } from "@/components/certificats/editeur/editeur-modele";
import { domainesPourModeles, modelePourEditeur, qrExemple } from "@/server/requetes/certificats";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Modèle de certificat" };

export default async function PageModeleCertificat({ params }: PageProps<"/admin/certificats/modeles/[id]">) {
  await exigerPermissionPage("certificats", "ecrire");
  const { id } = await params;
  const [m, domaines, qr] = await Promise.all([modelePourEditeur(id), domainesPourModeles(), qrExemple()]);
  if (!m) notFound();

  return (
    <EditeurModele
      key={m.id}
      modele={{
        id: m.id,
        nom: m.nom,
        couleurTheme: m.couleurTheme,
        domaineId: m.domaineId,
        parDefaut: m.parDefaut,
        archive: m.archive,
        canevas: m.canevas,
        images: m.images,
      }}
      domaines={domaines}
      qrExemple={qr}
    />
  );
}
