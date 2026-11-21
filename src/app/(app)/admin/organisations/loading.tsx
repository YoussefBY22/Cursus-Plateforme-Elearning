import { Squelette } from "@/components/ui/squelette";

export default function ChargementJE() {
  return (
    <div aria-busy="true" aria-label="Chargement des organisations">
      <Squelette className="mb-3 h-9 w-72" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Squelette key={i} className="h-60 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
