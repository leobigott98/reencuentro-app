import Link from "next/link";
import { logout } from "@/app/actions";
import { requireVolunteerOrAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type VolunteerProfile = {
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  organization_name: string | null;
  center_name: string | null;
  zone: string | null;
  verification_status: string | null;
  trust_score: number | null;
  created_at: string | null;
};

type FoundRecord = {
  id: string;
  public_code: string;
  full_name: string | null;
  status: string;
  sensitivity_level: string;
  found_location: string | null;
  current_location: string | null;
  source_name: string | null;
  created_at: string | null;
};

type UploadBatch = {
  id: string;
  source_name: string | null;
  source_location: string | null;
  row_count: number | null;
  created_at: string | null;
};

type RelatedMissing = { full_name: string | null; public_code: string };
type RelatedFound = { full_name: string | null; public_code: string; current_location: string | null };

type PossibleMatch = {
  id: string;
  match_type: string;
  score: number | null;
  status: string;
  person_cases: RelatedMissing | RelatedMissing[] | null;
  found_records: RelatedFound | RelatedFound[] | null;
};

function relatedRow<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value || null;
}

function shortDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function LoginRequired() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-black">Panel voluntario</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entra con el correo registrado como voluntario/a o administrador.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href="/entrar" className="rounded-2xl bg-cerca-600 px-5 py-3 text-center font-black text-white">
            Entrar con código
          </Link>
          <Link href="/voluntarios/registro" className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-black text-slate-800">
            Registrarme
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function VolunteerDashboardPage() {
  const session = await requireVolunteerOrAdmin().catch(() => null);
  if (!session) return <LoginRequired />;

  const db = supabaseAdmin();
  const [{ data: profile }, { data: foundRecords }, { data: uploadBatches }] = await Promise.all([
    db
      .from("volunteer_profiles")
      .select("email, full_name, phone, role, organization_name, center_name, zone, verification_status, trust_score, created_at")
      .eq("email", session.email)
      .maybeSingle(),
    db
      .from("found_records")
      .select("id, public_code, full_name, status, sensitivity_level, found_location, current_location, source_name, created_at")
      .eq("created_by_email", session.email)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("upload_batches")
      .select("id, source_name, source_location, row_count, created_at")
      .eq("uploaded_by_email", session.email)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const volunteerProfile = profile as VolunteerProfile | null;
  const records = (foundRecords || []) as FoundRecord[];
  const batches = (uploadBatches || []) as UploadBatch[];
  const recordIds = records.map((record) => record.id);
  const { data: possibleMatches } = recordIds.length
    ? await db
        .from("possible_matches")
        .select("id, match_type, score, status, person_cases(full_name, public_code), found_records(full_name, public_code, current_location)")
        .in("found_record_id", recordIds)
        .order("created_at", { ascending: false })
        .limit(25)
    : { data: [] };
  const matches = (possibleMatches || []) as PossibleMatch[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-cerca-700">Panel voluntario</p>
          <h1 className="text-3xl font-black">{volunteerProfile?.full_name || "Acceso administrador"}</h1>
          <p className="text-slate-600">{session.email}</p>
        </div>
        <form action={logout}>
          <button className="rounded-2xl bg-slate-200 px-4 py-2 font-bold">Salir</button>
        </form>
      </div>

      <section className="mb-5 rounded-3xl bg-cerca-50 p-4 text-sm text-cerca-950 ring-1 ring-cerca-100 sm:p-5">
        <p className="font-black">Perfil auto-registrado</p>
        <p className="mt-1">
          Puedes ayudar a subir información, listados y referencias de centros.
          Los datos cargados desde perfiles auto-registrados pueden quedar como
          no verificados hasta revisión de coordinación o administración.
        </p>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/encontrados/subir" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="font-black">Subir información</p>
          <p className="mt-1 text-sm text-slate-600">Reporta una persona encontrada o carga un listado.</p>
        </Link>
        <Link href="/encontrados/listas" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="font-black">Listas cargadas</p>
          <p className="mt-1 text-sm text-slate-600">Revisa listados y registros asociados a cargas.</p>
        </Link>
        <Link href="/menores/cuidado-temporal" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="font-black">Menores en cuidado temporal</p>
          <p className="mt-1 text-sm text-slate-600">Registra un menor bajo cuidado temporal con evidencia privada y OTP.</p>
        </Link>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <h2 className="text-xl font-black">Perfil</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="font-bold text-slate-500">Rol</dt><dd className="font-black text-slate-900">{volunteerProfile?.role || session.role}</dd></div>
            <div><dt className="font-bold text-slate-500">Estado</dt><dd>{volunteerProfile?.verification_status || "admin"}</dd></div>
            <div><dt className="font-bold text-slate-500">Zona</dt><dd>{volunteerProfile?.zone || "No indicada"}</dd></div>
            <div><dt className="font-bold text-slate-500">Teléfono</dt><dd>{volunteerProfile?.phone || "No indicado"}</dd></div>
            <div><dt className="font-bold text-slate-500">Organización</dt><dd>{volunteerProfile?.organization_name || "Independiente"}</dd></div>
            <div><dt className="font-bold text-slate-500">Centro</dt><dd>{volunteerProfile?.center_name || "No indicado"}</dd></div>
            <div><dt className="font-bold text-slate-500">Puntaje de confianza</dt><dd>{volunteerProfile?.trust_score ?? 0}</dd></div>
          </dl>
        </aside>

        <div className="grid gap-4">
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Posibles coincidencias</h2>
                <p className="text-sm text-slate-600">Coincidencias sugeridas para registros que subiste. No confirman identidad.</p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{matches.length}</span>
            </div>
            <div className="grid gap-3">
              {!matches.length ? (
                <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">Todavía no hay posibles coincidencias asociadas a tus registros.</p>
              ) : null}
              {matches.map((match) => {
                const missing = relatedRow(match.person_cases);
                const found = relatedRow(match.found_records);
                return (
                  <article key={match.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-800">{match.match_type}</p>
                      <p className="text-xs font-black text-slate-500">Score {Number(match.score || 0).toFixed(2)} · {match.status}</p>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm">
                      <Link href={`/casos/${missing?.public_code}`} className="font-black underline">Desaparecido: {missing?.full_name || "Caso"}</Link>
                      <Link href={`/encontrados/${found?.public_code}`} className="font-black underline">Encontrado: {found?.full_name || "Persona por identificar"}</Link>
                      <p className="text-slate-600">{found?.current_location || "Ubicación no indicada"}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Registros creados</h2>
                <p className="text-sm text-slate-600">Personas encontradas asociadas a tu correo.</p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{records.length}</span>
            </div>
            <div className="grid gap-3">
              {!records.length ? (
                <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">Todavía no hay registros creados por este correo.</p>
              ) : null}
              {records.map((record) => (
                <article key={record.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-cerca-700">{record.status} · {record.sensitivity_level}</p>
                      <h3 className="text-lg font-black">{record.full_name || "Sin identificar"}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-500">{shortDate(record.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{record.current_location || record.found_location || "Sin ubicación"}</p>
                  <p className="mt-1 text-xs text-slate-500">Fuente: {record.source_name || "No indicada"} · Código: {record.public_code}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Lotes cargados</h2>
                <p className="text-sm text-slate-600">Cargas masivas asociadas a tu correo.</p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{batches.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {!batches.length ? (
                <p className="rounded-3xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200 sm:col-span-2">Todavía no hay lotes cargados por este correo.</p>
              ) : null}
              {batches.map((batch) => (
                <Link key={batch.id} href={`/encontrados/lotes/${batch.id}`} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-black uppercase text-cerca-700">{shortDate(batch.created_at)}</p>
                  <h3 className="font-black">{batch.source_name || "Fuente sin nombre"}</h3>
                  <p className="text-sm text-slate-600">{batch.source_location || "Sin ubicación"}</p>
                  <p className="mt-2 text-2xl font-black">{batch.row_count || 0}</p>
                  <p className="text-xs font-bold text-slate-500">filas</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}