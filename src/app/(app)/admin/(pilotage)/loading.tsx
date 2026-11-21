import { Squelette } from "@/components/ui/squelette";

export default function ChargementPilotage() {
  return (
    <div aria-busy="true" aria-label="Chargement du tableau de bord">
      <Squelette className="mb-3 h-9 w-48" />
      <Squelette className="mb-8 h-4 w-[32rem] max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Squelette key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Squelette className="h-72 rounded-2xl" />
        <Squelette className="h-72 rounded-2xl" />
      </div>
      <Squelette className="mt-6 h-80 rounded-2xl" />
    </div>
  );
}
