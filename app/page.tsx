import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  FileSearch,
  HandHeart,
  HeartHandshake,
  Hospital,
  Network,
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
              Red comunitaria trazable · Coincidencias sugeridas · Confirmación familiar
            </p>
            <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
              Registrar personas encontradas, por identificar, hospitalizadas,
              fallecidas y desaparecidas en una sola red verificable.
            </h1>
            <p className="mt-4 max-w-3xl text-cerca-50">
              CERCA Reencuentro conecta reportes familiares, listados de centros
              y aportes comunitarios. Cada registro conserva fuente, fecha y
              responsable privado, sugiere coincidencias automáticas y deja la
              confirmación final a familia, comunidad y verificación.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
              <Link
                href="/reportar"
                className="rounded-2xl bg-white px-5 py-3 text-center font-black text-slate-950"
              >
                Reportar desaparecido/a
              </Link>
              <Link
                href="/encontrados/subir"
                className="rounded-2xl bg-cerca-500 px-5 py-3 text-center font-black text-white"
              >
                Registrar encontrado/listado
              </Link>
              <a
                href="#buscar"
                className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/25"
              >
                Buscar desaparecidos
              </a>
              <Link
                href="/voluntarios/registro"
                className="rounded-2xl bg-white/10 px-5 py-3 text-center font-black text-white ring-1 ring-white/25"
              >
                Sumarme como voluntario/a
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Network className="text-cerca-200" />
              <div>
                <p className="font-black">Flujo trazable</p>
                <p className="text-sm text-cerca-50">Registro, cotejo y confirmación</p>
              </div>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-cerca-50">
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">1</span>
                Familias y voluntarios registran reportes con contacto privado.
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">2</span>
                Listados de centros crean registros encontrados con fuente y lote.
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">3</span>
                Coincidencias por documento y datos se notifican para revisión.
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
        <Link href="/encontrados/subir" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <ClipboardList className="mb-2 text-cerca-600" />
          <b>Cargar listados trazables</b>
          <p className="text-sm text-slate-600">
            CSV, XLSX, XLS o filas pegadas crean lotes con fuente, ubicación,
            responsable privado y registros encontrados.
          </p>
        </Link>
        <Link href="/voluntario" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <HandHeart className="mb-2 text-cerca-600" />
          <b>Panel voluntario</b>
          <p className="text-sm text-slate-600">
            Sube información, revisa tus lotes y colabora sin exponer contactos
            personales públicamente.
          </p>
        </Link>
        <Link href="/mi-cuenta" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <BadgeCheck className="mb-2 text-cerca-600" />
          <b>Confirmación familiar</b>
          <p className="text-sm text-slate-600">
            Las coincidencias sugeridas no cierran casos solas; familiares,
            comunidad y moderación verifican cambios sensibles.
          </p>
        </Link>
      </section>

      <section id="buscar" className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Buscar reportes de desaparición</h2>
            <p className="text-sm text-slate-600">
              Los registros encontrados se enlazan desde coincidencias y lotes; esta búsqueda conserva el flujo público de casos familiares.
            </p>
          </div>
          <Link href="/sobrevivientes" className="text-sm font-black text-cerca-700">
            Buscar sobrevivientes
          </Link>
        </div>
        <form className="mb-4 grid gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1fr_auto_auto]">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o apellido"
              className="w-full border-0 focus:ring-0"
            />
          </div>
          <select name="estado" defaultValue={params.estado || ""} className="border-0 focus:ring-0">
            <option value="">Todos</option>
            <option value="missing">Aún sin contacto</option>
            <option value="possibly_found">Posiblemente localizado/a</option>
            <option value="verifying_location">En verificación</option>
            <option value="located">Localizada</option>
            <option value="safe">A salvo</option>
            <option value="hospitalized">Hospitalizada</option>
            <option value="found_alive">Localizado/a con vida</option>
            <option value="reunified">Reunificado/a</option>
          </select>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Buscar</button>
        </form>
        <InfiniteCases initialCases={cases} initialQ={q} initialStatus={params.estado || ""} />
      </section>
    </main>
  );
}