import { Squelette } from "@/components/ui/squelette";

export default function ChargementUtilisateurs() {
  return (
    <div aria-busy="true" aria-label="Chargement des comptes">
      <Squelette className="mb-3 h-9 w-64" />
      <Squelette className="mb-8 h-4 w-[28rem] max-w-full" />
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Squelette className="h-10 min-w-[200px] flex-1 rounded-full" />
          <Squelette className="h-10 w-32 rounded-full" />
          <Squelette className="h-10 w-32 rounded-full" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/60 py-3">
            <Squelette className="h-8 w-8 rounded-full" />
            <Squelette className="h-4 w-40" />
            <Squelette className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
