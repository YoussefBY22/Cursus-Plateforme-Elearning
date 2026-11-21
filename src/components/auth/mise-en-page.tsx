import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * Écrans d'accès : à gauche, ce que la plateforme promet — la carte joueur
 * qui se dessine ; à droite, le formulaire. Sur mobile, seule la carte
 * réduite reste au-dessus du formulaire.
 */
export function MiseEnPageAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-nuit text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Motif />
        <Link href="/" className="relative text-[22px]">
          <Logo clair />
        </Link>
        <div className="relative max-w-lg">
          <CarteDemo />
          {/* Accroche de marque : le titre de la page est celui du
              formulaire, à droite. Deux h1 sur un écran désorientent un
              lecteur d'écran. */}
          <p className="titre-page mt-10 text-[44px]">
            Formez-vous.
            <br />
            Mesurez-vous.
            <br />
            Passez au niveau suivant.
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
            Des formations vidéo, des quiz qui ancrent ce que vous apprenez, et un profil de compétences qui suit
            votre vraie progression.
          </p>
        </div>
        <p className="relative text-xs text-white/45">Plateforme de formation en ligne</p>
      </section>
      <section className="flex flex-col px-5 py-8 sm:px-10 lg:justify-center lg:px-16">
        <Link href="/" className="mb-10 text-[20px] lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </section>
    </div>
  );
}

function Motif() {
  return (
    <svg aria-hidden className="absolute -right-40 -top-40 h-[640px] w-[640px] opacity-[0.07]" viewBox="0 0 200 200">
      {[90, 72, 54, 36].map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: 6 })
            .map((_, i) => {
              const a = (Math.PI / 3) * i - Math.PI / 2;
              return `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
            })
            .join(" ")}
          fill="none"
          stroke="white"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}

/** Carte joueur de démonstration : le radar se trace à l'ouverture. */
function CarteDemo() {
  const axes = ["Négo.", "Marketing", "Finance", "Gestion", "Digital", "Oral"];
  const valeurs = [0.82, 0.64, 0.48, 0.72, 0.58, 0.88];
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [60 + 46 * v * Math.cos(a), 60 + 46 * v * Math.sin(a)];
  };
  const poly = valeurs.map((v, i) => pt(i, v).join(",")).join(" ");
  return (
    <div className="flex w-fit items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 pr-7">
      <div className="text-center">
        <p className="chiffres text-[56px] font-black leading-none">74</p>
        <p className="mt-1 text-[12px] font-bold text-[#ff5a66]">Note générale</p>
      </div>
      <svg viewBox="0 0 120 120" className="h-36 w-36" aria-hidden>
        {[1, 0.66, 0.33].map((k) => (
          <polygon
            key={k}
            points={axes.map((_, i) => pt(i, k).join(",")).join(" ")}
            fill="none"
            stroke="white"
            strokeOpacity="0.15"
          />
        ))}
        <polygon
          points={poly}
          fill="#4f46e5"
          fillOpacity="0.28"
          stroke="#ff4655"
          strokeWidth="1.6"
          strokeLinejoin="round"
          style={{ strokeDasharray: 320, ["--longueur" as string]: 320, animation: "trace 1.6s cubic-bezier(0.16,1,0.3,1) both" }}
        />
        {axes.map((a, i) => {
          const [x, y] = pt(i, 1.22);
          return (
            <text key={a} x={x} y={y} fill="white" fillOpacity="0.6" fontSize="7" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
              {a}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
