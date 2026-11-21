import { Pastille } from "@/components/ui/pastille";
import { libelleRole, type CodeRole } from "@/services/rbac";

export const ORDRE_ROLES: CodeRole[] = ["SUPER_ADMIN", "RESP_PEDAGO", "CHARGE_SUIVI", "RESP_RH", "FORMATEUR", "MEMBRE"];

const TONS: Record<CodeRole, "primaire" | "nuit" | "succes" | "or" | "neutre" | "contour"> = {
  SUPER_ADMIN: "primaire",
  RESP_PEDAGO: "nuit",
  CHARGE_SUIVI: "contour",
  RESP_RH: "succes",
  FORMATEUR: "or",
  MEMBRE: "neutre",
};

/** Rôles d'un compte, du plus élevé au plus courant. « Membre » seul n'est affiché que s'il n'y a rien d'autre. */
export function PastillesRoles({ roles }: { roles: readonly string[] }) {
  const tries = ORDRE_ROLES.filter((r) => roles.includes(r));
  const affiches = tries.length > 1 ? tries.filter((r) => r !== "MEMBRE") : tries;
  return (
    <span className="flex flex-wrap gap-1">
      {affiches.map((r) => (
        <Pastille key={r} ton={TONS[r]}>
          {libelleRole(r)}
        </Pastille>
      ))}
    </span>
  );
}
