import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function Racine() {
  const session = await auth();
  redirect(session?.user?.id ? "/accueil" : "/connexion");
}
