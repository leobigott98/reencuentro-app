import Link from "next/link";
import { deleteAidResource, logout, markReportReviewed, updateCaseStatus, updateContentFlagStatus } from "@/app/actions";
import { AidResourceForm } from "@/components/AidResourceForm";
import { SurvivorImportForm } from "@/components/SurvivorImportForm";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { AidResource, aidKindLabels, PersonCase, statusLabels } from "@/lib/types";
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

function relatedRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginRequired />;
  const db = supabaseAdmin();
  const [{ data: cases }, { data: rawReports }, { data: aidResources }, { data: possibleMatches }, { data: rawMinorReports }, { data: rawDeceasedReports }] = await Promise.all([
    db.from("person_cases").select("*").order("updated_at", { ascending: false }).limit(100),
    db.from("case_reports").select("*, person_cases(full_name, public_code, owner_email)").order("created_at", { ascending: false }).limit(100),
    db.from("aid_resources").select("*").eq("is_published", true).order("updated_at", { ascending: false }).limit(100),
    db
      .from("possible_matches")
      .select("id, match_type, score, status, created_at, person_cases(full_name, public_code), found_records(full_name, public_code, current_location, source_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("found_record_reports")
      .select("id, found_record_id, reporter_name, reporter_phone, reporter_email, caregiver_ci_number, caregiver_relationship_declared, caregiver_address_or_institution, witness_name, witness_phone, caregiver_ci_photo_path, caregiver_photo_path, minor_photo_path, handoff_notes, notes, verification_status, created_at, found_records(public_code, approximate_age, status, current_location, found_location)")
      .eq("report_type", "minor_temporary_care")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("found_record_reports")
      .select("id, found_record_id, reporter_name, reporter_phone, reporter_email, source_name, location, notes, evidence_file_path, verification_status, created_at, found_records(public_code, approximate_age, apparent_gender, status, current_location, found_location, photo_path)")
      .eq("report_type", "deceased_record")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const reports = await Promise.all((rawReports || []).map(async (r: any) => ({ ...r, signed_evidence_url: await signedEvidenceUrl(r.evidence_file_path) })));
  const minorReports = await Promise.all((rawMinorReports || []).map(async (r: any) => ({
    ...r,
    minor_photo_url: await signedEvidenceUrl(r.minor_photo_path),
    caregiver_ci_photo_url: await signedEvidenceUrl(r.caregiver_ci_photo_path),
    caregiver_photo_url: await signedEvidenceUrl(r.caregiver_photo_path),
  })));
  const deceasedReports = await Promise.all((rawDeceasedReports || []).map(async (r: any) => {
    const found = relatedRow(r.found_records) as any;
    return {
      ...r,
      signed_evidence_url: await signedEvidenceUrl(r.evidence_file_path),
      signed_photo_url: await signedEvidenceUrl(found?.photo_path),
    };
  }));
  const minorRecordIds = minorReports.map((r: any) => r.found_record_id).filter(Boolean);
  const deceasedRecordIds = deceasedReports.map((r: any) => r.found_record_id).filter(Boolean);
  const auditedRecordIds = [...minorRecordIds, ...deceasedRecordIds];
  const { data: auditLogs } = auditedRecordIds.length
    ? await db
        .from("audit_logs")
        .select("id, actor_email, action, subject_id, metadata, created_at")
        .in("subject_id", auditedRecordIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };
  const { data: contentFlags } = await db
    .from("content_flags")
    .select("id, subject_type, subject_id, reporter_email, reason, notes, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Panel de verificación</h1><p className="text-slate-600">Casos, posibles coincidencias, avisos privados e información pública de ayuda.</p></div>
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
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Menores bajo cuidado temporal</h2>
            <p className="text-sm text-slate-600">Registros restringidos con evidencia privada y trazabilidad del cuidador.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{minorReports.length}</span>
        </div>
        <div className="grid gap-3">
          {!minorReports.length ? (
            <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">No hay registros restringidos de menores.</p>
          ) : null}
          {minorReports.map((r: any) => {
            const found = relatedRow(r.found_records) as any;
            return (
              <article key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-amber-700">{found?.status || "minor_temporary_care"} · {r.verification_status}</p>
                    <h3 className="text-lg font-black">Menor bajo cuidado temporal</h3>
                    <p className="text-sm text-slate-600">Edad aprox.: {found?.approximate_age ?? "No indicada"} · Código: {found?.public_code || "-"}</p>
                  </div>
                  {found?.public_code ? <Link className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold" href={`/menores/${found.public_code}`}>Abrir detalle</Link> : null}
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p><b>Cuidador:</b> {r.reporter_name}</p>
                  <p><b>Teléfono:</b> {r.reporter_phone}</p>
                  <p><b>Email:</b> {r.reporter_email || "-"}</p>
                  <p><b>Cédula:</b> {r.caregiver_ci_number || "-"}</p>
                  <p><b>Relación:</b> {r.caregiver_relationship_declared || "-"}</p>
                  <p><b>Dirección/institución:</b> {r.caregiver_address_or_institution || "-"}</p>
                  <p><b>Testigo:</b> {r.witness_name || "-"}</p>
                  <p><b>Teléfono testigo:</b> {r.witness_phone || "-"}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm">{r.handoff_notes || r.notes || "Sin notas"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {r.minor_photo_url ? <a className="rounded-2xl bg-slate-950 px-3 py-2 font-bold text-white" href={r.minor_photo_url}>Foto menor</a> : null}
                  {r.caregiver_ci_photo_url ? <a className="rounded-2xl bg-slate-950 px-3 py-2 font-bold text-white" href={r.caregiver_ci_photo_url}>Cédula cuidador</a> : null}
                  {r.caregiver_photo_url ? <a className="rounded-2xl bg-slate-950 px-3 py-2 font-bold text-white" href={r.caregiver_photo_url}>Foto cuidador</a> : null}
                </div>
              </article>
            );
          })}
        </div>
        {auditLogs?.length ? (
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-black">Auditoría reciente</h3>
            <div className="mt-3 grid gap-2 text-xs text-slate-600">
              {auditLogs.map((log: any) => (
                <p key={log.id} className="rounded-2xl bg-slate-50 p-3">
                  <b>{log.action}</b> · {log.actor_email || "sin actor"} · {new Date(log.created_at).toLocaleString("es-VE")}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Fallecidos por identificar</h2>
            <p className="text-sm text-slate-600">Registros de alto resguardo con foto/evidencia privada y revisión administrativa.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{deceasedReports.length}</span>
        </div>
        <div className="grid gap-3">
          {!deceasedReports.length ? (
            <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">No hay registros de fallecidos pendientes.</p>
          ) : null}
          {deceasedReports.map((r: any) => {
            const found = relatedRow(r.found_records) as any;
            return (
              <article key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-amber-700">{found?.status || "deceased_unidentified"} · {r.verification_status}</p>
                    <h3 className="text-lg font-black">Registro fallecido de alto resguardo</h3>
                    <p className="text-sm text-slate-600">Código: {found?.public_code || "-"} · Edad aprox.: {found?.approximate_age ?? "No indicada"}</p>
                  </div>
                  {found?.public_code ? <Link className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold" href={`/encontrados/${found.public_code}`}>Abrir ficha pública</Link> : null}
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p><b>Fuente:</b> {r.source_name || "-"}</p>
                  <p><b>Reportante:</b> {r.reporter_name}</p>
                  <p><b>Teléfono privado:</b> {r.reporter_phone}</p>
                  <p><b>Email:</b> {r.reporter_email || "-"}</p>
                  <p><b>Recuperación:</b> {found?.found_location || "-"}</p>
                  <p><b>Institución/resguardo:</b> {found?.current_location || r.location || "-"}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm">{r.notes || "Sin notas privadas"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {r.signed_photo_url ? <a className="rounded-2xl bg-slate-950 px-3 py-2 font-bold text-white" href={r.signed_photo_url}>Foto privada</a> : null}
                  {r.signed_evidence_url ? <a className="rounded-2xl bg-slate-950 px-3 py-2 font-bold text-white" href={r.signed_evidence_url}>Evidencia privada</a> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Reportes de problema abiertos</h2>
            <p className="text-sm text-slate-600">Señales comunitarias sobre datos falsos, sensibles, duplicados o inapropiados.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{(contentFlags || []).length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {!(contentFlags || []).length ? (
            <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200 sm:col-span-2">No hay reportes comunitarios abiertos.</p>
          ) : null}
          {(contentFlags || []).map((flag: any) => (
            <article key={flag.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-800">{flag.reason}</p>
                <p className="text-xs text-slate-500">{new Date(flag.created_at).toLocaleString("es-VE")}</p>
              </div>
              <p className="mt-3 text-sm"><b>{flag.subject_type}</b> · {flag.subject_id}</p>
              <p className="mt-1 text-sm text-slate-600">Reportante: {flag.reporter_email || "anónimo"}</p>
              {flag.notes ? <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm">{flag.notes}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={updateContentFlagStatus}>
                  <input type="hidden" name="id" value={flag.id} />
                  <input type="hidden" name="status" value="closed" />
                  <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold">Cerrar</button>
                </form>
                <form action={updateContentFlagStatus}>
                  <input type="hidden" name="id" value={flag.id} />
                  <input type="hidden" name="status" value="confirmed" />
                  <button className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-bold text-white">Confirmar abuso</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Posibles coincidencias</h2>
            <p className="text-sm text-slate-600">Coincidencias no faciales creadas por documento, últimos 4 dígitos, nombre y ubicación.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{(possibleMatches || []).length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {!(possibleMatches || []).length ? (
            <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200 sm:col-span-2">Todavía no hay posibles coincidencias.</p>
          ) : null}
          {(possibleMatches || []).map((match: any) => {
            const missing = relatedRow(match.person_cases) as any;
            const found = relatedRow(match.found_records) as any;
            return (
              <article key={match.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-800">{match.match_type}</p>
                  <p className="text-xs font-black text-slate-500">Score {Number(match.score || 0).toFixed(2)} · {match.status}</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <Link href={`/casos/${missing?.public_code}`} className="font-black underline">Desaparecido: {missing?.full_name || "Caso"}</Link>
                  <Link href={`/encontrados/${found?.public_code}`} className="font-black underline">Encontrado: {found?.full_name || "Persona por identificar"}</Link>
                  <p className="text-slate-600">{found?.current_location || found?.source_name || "Ubicación no indicada"}</p>
                </div>
              </article>
            );
          })}
        </div>
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
                  <p className="text-xs text-slate-500">Dueño del caso: {r.person_cases?.owner_email || "-"}</p>
                </div>
                <a className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold" href={`/casos/${r.person_cases?.public_code}`}>Abrir ficha</a>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p><b>Reportante:</b> {r.reporter_name}</p>
                <p><b>Teléfono privado:</b> {r.reporter_phone}</p>
                <p><b>Email:</b> {r.reporter_email || "-"}</p>
                <p><b>Ubicación reportada:</b> {r.seen_location || "-"}</p>
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
