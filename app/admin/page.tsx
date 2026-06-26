import Link from "next/link";
import { deleteAidResource, logout, markReportReviewed, updateCaseStatus } from "@/app/actions";
import { AidResourceForm } from "@/components/AidResourceForm";
import { SurvivorImportForm } from "@/components/SurvivorImportForm";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AidResource, aidKindLabels, CaseStatus, PersonCase, statusLabels } from "@/lib/types";
import { signedEvidenceUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

function LoginRequired() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-black">Admin</h1>
        <p className="mt-2 text-sm text-slate-600">El acceso admin ahora usa OTP por correo. Entra con un correo incluido en ADMIN_EMAILS.</p>
        <Link href="/entrar" className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-black text-white">Entrar con código</Link>
      </div>
    </main>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginRequired />;
  const db = supabaseAdmin();
  const [{ data: cases }, { data: rawReports }, { data: aidResources }] = await Promise.all([
    db.from("person_cases").select("*").order("updated_at", { ascending: false }).limit(100),
    db.from("case_reports").select("*, person_cases(full_name, public_code, owner_email)").order("created_at", { ascending: false }).limit(100),
    db.from("aid_resources").select("*").eq("is_published", true).order("updated_at", { ascending: false }).limit(100)
  ]);
  const reports = await Promise.all((rawReports || []).map(async (r: any) => ({ ...r, signed_evidence_url: await signedEvidenceUrl(r.evidence_file_path) })));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Panel de verificación</h1><p className="text-slate-600">Casos, avisos privados e información pública de ayuda.</p></div>
        <form action={logout}><button className="rounded-2xl bg-slate-200 px-4 py-2 font-bold">Salir</button></form>
      </div>

      <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_420px]">
        <div>
          <h2 className="mb-3 text-xl font-black">Casos</h2>
          <div className="grid gap-3">
            {((cases || []) as PersonCase[]).map((c) => (
              <div key={c.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex gap-3">
                  {c.photo_url ? <img src={c.photo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="h-20 w-20 rounded-2xl bg-slate-100" />}
                  <div className="min-w-0 flex-1">
                    <a href={`/casos/${c.public_code}`} className="font-black underline">{c.full_name}</a>
                    <p className="text-sm text-slate-600">{statusLabels[c.status]}</p>
                    <p className="truncate text-sm text-slate-500">{c.last_seen_location}</p>
                    <p className="text-xs text-slate-500">Vistas: {c.view_count || 0} · Compartidos: {c.share_count || 0}</p>
                  </div>
                </div>
                <form action={updateCaseStatus} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="status" defaultValue={c.status}>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input name="note" placeholder="Nota de validación" />
                  <button className="rounded-2xl bg-cerca-600 px-4 py-2 font-bold text-white">Actualizar</button>
                </form>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4"><AidResourceForm /><SurvivorImportForm /></div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-black">Información pública de ayuda</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {((aidResources || []) as AidResource[]).map((r) => (
            <article key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase text-cerca-700">{aidKindLabels[r.kind]}</p>
              <h3 className="font-black">{r.title}</h3>
              <p className="text-sm text-slate-600">{r.location || "Sin ubicación"}</p>
              <form action={deleteAidResource} className="mt-2"><input type="hidden" name="id" value={r.id} /><button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold">Ocultar</button></form>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-black">Reportes y avisos recibidos</h2>
        <div className="space-y-3">
          {(reports || []).map((r: any) => (
            <article key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-cerca-700">{r.report_type} · {r.verification_status}</p>
                  <h3 className="text-lg font-black">{r.person_cases?.full_name || "Caso"}</h3>
                  <p className="text-xs text-slate-500">Dueño del caso: {r.person_cases?.owner_email || "—"}</p>
                </div>
                <a className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold" href={`/casos/${r.person_cases?.public_code}`}>Abrir ficha</a>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p><b>Reportante:</b> {r.reporter_name}</p>
                <p><b>Teléfono privado:</b> {r.reporter_phone}</p>
                <p><b>Email:</b> {r.reporter_email || "—"}</p>
                <p><b>Ubicación reportada:</b> {r.seen_location || "—"}</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm">{r.notes || "Sin notas"}</p>
              {r.evidence_url ? <a className="mt-2 block text-sm font-bold text-cerca-700 underline" href={r.evidence_url}>Ver evidencia externa</a> : null}
              {r.signed_evidence_url ? <a className="mt-2 block text-sm font-bold text-cerca-700 underline" href={r.signed_evidence_url}>Ver foto/evidencia privada</a> : null}
              <form action={markReportReviewed} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select name="verification_status" defaultValue={r.verification_status}>
                  <option value="pending">Pendiente</option>
                  <option value="reviewing">En revisión</option>
                  <option value="verified">Verificado</option>
                  <option value="rejected">Descartado</option>
                </select>
                <button className="rounded-2xl bg-slate-950 px-4 py-2 font-bold text-white">Guardar</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}