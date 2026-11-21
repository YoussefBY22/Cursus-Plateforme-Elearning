import { Squelette } from "@/components/ui/squelette";

export default function Chargement() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <Squelette className="mb-3 h-9 w-56" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="space-y-4">
        <Squelette className="h-44 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Squelette key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
