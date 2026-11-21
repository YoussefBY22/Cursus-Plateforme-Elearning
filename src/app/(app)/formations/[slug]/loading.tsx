import { Squelette } from "@/components/ui/squelette";

export default function ChargementFormation() {
  return (
    <div aria-busy="true" aria-label="Chargement de la formation">
      <Squelette className="mb-3 h-4 w-24" />
      <Squelette className="mb-3 h-9 w-[28rem] max-w-full" />
      <Squelette className="mb-7 h-4 w-[36rem] max-w-full" />
      <div className="mb-7 flex flex-wrap gap-3">
        <Squelette className="h-6 w-28 rounded-full" />
        <Squelette className="h-6 w-20 rounded-full" />
        <Squelette className="h-6 w-24 rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <Squelette className="h-4 w-48" />
              <Squelette className="h-3 w-full" />
              <Squelette className="h-3 w-5/6" />
              <Squelette className="h-3 w-2/3" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <Squelette className="h-4 w-36" />
              <Squelette className="h-3 w-full" />
              <Squelette className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
