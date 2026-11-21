import { Squelette } from "@/components/ui/squelette";

export default function ChargementParametres() {
  return (
    <div aria-busy="true" aria-label="Chargement des paramètres">
      <Squelette className="mb-3 h-9 w-52" />
      <Squelette className="mb-8 h-4 w-[30rem] max-w-full" />
      <div className="grid gap-6">
        <Squelette className="h-56 rounded-2xl" />
        <Squelette className="h-48 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Squelette className="h-52 rounded-2xl" />
          <Squelette className="h-52 rounded-2xl" />
          <Squelette className="h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
