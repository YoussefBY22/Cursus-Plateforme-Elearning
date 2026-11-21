import { Squelette } from "@/components/ui/squelette";

export default function ChargementMaJe() {
  return (
    <div aria-busy="true" aria-label="Chargement de l'espace RH">
      <Squelette className="mb-3 h-9 w-72 max-w-full" />
      <Squelette className="mb-7 h-4 w-[32rem] max-w-full" />
      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Squelette key={i} className="h-9 w-32 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-6">
        <Squelette className="h-40 rounded-2xl" />
        <Squelette className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
