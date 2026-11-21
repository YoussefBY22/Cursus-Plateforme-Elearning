import Link from "next/link";
import { MailWarning } from "lucide-react";
import { Coquille } from "@/components/layout/coquille";
import { construireNavigation } from "@/components/layout/navigation";
import { donneesCoquille } from "@/server/requetes/coquille";
import { exigerSession } from "@/server/session";
import { resoudreTheme } from "@/server/theme";
import { libelleRole, rolePrincipal } from "@/services/rbac";

export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const u = await exigerSession();
  const [d, theme] = await Promise.all([donneesCoquille(u), resoudreTheme()]);
  const nom = d.profil ? `${d.profil.prenom} ${d.profil.nom}` : (u.name ?? "Membre");

  const bandeau = !d.profil?.emailVerifieLe ? (
    <div className="border-b border-warning/20 bg-warning-soft px-4 py-2 text-center text-[13px] font-medium sm:px-6">
      <MailWarning className="mr-1.5 inline h-4 w-4 -translate-y-px text-warning" aria-hidden />
      Confirmez votre adresse e-mail pour débloquer votre premier badge.{" "}
      <Link href="/profil#email" className="font-bold underline underline-offset-2">
        Renvoyer le lien
      </Link>
    </div>
  ) : !d.profil?.jeId ? (
    <div className="border-b border-border bg-card px-4 py-2 text-center text-[13px] font-medium sm:px-6">
      Rattachez-vous à votre organisation pour apparaître dans l&apos;annuaire.{" "}
      <Link href="/profil" className="font-bold text-primary underline underline-offset-2">
        Choisir mon organisation
      </Link>
    </div>
  ) : null;

  return (
    <Coquille
      sections={construireNavigation(u.roles, {
        studio: d.studio,
        validations: d.validations,
        signalements: d.signalementsOuverts,
        evaluationsFroid: d.evaluationsFroid,
        demandes: d.demandes,
      })}
      niveau={{
        niveau: d.niveau.niveau,
        titre: d.niveau.titre,
        avancement: d.niveau.avancement,
        xp: d.niveau.xp,
        xpSuivant: d.niveau.xpSuivant,
      }}
      nonLues={d.nonLues}
      serie={d.serie}
      compte={{
        nom,
        email: d.profil?.email ?? "",
        photo: d.profil?.photoUrl ?? null,
        role: libelleRole(rolePrincipal(u.roles)),
      }}
      theme={theme}
      bandeau={bandeau}
    >
      {children}
    </Coquille>
  );
}
