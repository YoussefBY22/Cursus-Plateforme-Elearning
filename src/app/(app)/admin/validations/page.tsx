import { ListChecks } from "lucide-react";
import { FileValidationListe } from "@/components/admin/file-validation";
import { Carte, CorpsCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { pluriel } from "@/lib/utils";
import { fileValidation } from "@/server/requetes/admin-validations";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Validations" };

export default async function PageValidations() {
  const u = await exigerPermissionPage("validation", "lire");
  const file = await fileValidation(u);
  const total = file.formations.length + file.parcours.length;
  const aTrancher = total - file.horsPortee;

  return (
    <div>
      <EntetePage
        titre="Validations"
        description="Tout ce qu'il faut pour décider est sur place : la vidéo, les objectifs, les compétences visées et les questions avec leurs bonnes réponses."
      />

      {total > 0 ? (
        <Carte className="mb-5">
          <CorpsCarte className="flex flex-wrap items-center gap-3 pt-5">
            <ListChecks className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-[13px] leading-relaxed">
              {pluriel(total, "contenu en attente", "contenus en attente")}
              {file.horsPortee > 0 ? (
                <>
                  {" "}
                  — dont {file.horsPortee} que vous ne pouvez pas trancher ({aTrancher} pour vous).
                </>
              ) : null}
            </p>
          </CorpsCarte>
        </Carte>
      ) : null}

      <FileValidationListe formations={file.formations} parcours={file.parcours} />
    </div>
  );
}
