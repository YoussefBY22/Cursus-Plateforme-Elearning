import { Squelette } from "@/components/ui/squelette";

export default function ChargementContenus() {
  return (
    <div aria-busy="true" aria-label="Chargement des contenus">
      <Squelette className="mb-3 h-9 w-44" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="mb-6 flex gap-2">
        <Squelette className="h-9 w-32 rounded-full" />
        <Squelette className="h-9 w-44 rounded-full" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Squelette className="h-10 min-w-[200px] flex-1 rounded-full" />
          <Squelette className="h-10 w-32 rounded-full" />
          <Squelette className="h-10 w-32 rounded-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <Squelette key={i} className="mb-3 h-10" />
        ))}
      </div>
    </div>
  );
}
