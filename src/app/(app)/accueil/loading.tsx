import { Squelette } from "@/components/ui/squelette";

export default function ChargementAccueil() {
  return (
    <div aria-busy="true" aria-label="Chargement du tableau de bord">
      <Squelette className="mb-3 h-9 w-56" />
      <Squelette className="mb-6 h-4 w-[28rem] max-w-full" />
      <Squelette className="mb-6 h-40 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Squelette key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          <Squelette className="h-28 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Squelette key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Squelette className="h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
