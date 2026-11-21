import { redirect } from "next/navigation";
import { MiseEnPageAuth } from "@/components/auth/mise-en-page";
import { FormulaireConnexion } from "@/components/auth/formulaire-connexion";
import { auth, googleActif } from "@/server/auth";

export const metadata = { title: "Connexion" };

export default async function PageConnexion({ searchParams }: PageProps<"/connexion">) {
  const session = await auth();
  if (session?.user?.id) redirect("/accueil");
  const { suite } = await searchParams;
  return (
    <MiseEnPageAuth>
      <FormulaireConnexion google={googleActif} suite={typeof suite === "string" ? suite : undefined} />
    </MiseEnPageAuth>
  );
}
