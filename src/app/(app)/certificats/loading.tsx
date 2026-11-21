import { Squelette } from "@/components/ui/squelette";

export default function ChargementMesCertificats() {
  return (
    <div aria-busy="true" aria-label="Chargement de vos certificats">
      <Squelette className="mb-3 h-9 w-56" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="bg-muted p-6">
              <Squelette className="aspect-[297/210] w-full rounded-[3px]" />
            </div>
            <div className="space-y-3 p-5">
              <Squelette className="h-5 w-2/3" />
              <Squelette className="h-3 w-1/2" />
              <div className="flex gap-2 pt-2">
                <Squelette className="h-8 w-40 rounded-full" />
                <Squelette className="h-8 w-32 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
