import { Squelette } from "@/components/ui/squelette";

export default function ChargementReferentiel() {
  return (
    <div aria-busy="true" aria-label="Chargement du référentiel">
      <Squelette className="mb-3 h-9 w-80 max-w-full" />
      <Squelette className="mb-8 h-4 w-[36rem] max-w-full" />
      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Squelette key={i} className="h-8 w-36 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Squelette key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
