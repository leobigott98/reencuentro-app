import Link from "next/link";
import { notFound } from "next/navigation";
import { SubscribeForm } from "@/components/SubscribeForm";
import { supabaseAdmin } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const MAX_BATCH_ROWS = 5000;

type UploadBatch = {
  id: string;
  uploaded_by_name: string | null;
  source_name: string | null;
  source_location: string | null;
  row_count: number | null;
  created_at: string | null;
};

type FoundRecord = {
  id: string;
  public_code: string;
  full_name: string | null;
  document_last4: string | null;
  approximate_age: number | null;
  status: string;
  sensitivity_level: string;
  current_location: string | null;
  found_location: string | null;
  source_name: string | null;
  notes_public: string | null;
  created_at: string | null;
};

function shortDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function visibleNotes(notes: string | null) {
  if (!notes) return "Sin observaciones";
  return notes.split("\n").filter(Boolean).slice(0, 4).join(" · ");
}

export default async function FoundBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();
  const [{ data: batch }, { data: foundRecords }] = await Promise.all([
    db
      .from("upload_batches")
      .select("id, uploaded_by_name, source_name, source_location, row_count, created_at")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("found_records")
      .select("id, public_code, full_name, document_last4, approximate_age, status, sensitivity_level, current_location, found_location, source_name, notes_public, created_at")
      .eq("upload_batch_id", id)
      .neq("status", "discarded")
      .order("created_at", { ascending: true })
      .range(0, MAX_BATCH_ROWS - 1),
  ]);

  if (!batch) notFound();

  const b = batch as UploadBatch;
  const records = (foundRecords || []) as FoundRecord[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/encontrados/listas" className="text-sm font-bold text-cerca-700">
        ← Volver a listados
      </Link>
      <section className="mt-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="text-xs font-black uppercase text-cerca-700">Lote cargado</p>
        <h1 className="mt-2 text-3xl font-black">{b.source_name || "Fuente sin nombre"}</h1>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <dt className="font-bold text-slate-500">Subido por</dt>
            <dd>{b.uploaded_by_name || "No indicado"}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <dt className="font-bold text-slate-500">Ubicación/fuente</dt>
            <dd>{b.source_location || "No indicada"}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <dt className="font-bold text-slate-500">Fecha</dt>
            <dd>{shortDate(b.created_at)}<span className="mt-1 block text-xs text-slate-500">{relativeTime(b.created_at)}</span></dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <dt className="font-bold text-slate-500">Filas leídas</dt>
            <dd>{b.row_count ?? records.length}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          La lista muestra datos útiles de búsqueda. Los archivos de evidencia y el contacto del responsable no se muestran públicamente.
        </p>
        <SubscribeForm subjectType="upload_batch" subjectId={b.id} title="Suscribirme a este lote" />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Registros del lote</h2>
            <p className="text-sm text-slate-600">
              {records.length} registro(s) visibles{b.row_count && b.row_count > records.length ? ` de ${b.row_count} fila(s) leídas` : ""}.
            </p>
          </div>
          <Link href="/buscar?tab=encontradas" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            Buscar en encontrados
          </Link>
        </div>
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          {!records.length ? (
            <p className="p-4 text-sm text-slate-600">Este lote no tiene registros públicos asociados.</p>
          ) : null}
          <div className="divide-y divide-slate-100">
            {records.map((record) => (
              <Link key={record.id} href={`/encontrados/${record.public_code}`} className="block p-4 hover:bg-slate-50">
                <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_1.6fr] md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-cerca-700">
                      {record.status} · {record.sensitivity_level}
                    </p>
                    <h3 className="text-base font-black">{record.full_name || "Persona por identificar"}</h3>
                    <p className="text-xs text-slate-500">
                      Edad: {record.approximate_age ?? "No indicada"} · Cédula: {record.document_last4 ? `****${record.document_last4}` : "No indicada"}
                    </p>
                  </div>
                  <div className="text-sm text-slate-700">
                    <p className="font-bold">{record.current_location || "Ubicación no indicada"}</p>
                    {record.found_location ? <p className="text-xs text-slate-500">{record.found_location}</p> : null}
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>{visibleNotes(record.notes_public)}</p>
                    <p className="mt-1 text-xs text-slate-500">Código: {record.public_code} · {relativeTime(record.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}