import { Squelette } from "@/components/ui/squelette";

export default function ChargementRapports() {
  return (
    <div aria-busy="true" aria-label="Chargement des rapports">
      <Squelette className="mb-3 h-9 w-44" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Squelette key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
