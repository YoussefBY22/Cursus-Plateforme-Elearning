import { Squelette } from "@/components/ui/squelette";

export default function ChargementCatalogue() {
  return (
    <div aria-busy="true" aria-label="Chargement du catalogue">
      <Squelette className="mb-3 h-9 w-40" />
      <Squelette className="mb-8 h-4 w-[34rem] max-w-full" />
      <Squelette className="mb-6 h-24 rounded-2xl" />
      <Squelette className="mb-4 h-11 rounded-xl" />
      <div className="mb-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Squelette key={i} className="h-8 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Squelette className="h-32 rounded-none" />
            <div className="space-y-2 p-4">
              <Squelette className="h-5 w-24 rounded-full" />
              <Squelette className="h-4 w-3/4" />
              <Squelette className="h-3 w-full" />
              <Squelette className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
