import Link from "next/link";
import { ConfirmMinorTemporaryCareOtpForm } from "@/components/ConfirmMinorTemporaryCareOtpForm";
import { currentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ draft?: string; email?: string }>;

function allowed(role: string | undefined) {
  return role === "minor_caregiver" || role === "volunteer" || role === "admin";
}

export default async function ConfirmMinorCarePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await currentSession();
  const params = await searchParams;
  if (!session || !allowed(session.role)) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-black">Acceso restringido</h1>
          <p className="mt-2 text-sm text-slate-600">Debes entrar para confirmar este registro.</p>
          <Link href="/entrar" className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-black text-white">Entrar</Link>
        </section>
      </main>
    );
  }

  if (!params.draft || !params.email) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-black">Confirmación no disponible</h1>
          <p className="mt-2 text-sm text-slate-600">Vuelve a enviar el formulario para recibir un código nuevo.</p>
          <Link href="/menores/cuidado-temporal" className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-black text-white">Volver al formulario</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <ConfirmMinorTemporaryCareOtpForm draftId={params.draft} email={params.email} />
    </main>
  );
}