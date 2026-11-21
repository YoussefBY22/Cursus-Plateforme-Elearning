import { Squelette } from "@/components/ui/squelette";

export default function Chargement() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <Squelette className="mb-3 h-9 w-44" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <Squelette className="mb-5 h-11 rounded-full" />
      <div className="grid grid-cols-2 gap-4 min-[520px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Squelette key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
