import { Squelette } from "@/components/ui/squelette";

export default function ChargementParcours() {
  return (
    <div aria-busy="true" aria-label="Chargement des parcours">
      <Squelette className="mb-3 h-9 w-56" />
      <Squelette className="mb-8 h-4 w-[34rem] max-w-full" />
      <Squelette className="mb-4 h-4 w-28" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Squelette key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
