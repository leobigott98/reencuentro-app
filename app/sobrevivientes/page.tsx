import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { supabaseAnon } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SurvivorRecord = {
  id: string;
  full_name: string;
  approximate_age: number | null;
  document_last4: string | null;
  hospital: string | null;
  address: string | null;
  notes: string | null;
  source_name: string | null;
  source_sheet: string | null;
  created_at: string;
};

function normalizeQuery(q: string) {
  return q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9Ñ\s]/g, " ").replace(/\s+/g, " ").trim();
}

export default async function SobrevivientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const db = supabaseAnon();

  let query = db.from("public_survivor_records").select("*").order("created_at", { ascending: false }).limit(q ? 50 : 20);
  if (q) {
    const normalized = normalizeQuery(q);
    const digits = q.replace(/\D/g, "");
    const clauses = [`full_name.ilike.%${q}%`];
    if (normalized) clauses.push(`full_name.ilike.%${normalized}%`);
    if (digits.length >= 4) clauses.push(`document_last4.eq.${digits.slice(-4)}`);
    query = query.or(clauses.join(","));
  }

  const { data } = await query;
  const records = (data || []) as SurvivorRecord[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <p className="text-sm font-black uppercase text-cerca-700">Búsqueda rápida en listados cargados</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-black">Buscar sobrevivientes y pacientes</h1><a href="/api/sobrevivientes/export" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Descargar CSV</a></div>
        <p className="mt-2 max-w-3xl text-slate-600">Busca por nombre, apellido o últimos 4 dígitos de cédula si los conoces. Los teléfonos del listado no se muestran públicamente para proteger a las familias.</p>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input name="q" defaultValue={q} placeholder="Ej. Ana Pérez, Orozco, 0952" />
          <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white"><Search className="mr-2 inline" size={18}/>Buscar</button>
        </form>
      </section>

      <section className="mt-4 rounded-3xl bg-cerca-50 p-4 text-sm text-cerca-900">
        <ShieldCheck className="mb-2" />
        <b>Importante:</b> estos listados ayudan a orientar la búsqueda, pero deben verificarse con hospital, autoridad o familiar directo. No difundas capturas con datos sensibles.
      </section>

      <section className="mt-5 space-y-3">
        {!q ? <p className="text-sm text-slate-600">Mostrando registros recientes. Para buscar rápido, escribe nombre/apellido arriba.</p> : null}
        {q && !records.length ? <p className="rounded-3xl bg-white p-5 text-slate-600 ring-1 ring-slate-200">No encontré coincidencias con “{q}”. Prueba solo apellido, sin acentos o con últimos 4 dígitos de cédula.</p> : null}
        {records.map((r) => (
          <article key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{r.full_name}</h2>
                <p className="text-sm text-slate-600">{r.approximate_age ? `${r.approximate_age} años · ` : ""}{r.hospital || "Centro no especificado"}</p>
                {r.document_last4 ? <p className="text-xs text-slate-500">Cédula/ID termina en: ****{r.document_last4}</p> : null}
              </div>
              <span className="rounded-full bg-cerca-50 px-3 py-1 text-xs font-black text-cerca-800">Listado de sobrevivientes</span>
            </div>
            {r.address ? <p className="mt-2 text-sm"><b>Dirección/zona:</b> {r.address}</p> : null}
            {r.notes ? <p className="mt-1 whitespace-pre-wrap text-sm"><b>Observaciones:</b> {r.notes}</p> : null}
            <p className="mt-3 text-xs text-slate-500">Fuente: {r.source_name || r.source_sheet || "Listado cargado"}</p>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <Link href="/" className="font-bold text-cerca-700 underline">Volver al inicio</Link>
      </div>
    </main>
  );
}
