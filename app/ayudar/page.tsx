import Link from "next/link";
import { supabaseAnon } from "@/lib/supabase";
import { AidResource, aidKindLabels } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ tipo?: AidResource["kind"] }> }) {
  const params = await searchParams;
  const db = supabaseAnon();
  let query = db.from("public_aid_resources").select("*").order("priority", { ascending: true }).order("updated_at", { ascending: false }).limit(200);
  if (params.tipo) query = query.eq("kind", params.tipo);
  const { data } = await query;
  const resources = (data || []) as AidResource[];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <p className="text-sm font-black uppercase text-cerca-700">Ayuda verificada</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">Centros de acopio, solicitudes, contactos, noticias y tips.</h1>
        <p className="mt-3 max-w-2xl text-slate-600">El foco principal sigue siendo encontrar familiares y amigos, pero esta sección ayuda a coordinar a quienes quieren apoyar.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold" href="/ayudar">Todo</Link>
          {Object.entries(aidKindLabels).map(([k, v]) => <Link key={k} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold" href={`/ayudar?tipo=${k}`}>{v}</Link>)}
        </div>
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        {resources.map((r) => (
          <article key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs font-black uppercase text-cerca-700">{aidKindLabels[r.kind]}</p>{r.priority !== "normal" ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">{r.priority === "critical" ? "Crítico" : "Alta prioridad"}</span> : null}</div>
            <h2 className="mt-1 text-xl font-black">{r.title}</h2>
            {r.location ? <p className="mt-1 text-sm font-bold text-slate-600">{r.location}</p> : null}
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.description}</p>
            {(r.contact_name || r.contact_phone) ? <p className="mt-3 text-sm"><b>Contacto:</b> {r.contact_name || ""} {r.contact_phone || ""}</p> : null}
            {r.source_url ? <a href={r.source_url} className="mt-2 inline-flex text-sm font-bold text-cerca-700 underline" target="_blank">Ver fuente</a> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
