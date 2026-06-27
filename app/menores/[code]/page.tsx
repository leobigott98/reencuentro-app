import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import { signedEvidenceUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

type MinorRecord = {
  id: string;
  public_code: string;
  approximate_age: number | null;
  status: string;
  found_location: string | null;
  current_location: string | null;
  found_at: string | null;
  created_at: string | null;
  notes_private: string | null;
  photo_path: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Fecha no indicada";
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function MinorRestrictedDetailPage({ params }: { params: Params }) {
  const { code } = await params;
  const db = supabaseAdmin();
  const { data } = await db
    .from("found_records")
    .select("id, public_code, approximate_age, status, found_location, current_location, found_at, created_at, notes_private, photo_path")
    .eq("public_code", code)
    .in("status", ["minor_temporary_care", "minor_unaccompanied"])
    .maybeSingle();

  if (!data) notFound();
  const record = data as MinorRecord;
  const admin = await isAdmin();
  const { data: report } = admin
    ? await db
        .from("found_record_reports")
        .select("reporter_name, reporter_phone, reporter_email, caregiver_ci_number, caregiver_relationship_declared, caregiver_address_or_institution, witness_name, witness_phone, caregiver_ci_photo_path, caregiver_photo_path, minor_photo_path, handoff_notes, notes, verification_status, created_at")
        .eq("found_record_id", record.id)
        .eq("report_type", "minor_temporary_care")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const minorPhotoUrl = admin ? await signedEvidenceUrl((report as any)?.minor_photo_path || record.photo_path) : null;
  const ciPhotoUrl = admin ? await signedEvidenceUrl((report as any)?.caregiver_ci_photo_path) : null;
  const caregiverPhotoUrl = admin ? await signedEvidenceUrl((report as any)?.caregiver_photo_path) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/buscar" className="text-sm font-bold text-cerca-700">← Volver a búsqueda</Link>
      <section className="mt-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-800">Registro de alto resguardo</p>
        <h1 className="mt-3 text-3xl font-black">Menor bajo cuidado temporal registrado</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Por seguridad, esta ficha no muestra rostro, nombre, contacto privado ni dirección exacta. La información completa solo está disponible para administración.</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">Edad aproximada</dt><dd>{record.approximate_age ?? "No indicada"}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">Zona pública</dt><dd>Ubicación resguardada</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-bold text-slate-500">Fecha</dt><dd>{formatDate(record.found_at || record.created_at)}<span className="mt-1 block text-xs text-slate-500">{relativeTime(record.found_at || record.created_at)}</span></dd></div>
        </dl>
      </section>

      {admin ? (
        <section className="mt-5 rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase text-cerca-200">Admin · evidencia privada</p>
          <h2 className="mt-2 text-2xl font-black">Detalle completo de resguardo</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Ubicación actual</dt><dd>{record.current_location || "No indicada"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Lugar de hallazgo</dt><dd>{record.found_location || "No indicado"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Cuidador</dt><dd>{(report as any)?.reporter_name || "No indicado"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Teléfono</dt><dd>{(report as any)?.reporter_phone || "No indicado"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Email</dt><dd>{(report as any)?.reporter_email || "No indicado"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Cédula</dt><dd>{(report as any)?.caregiver_ci_number || "No indicada"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Relación declarada</dt><dd>{(report as any)?.caregiver_relationship_declared || "No indicada"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Dirección/institución</dt><dd>{(report as any)?.caregiver_address_or_institution || "No indicada"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Testigo</dt><dd>{(report as any)?.witness_name || "No indicado"}</dd></div>
            <div className="rounded-2xl bg-white/10 p-3"><dt className="font-bold text-slate-300">Teléfono testigo</dt><dd>{(report as any)?.witness_phone || "No indicado"}</dd></div>
          </dl>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            {minorPhotoUrl ? <a className="rounded-2xl bg-white px-4 py-3 text-center font-black text-slate-950" href={minorPhotoUrl}>Foto privada del menor</a> : null}
            {ciPhotoUrl ? <a className="rounded-2xl bg-white px-4 py-3 text-center font-black text-slate-950" href={ciPhotoUrl}>Cédula cuidador</a> : null}
            {caregiverPhotoUrl ? <a className="rounded-2xl bg-white px-4 py-3 text-center font-black text-slate-950" href={caregiverPhotoUrl}>Foto cuidador</a> : null}
          </div>
          {(report as any)?.handoff_notes || record.notes_private ? (
            <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-white/10 p-4 text-sm">{(report as any)?.handoff_notes || record.notes_private}</p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}