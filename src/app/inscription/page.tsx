import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { MiseEnPageAuth } from "@/components/auth/mise-en-page";
import { FormulaireInscription } from "@/components/auth/formulaire-inscription";
import { db } from "@/db";
import { domaines, juniorEntreprises } from "@/db/schema";
import { auth } from "@/server/auth";

export const metadata = { title: "Inscription" };

export default async function PageInscription() {
  const session = await auth();
  if (session?.user?.id) redirect("/accueil");
  const [jes, deps] = await Promise.all([
    db
      .select({ id: juniorEntreprises.id, nom: juniorEntreprises.nom, ville: juniorEntreprises.ville })
      .from(juniorEntreprises)
      .where(eq(juniorEntreprises.active, true))
      .orderBy(asc(juniorEntreprises.nom)),
    db.select({ code: domaines.code, nom: domaines.nom }).from(domaines).orderBy(asc(domaines.ordre)),
  ]);
  return (
    <MiseEnPageAuth>
      <FormulaireInscription jes={jes} departements={deps} />
    </MiseEnPageAuth>
  );
}
