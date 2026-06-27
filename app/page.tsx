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
              Busca personas encontradas, hospitalizadas o por identificar.
            </h1>
            <p className="mt-4 max-w-3xl text-cerca-50">
              Empieza revisando registros de personas encontradas, rescatadas,
              hospitalizadas o sin identificar. Si no hay coincidencias, reporta
              la desaparición y suscríbete para recibir avisos cuando entren
              nuevos listados o registros compatibles.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <Users className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.missing_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Reportes de desaparición</p>
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <HeartHandshake className="mb-2 text-cerca-600" />
          <p className="text-3xl font-black">{stats?.found_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Registros encontrados</p>
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
          <p className="text-3xl font-black">{stats?.deceased_unidentified_count ?? 0}</p>
          <p className="text-sm font-bold text-slate-600">Fallecidas sin identificar</p>
        </div>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        <Link href="/buscar" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <Search className="mb-2 text-cerca-600" />
          <b>Búsqueda unificada</b>
          <p className="text-sm text-slate-600">
            Alterna entre personas encontradas y desaparecidas, filtrando por
            nombre, documento, ubicación, centro o estado.
          </p>
        </Link>
        <Link href="/encontrados/subir" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <ClipboardList className="mb-2 text-cerca-600" />
          <b>Registrar encontrados</b>
          <p className="text-sm text-slate-600">
            Carga una persona, CSV, XLSX, XLS o filas pegadas con fuente,
            ubicación y responsable privado.
          </p>
        </Link>
        <Link href="/mi-cuenta" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <BadgeCheck className="mb-2 text-cerca-600" />
          <b>Suscripción y confirmación</b>
          <p className="text-sm text-slate-600">
            Los reportes familiares reciben actualizaciones y futuras posibles
            coincidencias para revisión.
          </p>
        </Link>
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