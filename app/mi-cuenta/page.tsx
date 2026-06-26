import Link from "next/link";
import { logout } from "@/app/actions";
import { currentSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { signedEvidenceUrl } from "@/lib/uploads";
import { PersonCase, statusLabels } from "@/lib/types";
import { OwnerStatusForm } from "@/components/OwnerStatusForm";

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const session = await currentSession();
  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-black">Mis reportes</h1>
        <p className="mt-2 text-slate-600">Entra con el correo que usaste al reportar una persona desaparecida.</p>
        <Link href="/entrar" className="mt-5 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-black text-white">Entrar con código</Link>
      </main>
    );
  }

  const db = supabaseAdmin();
  const { data: casesRaw } = await db.from("person_cases").select("*").eq("owner_email", session.email).order("updated_at", { ascending: false });
  const cases = (casesRaw || []) as PersonCase[];
  const ids = cases.map((c) => c.id);
  const { data: reportsRaw } = ids.length
    ? await db.from("case_reports").select("*").in("person_id", ids).order("created_at", { ascending: false })
    : { data: [] as any[] };
  const reports = await Promise.all((reportsRaw || []).map(async (r: any) => ({ ...r, signed_evidence_url: await signedEvidenceUrl(r.evidence_file_path) })));

  const reportsByCase = new Map<string, any[]>();
  for (const r of reports) reportsByCase.set(r.person_id, [...(reportsByCase.get(r.person_id) || []), r]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Mis reportes</h1>
          <p className="text-slate-600">{session.email}</p>
        </div>
        <form action={logout}><button className="rounded-2xl bg-slate-200 px-4 py-2 font-bold">Salir</button></form>
      </div>

      {!cases.length ? <p className="rounded-3xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">No hay reportes asociados a este correo.</p> : null}

      <div className="space-y-4">
        {cases.map((c) => {
          const caseReports = reportsByCase.get(c.id) || [];
          return (
            <article key={c.id} className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex gap-3">
                {c.photo_url ? <img src={c.photo_url} alt="" className="h-24 w-24 rounded-2xl object-cover" /> : <div className="h-24 w-24 rounded-2xl bg-slate-100" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase text-cerca-700">{statusLabels[c.status]}</p>
                  <h2 className="text-2xl font-black">{c.full_name}</h2>
                  <p className="text-sm text-slate-600">{c.current_location || c.last_seen_location}</p>
                  <Link href={`/casos/${c.public_code}`} className="mt-2 inline-flex text-sm font-bold text-cerca-700 underline">Ver ficha pública</Link>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{c.view_count || 0}</p><p className="text-sm text-slate-600">Vistas</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{c.share_count || 0}</p><p className="text-sm text-slate-600">Compartidos</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-2xl font-black">{caseReports.length}</p><p className="text-sm text-slate-600">Avisos/evidencias</p></div>
              </div>

              <OwnerStatusForm personId={c.id} />

              <section className="mt-4">
                <h3 className="font-black">Información recibida</h3>
                <div className="mt-2 space-y-2">
                  {!caseReports.length ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Aún no hay avisos privados para este caso.</p> : null}
                  {caseReports.map((r: any) => (
                    <div key={r.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <p className="font-black">{r.report_type} · {r.verification_status}</p>
                      <p><b>Ubicación:</b> {r.seen_location || "—"}</p>
                      <p className="whitespace-pre-wrap"><b>Notas:</b> {r.notes || "—"}</p>
                      {r.signed_evidence_url ? <a href={r.signed_evidence_url} className="font-bold text-cerca-700 underline">Ver foto/evidencia privada</a> : null}
                    </div>
                  ))}
                </div>
              </section>
            </article>
          );
        })}
      </div>
    </main>
  );
}

