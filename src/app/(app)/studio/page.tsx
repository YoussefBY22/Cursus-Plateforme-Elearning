import { Presentation } from "lucide-react";
import { Creation } from "@/components/studio/creation";
import { ListeContenus } from "@/components/studio/liste-contenus";
import { Carte, CorpsCarte, EnteteCarte } from "@/components/ui/carte";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatVide } from "@/components/ui/etat-vide";
import { circuitAuteur, mesContenus, optionsStudio } from "@/server/requetes/studio";
import { exigerPermissionPage } from "@/server/session";

export const metadata = { title: "Espace formateur" };

export default async function PageStudio() {
  const u = await exigerPermissionPage("studio", "lire");
  const [contenus, options, circuit] = await Promise.all([mesContenus(u.id), optionsStudio(), circuitAuteur(u)]);

  const peutEcrire = circuit !== "INTERDIT";
  const rien = contenus.formations.length === 0 && contenus.parcours.length === 0;

  return (
    <div>
      <EntetePage
        titre="Espace formateur"
        description={
          circuit === "PUBLICATION_DIRECTE"
            ? "Vos contenus sont publiés dès que vous les soumettez."
            : "Vos contenus partent en validation avant d'arriver au catalogue."
        }
        actions={peutEcrire ? <Creation domaines={options.domaines} /> : undefined}
      />

      {!peutEcrire ? (
        <EtatVide
          icone={<Presentation className="h-6 w-6" />}
          titre="La création de contenu est fermée pour votre rôle"
          description="L'équipe pédagogique peut vous ouvrir le rôle de formateur. Vous gardez l'accès en lecture à vos contenus existants."
        />
      ) : rien ? (
        <Carte>
          <CorpsCarte className="pt-6">
            <EtatVide
              icone={<Presentation className="h-6 w-6" />}
              titre="Votre première formation commence ici"
              description="Une vidéo, quelques questions posées en cours de route, un quiz final : c'est tout ce qu'il faut. Vous pouvez enregistrer un brouillon incomplet et y revenir."
              action={<Creation domaines={options.domaines} />}
            />
          </CorpsCarte>
        </Carte>
      ) : (
        <div className="space-y-6">
          <ListeContenus titre="Mes formations" type="formation" lignes={contenus.formations} />
          {contenus.parcours.length ? (
            <ListeContenus titre="Mes parcours" type="parcours" lignes={contenus.parcours} />
          ) : (
            <Carte>
              <EnteteCarte
                titre="Mes parcours"
                description="Un parcours enchaîne plusieurs formations et délivre un certificat à la fin."
              />
              <CorpsCarte className="pt-0 text-[13px] text-muted-foreground">
                Vous n&apos;avez pas encore de parcours. Il en faut au moins deux formations publiées pour en composer un.
              </CorpsCarte>
            </Carte>
          )}
        </div>
      )}
    </div>
  );
}
