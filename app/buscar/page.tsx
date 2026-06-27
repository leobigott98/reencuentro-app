import Link from "next/link";
import { Search } from "lucide-react";
import { PersonResultCard, PersonResultCardData } from "@/components/PersonResultCard";
import { supabaseAdmin } from "@/lib/supabase";
import { statusLabels } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchTab = "encontradas" | "desaparecidas";

type SearchParams = Promise<{
  tab?: string;
  name?: string;
  document_id?: string;
  location?: string;
  status?: string;
}>;

type FoundRecordRow = {
  id: string;
  public_code: string;
  full_name: string | null;
  document_id: string | null;
  document_last4: string | null;
  approximate_age: number | null;
  photo_url: string | null;
  status: string;
  sensitivity_level: string;
  found_location: string | null;
  current_location: string | null;
  source_name: string | null;
  created_by_name: string | null;
  found_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type MissingCaseRow = {
  id: string;
  public_code: string;
  full_name: string;
  document_id: string | null;
  document_last4: string | null;
  approximate_age: number | null;
  photo_url: string | null;
  status: keyof typeof statusLabels;
  last_seen_location: string | null;
  current_location: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const foundStatusLabels: Record<string, string> = {
  unidentified: "No identificada",
  partially_identified: "Parcialmente identificada",
  safe: "A salvo",
  hospitalized: "Hospitalizada",
  transferred: "Trasladada",
  minor_unaccompanied: "Menor sin acompañante",
  deceased_unidentified: "Fallecida no identificada",
  reunified: "Reunificada",
  released_to_family: "Con familia",
};

function norm(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeDocument(value: string) {
  return value.toUpperCase().replace(/[^0-9VEJPG]/g, "");
}

function documentLast4(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}

function matchesText(value: string | null | undefined, query: string) {
  if (!query) return true;
  return norm(value).includes(norm(query));
}

function matchesDocument(rowDoc: string | null, rowLast4: string | null, query: string) {
  if (!query) return true;
  const doc = normalizeDocument(query);
  const last4 = documentLast4(query);
  if (!doc && !last4) return true;
  return Boolean(
    (doc && normalizeDocument(rowDoc || "") === doc) ||
      (last4 && rowLast4 === last4),
  );
}

function foundBadges(row: FoundRecordRow) {
  return {
    sensitive: row.sensitivity_level === "restricted" || row.sensitivity_level === "high_risk",
    hospitalized: row.status === "hospitalized",
    deceased: row.status.includes("deceased"),
  };
}

function foundToResult(row: FoundRecordRow): PersonResultCardData {
  const badges = foundBadges(row);
  return {
    id: row.id,
    href: `/encontrados/${row.public_code}`,
    kind: "found",
    name: row.full_name,
    status: row.status,
    statusLabel: foundStatusLabels[row.status] || row.status,
    location: row.current_location || row.found_location,
    timestamp: row.found_at || row.updated_at || row.created_at,
    sourceName: row.source_name || row.created_by_name,
    hasPhoto: Boolean(row.photo_url),
    documentLast4: row.document_last4,
    ...badges,
  };
}

function missingToResult(row: MissingCaseRow): PersonResultCardData {
  return {
    id: row.id,
    href: `/casos/${row.public_code}`,
    kind: "missing",
    name: row.full_name,
    status: row.status,
    statusLabel: statusLabels[row.status] || row.status,
    location: row.current_location || row.last_seen_location,
    timestamp: row.updated_at || row.created_at,
    hasPhoto: Boolean(row.photo_url),
    documentLast4: row.document_last4,
    hospitalized: row.status === "hospitalized",
  };
}

function tabHref(tab: SearchTab, params: Awaited<SearchParams>) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  for (const key of ["name", "document_id", "location", "status"] as const) {
    if (params[key]) search.set(key, String(params[key]));
  }
  return `/buscar?${search.toString()}`;
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab: SearchTab = params.tab === "desaparecidas" ? "desaparecidas" : "encontradas";
  const name = (params.name || "").trim();
  const documentId = (params.document_id || "").trim();
  const location = (params.location || "").trim();
  const status = (params.status || "").trim();
  const hasFilters = Boolean(name || documentId || location || status);
  const db = supabaseAdmin();

  const [{ data: foundRows }, { data: missingRows }] = await Promise.all([
    db
      .from("found_records")
      .select("id, public_code, full_name, document_id, document_last4, approximate_age, photo_url, status, sensitivity_level, found_location, current_location, source_name, created_by_name, found_at, updated_at, created_at")
      .neq("status", "discarded")
      .order("updated_at", { ascending: false })
      .limit(200),
    db
      .from("person_cases")
      .select("id, public_code, full_name, document_id, document_last4, approximate_age, photo_url, status, last_seen_location, current_location, updated_at, created_at")
      .not("status", "in", "(discarded,duplicate)")
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  const foundResults = ((foundRows || []) as FoundRecordRow[])
    .filter((row) => matchesText(row.full_name, name))
    .filter((row) => matchesDocument(row.document_id, row.document_last4, documentId))
    .filter((row) =>
      location
        ? matchesText(row.current_location, location) ||
          matchesText(row.found_location, location) ||
          matchesText(row.source_name, location)
        : true,
    )
    .filter((row) => (status ? row.status === status : true))
    .slice(0, 60)
    .map(foundToResult);

  const missingResults = ((missingRows || []) as MissingCaseRow[])
    .filter((row) => matchesText(row.full_name, name))
    .filter((row) => matchesDocument(row.document_id, row.document_last4, documentId))
    .filter((row) =>
      location
        ? matchesText(row.current_location, location) ||
          matchesText(row.last_seen_location, location)
        : true,
    )
    .filter((row) => (status ? row.status === status : true))
    .slice(0, 60)
    .map(missingToResult);

  const activeResults = tab === "encontradas" ? foundResults : missingResults;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="text-xs font-black uppercase text-cerca-700">Buscar persona</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">
          Busca primero en personas encontradas, hospitalizadas o por identificar.
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Si no aparece una coincidencia, crea un reporte de desaparición y suscríbete para recibir futuros avisos cuando entren listados o registros compatibles.
        </p>
        <div className="mt-5 grid gap-3 sm:flex">
          <Link href="/reportar" className="rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white">
            Reportar desaparecido
          </Link>
          <Link href="/encontrados/subir" className="rounded-2xl bg-cerca-600 px-5 py-3 text-center font-black text-white">
            Registrar persona encontrada
          </Link>
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <div className="grid gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-2">
          <Link
            href={tabHref("encontradas", params)}
            className={`rounded-xl px-4 py-3 text-center text-sm font-black ${tab === "encontradas" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
          >
            Personas encontradas ({foundResults.length})
          </Link>
          <Link
            href={tabHref("desaparecidas", params)}
            className={`rounded-xl px-4 py-3 text-center text-sm font-black ${tab === "desaparecidas" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
          >
            Personas desaparecidas ({missingResults.length})
          </Link>
        </div>

        <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_160px_1fr_180px_auto]">
          <input type="hidden" name="tab" value={tab} />
          <div>
            <label>Nombre</label>
            <input name="name" defaultValue={name} placeholder="Nombre o apellido" />
          </div>
          <div>
            <label>Documento o últimos 4</label>
            <input name="document_id" defaultValue={documentId} placeholder="Cédula / 1234" />
          </div>
          <div>
            <label>Ubicación o centro</label>
            <input name="location" defaultValue={location} placeholder="Hospital, refugio, zona" />
          </div>
          <div>
            <label>Estado</label>
            <select name="status" defaultValue={status}>
              <option value="">Todos</option>
              {tab === "encontradas" ? (
                <>
                  <option value="unidentified">Por identificar</option>
                  <option value="partially_identified">Parcialmente identificada</option>
                  <option value="safe">A salvo</option>
                  <option value="hospitalized">Hospitalizada</option>
                  <option value="transferred">Trasladada</option>
                  <option value="minor_unaccompanied">Menor sin acompañante</option>
                  <option value="deceased_unidentified">Fallecida no identificada</option>
                </>
              ) : (
                <>
                  <option value="missing">Aún sin contacto</option>
                  <option value="possibly_found">Posiblemente localizada</option>
                  <option value="verifying_location">En verificación</option>
                  <option value="located">Localizada</option>
                  <option value="safe">A salvo</option>
                  <option value="hospitalized">Hospitalizada</option>
                  <option value="reunified">Reunificada</option>
                </>
              )}
            </select>
          </div>
          <div className="flex items-end">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white">
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </form>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">
              {tab === "encontradas" ? "Resultados encontrados" : "Reportes de desaparición"}
            </h2>
            <p className="text-sm text-slate-600">
              No se muestran teléfonos ni correos privados. Abre una ficha para enviar información o suscribirte.
            </p>
          </div>
          {hasFilters ? (
            <Link href={`/buscar?tab=${tab}`} className="text-sm font-black text-cerca-700">
              Limpiar filtros
            </Link>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeResults.map((result) => (
            <PersonResultCard key={`${result.kind}-${result.id}`} result={result} />
          ))}
        </div>
        {!activeResults.length ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black">No encontramos resultados con esos filtros.</p>
            <p className="mt-2 text-sm text-slate-600">
              Si buscas a una persona desaparecida, crea un reporte y usa la suscripción para recibir futuras coincidencias.
            </p>
            <Link href="/reportar" className="mt-4 inline-flex rounded-2xl bg-cerca-600 px-5 py-3 font-black text-white">
              Reportar desaparecido
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}