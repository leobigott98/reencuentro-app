import Link from "next/link";
import { MinorTemporaryCareForm } from "@/components/MinorTemporaryCareForm";
import { currentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function allowed(role: string | undefined) {
  return role === "minor_caregiver" || role === "volunteer" || role === "admin";
}

export default async function MinorTemporaryCarePage() {
  const session = await currentSession();
  if (!session || !allowed(session.role)) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase text-cerca-700">Acceso restringido</p>
          <h1 className="mt-2 text-2xl font-black">Cuidado temporal de menores</h1>
          <p className="mt-2 text-sm text-slate-600">Debes entrar como cuidador de menor, voluntario o administrador para registrar este tipo de caso.</p>
          <Link href="/entrar" className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-black text-white">Entrar con código</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <section className="mb-5 rounded-[2rem] bg-slate-950 p-5 text-white sm:p-6">
        <p className="text-xs font-black uppercase text-cerca-200">Flujo restringido</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Registrar menor bajo cuidado temporal</h1>
        <p className="mt-3 max-w-2xl text-slate-200">Este formulario protege la identidad del menor. Las fotos y documentos quedan en evidencia privada; la vista pública solo confirma que existe un registro resguardado.</p>
      </section>
      <MinorTemporaryCareForm />
    </main>
  );
}