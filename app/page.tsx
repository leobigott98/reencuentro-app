import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  FileSearch,
  HeartHandshake,
  Hospital,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { InfiniteCases } from "@/components/InfiniteCases";
import { supabaseAnon } from "@/lib/supabase";
import { PersonCase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const db = supabaseAnon();

  let query = db
    .from("public_person_cases")
    .select("*")
    .order("updated_at", { ascending: false })
    .range(0, 24);
  if (q) query = query.ilike("full_name", `%${q}%`);
  if (params.estado) query = query.eq("status", params.estado);

  const [{ data }, { data: stats }] = await Promise.all([
    query,
    db.from("public_case_stats").select("*").single(),
  ]);
  const cases = ((data || []).slice(0, 24)) as PersonCase[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-cerca-100">
              Buscar primero · Reportar si no aparece · Recibir futuras coincidencias
            </p>
            <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
              Encuentra personas rescatadas, hospitalizadas o por identificar.
            </h1>
            <p className="mt-4 max-w-3xl text-cerca-50">
              Empieza revisando registros de personas encontradas, rescatadas,
              hospitalizadas o sin identificar. Si no hay coincidencias, reporta
              la desaparición y suscríbete para recibir avisos cuando entren
              nuevos listados o registros compatibles.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/buscar"
                className="rounded-2xl bg-white px-5 py-3 text-center font-black text-slate-950"
              >
                Buscar persona
              </Link>
              <Link
                href="/reportar"
                className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/25"
              >
                Reportar desaparecido
              </Link>
              <Link
                href="/encontrados/subir"
                className="rounded-2xl bg-cerca-500 px-5 py-3 text-center font-black text-white"
              >
                Registrar persona encontrada
              </Link>
              <Link
                href="/voluntarios/registro"
                className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/25"
              >
                Registrarme como voluntario
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Search className="text-cerca-200" />
              <div>
                <p className="font-black">Ruta recomendada</p>
                <p className="text-sm text-cerca-50">Búsqueda antes de reporte</p>
              </div>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-cerca-50">
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">1</span>
                Busca por nombre, documento, últimos 4 dígitos, centro o zona.
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">2</span>
                Revisa primero encontrados, hospitalizados y personas por identificar.
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">3</span>
                Si no aparece, reporta la desaparición y queda pendiente de coincidencias.
              </li>
            </ol>
          </div>
        </div>
      </section>


      <section className="mt-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <form action="/buscar" className="grid gap-3 lg:grid-cols-[1fr_180px_1fr_auto]">
          <input type="hidden" name="tab" value="encontradas" />
          <div>
            <label>Nombre</label>
            <input name="name" placeholder="Nombre o apellido" />
          </div>
          <div>
            <label>Cédula</label>
            <input name="document_id" placeholder="Cédula / 1234" />
          </div>
          <div>
            <label>Centro o ubicación</label>
            <input name="location" placeholder="Hospital, refugio, zona" />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Buscar persona</button>
          </div>
        </form>
        <p className="mt-3 text-sm text-slate-600">Busca por nombre, cédula, últimos 4 dígitos, centro o zona. Primero revisamos personas encontradas, hospitalizadas o por identificar.</p>
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <Users className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.missing_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Desaparecidos reportados</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <HeartHandshake className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.found_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Personas encontradas registradas</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <FileSearch className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.unidentified_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Por identificar</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <Hospital className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.hospitalized_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Hospitalizadas</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <ShieldCheck className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.reunified_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Reunificadas</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-black">Cómo funciona</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Buscas", "Si no aparece, reportas", "Voluntarios suben encontrados/listas", "La app avisa posibles coincidencias"].map((item, index) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                <b>{item}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-black">Seguridad</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <p className="rounded-2xl bg-slate-50 p-3">Teléfonos privados</p>
            <p className="rounded-2xl bg-slate-50 p-3">Evidencia sensible restringida</p>
            <p className="rounded-2xl bg-slate-50 p-3">Menores y fallecidos con manejo especial</p>
            <p className="rounded-2xl bg-slate-50 p-3">Timestamps y fuente visible</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Reportes recientes de desaparición</h2>
            <p className="text-sm text-slate-600">
              Para buscar en encontrados, hospitalizados o por identificar, usa la búsqueda unificada.
            </p>
          </div>
          <Link href="/buscar" className="text-sm font-black text-cerca-700">
            Buscar persona
          </Link>
        </div>
        <InfiniteCases initialCases={cases} initialQ={q} initialStatus={params.estado || ""} />
      </section>
    </main>
  );
}