import { Squelette } from "@/components/ui/squelette";

export default function ChargementCertificatsAdmin() {
  return (
    <div aria-busy="true" aria-label="Chargement des certificats">
      <Squelette className="mb-3 h-9 w-48" />
      <Squelette className="mb-8 h-4 w-[32rem] max-w-full" />
      <div className="mb-6 flex gap-2">
        <Squelette className="h-9 w-28 rounded-full" />
        <Squelette className="h-9 w-40 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="bg-muted/60 p-5">
              <Squelette className="aspect-[297/210] w-full rounded-[3px]" />
            </div>
            <div className="space-y-2 p-4">
              <Squelette className="h-5 w-2/3" />
              <Squelette className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
