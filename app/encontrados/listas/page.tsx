import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type UploadBatch = {
  id: string;
  uploaded_by_name: string | null;
  source_name: string | null;
  source_location: string | null;
  row_count: number | null;
  created_at: string | null;
};

function shortDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function FoundListsPage() {
  const { data } = await supabaseAdmin()
    .from("upload_batches")
    .select("id, uploaded_by_name, source_name, source_location, row_count, created_at")
    .order("created_at", { ascending: false })
    .range(0, 99);
  const batches = (data || []) as UploadBatch[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="text-xs font-black uppercase text-cerca-700">Listados cargados</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Personas encontradas por listados</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Consulta lotes de hospitales, centros y voluntarios. Cada lote conserva fuente, ubicación, fecha y registros asociados para sustituir hojas Excel por búsqueda rápida.
            </p>
          </div>
          <Link href="/encontrados/subir" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cerca-600 px-4 py-3 text-sm font-black text-white">
            <UploadCloud className="h-4 w-4" />
            Subir listado
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        {!batches.length ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black">Todavía no hay listados cargados.</p>
            <p className="mt-2 text-sm text-slate-600">Sube un Excel, CSV o texto pegado para crear registros buscables.</p>
          </div>
        ) : null}
        {batches.map((batch) => (
          <Link key={batch.id} href={`/encontrados/lotes/${batch.id}`} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-black uppercase text-cerca-700">{batch.source_name || "Fuente sin nombre"}</p>
                <h2 className="text-xl font-black">{batch.source_location || "Ubicación no indicada"}</h2>
                <p className="mt-1 text-sm text-slate-600">Subido por: {batch.uploaded_by_name || "No indicado"}</p>
              </div>
              <div className="text-sm text-slate-600">
                <p>{shortDate(batch.created_at)}</p>
                <p className="text-xs text-slate-500">{relativeTime(batch.created_at)}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                <p className="text-2xl font-black">{batch.row_count ?? 0}</p>
                <p className="text-xs font-bold text-slate-500">filas leídas</p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}