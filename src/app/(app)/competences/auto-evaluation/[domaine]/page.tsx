import { LienBouton } from "@/components/ui/bouton";
import { EntetePage } from "@/components/ui/entete-page";
import { EtatErreur } from "@/components/ui/etat-vide";
import { AutoEvaluation } from "@/components/competences/auto-evaluation";
import { messageErreur } from "@/lib/resultat";
import { preparerAutoEvaluation, type PreparationAutoEvaluation } from "@/server/requetes/competences";
import { exigerPermissionPage } from "@/server/session";
import { cheminRetourSur, lireContexte } from "@/services/auto-evaluation";

export const metadata = { title: "Auto-évaluation" };

/**
 * Auto-évaluation chronométrée d'un domaine.
 *
 * La page prépare côté serveur exactement ce que l'action de démarrage
 * vérifiera (domaine, questions, délai) : l'écran d'introduction ne promet
 * donc jamais une évaluation que le serveur refusera ensuite.
 */
export default async function PageAutoEvaluation({
  params,
  searchParams,
}: PageProps<"/competences/auto-evaluation/[domaine]">) {
  const u = await exigerPermissionPage("apprentissage", "lire");
  const { domaine } = await params;
  const q = await searchParams;

  const contexte = lireContexte(q.contexte);
  const formationSlug = typeof q.formation === "string" ? q.formation : null;
  const formationExterneId = typeof q.externe === "string" ? q.externe : null;
  const retour =
    cheminRetourSur(q.retour) ??
    (formationExterneId ? `/competences/externe/${formationExterneId}` : "/competences");

  let preparation: PreparationAutoEvaluation;
  try {
    preparation = await preparerAutoEvaluation(u.id, {
      domaineCode: domaine,
      contexte,
      formationSlug,
      formationExterneId,
    });
  } catch (err) {
    return (
      <div>
        <EntetePage titre="Auto-évaluation" retour={{ href: retour, libelle: "Revenir" }} />
        <EtatErreur
          titre="Cette auto-évaluation n'est pas possible"
          description={messageErreur(err, "La demande n'a pas pu être préparée.")}
          action={
            <LienBouton href="/competences" variante="contour">
              Voir mes compétences
            </LienBouton>
          }
        />
      </div>
    );
  }

  const sousTitre = preparation.externe
    ? preparation.externe.titre
    : (preparation.formation?.titre ?? null);

  return (
    <div>
      <EntetePage
        titre={`Auto-évaluation — ${preparation.domaine.nom}`}
        description={
          sousTitre
            ? `Pour la formation « ${sousTitre} ». Votre réponse d'aujourd'hui sert de point de comparaison.`
            : "Situez-vous sur chaque compétence du domaine. C'est le point de départ de votre mesure."
        }
        retour={{ href: retour, libelle: "Revenir" }}
      />
      <AutoEvaluation
        preparation={preparation}
        contexte={preparation.contexte}
        formationSlug={preparation.formation?.slug ?? null}
        formationExterneId={preparation.externe?.id ?? null}
        retour={retour}
      />
    </div>
  );
}
