import { Squelette } from "@/components/ui/squelette";

export default function ChargementNouvelleFormation() {
  return (
    <div aria-busy="true" aria-label="Chargement du formulaire">
      <Squelette className="mb-3 h-4 w-40" />
      <Squelette className="mb-3 h-9 w-80 max-w-full" />
      <Squelette className="mb-8 h-4 w-[34rem] max-w-full" />
      <div className="grid max-w-4xl gap-6">
        <Squelette className="h-72 rounded-2xl" />
        <Squelette className="h-48 rounded-2xl" />
        <Squelette className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
