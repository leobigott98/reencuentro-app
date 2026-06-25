import Link from "next/link";
import { FoundListForm } from "@/components/FoundListForm";
import { FoundPersonForm } from "@/components/FoundPersonForm";

export const dynamic = "force-dynamic";

export default function UploadFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/" className="text-sm font-bold text-cerca-700">← Volver</Link>
      <h1 className="mt-4 text-3xl font-black">Reportar personas encontradas</h1>
      <p className="mt-2 text-slate-600">Útil para refugios, hospitales, vecinos o voluntarios. Para seguridad, estos casos entran como “posiblemente localizados” y deben ser verificados.</p>
      <section className="mt-5 space-y-4">
        <FoundPersonForm />
        <div className="rounded-3xl bg-slate-100 p-4 text-center text-sm font-bold text-slate-600">O carga muchas personas a la vez</div>
        <FoundListForm />
      </section>
    </main>
  );
}
