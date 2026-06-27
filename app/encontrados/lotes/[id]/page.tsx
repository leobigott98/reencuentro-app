import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
  approximate_age: number | null;
  status: string;
  sensitivity_level: string;
  current_location: string | null;
  source_name: string | null;
  created_at: string | null;
};

function shortDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
      .select("id, public_code, full_name, approximate_age, status, sensitivity_level, current_location, source_name, created_at")
      .eq("upload_batch_id", id)
      .neq("status", "discarded")
      .order("created_at", { ascending: false }),
  ]);

  if (!batch) notFound();

  const b = batch as UploadBatch;
  const records = (foundRecords || []) as FoundRecord[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/encontrados/subir" className="text-sm font-bold text-cerca-700">
        ← Volver a encontrados
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
            <dd>{shortDate(b.created_at)}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <dt className="font-bold text-slate-500">Filas insertadas</dt>
            <dd>{b.row_count ?? records.length}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Los datos de contacto del responsable y archivos privados no se muestran públicamente.
        </p>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Registros del lote</h2>
            <p className="text-sm text-slate-600">Personas encontradas asociadas a esta carga.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
            {records.length}
          </span>
        </div>
        <div className="grid gap-3">
          {!records.length ? (
            <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Este lote no tiene registros públicos asociados.
            </p>
          ) : null}
          {records.map((record) => (
            <Link
              key={record.id}
              href={`/encontrados/${record.public_code}`}
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-cerca-700">
                    {record.status} · {record.sensitivity_level}
                  </p>
                  <h3 className="text-lg font-black">
                    {record.full_name || "Persona no identificada"}
                  </h3>
                </div>
                <p className="text-xs font-bold text-slate-500">{shortDate(record.created_at)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {record.current_location || "Ubicación no indicada"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Edad: {record.approximate_age ?? "No indicada"} · Código: {record.public_code}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}