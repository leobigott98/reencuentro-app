import Link from "next/link";
import { DeceasedRegistrationForm } from "@/components/DeceasedRegistrationForm";

export const dynamic = "force-dynamic";

export default function DeceasedRegistrationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/buscar" className="text-sm font-bold text-cerca-700">← Volver a búsqueda</Link>
      <section className="mt-4 rounded-[2rem] bg-slate-950 p-5 text-white sm:p-6">
        <p className="text-xs font-black uppercase text-cerca-200">Privacidad y dignidad</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Registrar persona fallecida o por identificar</h1>
        <p className="mt-3 max-w-2xl text-slate-200">
          Este flujo es para hospitales, rescatistas, voluntarios o instituciones que necesitan dejar trazabilidad sin exponer imágenes ni información gráfica públicamente.
        </p>
      </section>
      <div className="mt-5">
        <DeceasedRegistrationForm />
      </div>
    </main>
  );
}