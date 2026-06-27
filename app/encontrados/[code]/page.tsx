import Link from "next/link";
import { notFound } from "next/navigation";
import { FoundRecordActions } from "@/components/FoundRecordActions";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type FoundRecord = {
  id: string;
  public_code: string;
  created_by_name: string | null;
  source_name: string | null;
  full_name: string | null;
  document_last4: string | null;
  approximate_age: number | null;
  apparent_gender: string | null;
  photo_url: string | null;
  status: string;
  sensitivity_level: string;
  found_location: string | null;
  current_location: string | null;
  destination: string | null;
  notes_public: string | null;
  found_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const statusLabels: Record<string, string> = {
  unidentified: "No identificada",
  partially_identified: "Parcialmente identificada",
  safe: "A salvo",
  hospitalized: "Hospitalizada",
  transferred: "Trasladada",
  minor_unaccompanied: "Menor sin acompañante",
  deceased_unidentified: "Fallecida no identificada",
};

const genderLabels: Record<string, string> = {
  female: "Femenino",
  male: "Masculino",
  unknown: "No determinado",
};

function formatDate(value: string | null) {
  if (!value) return "No indicado";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function field(value: string | number | null | undefined) {
  return value || "No indicado";
}

export default async function FoundRecordPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { data } = await supabaseAdmin()
    .from("found_records")
    .select(
      "id, public_code, created_by_name, source_name, full_name, document_last4, approximate_age, apparent_gender, photo_url, status, sensitivity_level, found_location, current_location, destination, notes_public, found_at, created_at, updated_at",
    )
    .eq("public_code", code)
    .neq("status", "discarded")
    .maybeSingle();

  if (!data) notFound();

  const record = data as FoundRecord;
  const isHighRisk = record.sensitivity_level === "high_risk";
  const isRestricted = record.sensitivity_level === "restricted" || isHighRisk;
  const displayName = isHighRisk
    ? record.full_name
      ? "Ficha protegida"
      : "Persona no identificada"
    : record.full_name || "Persona no identificada";
  const uploader = [record.created_by_name, record.source_name]
    .filter(Boolean)
    .join(" / ");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/encontrados/subir" className="text-sm font-bold text-cerca-700">
        ← Subir o revisar encontrados
      </Link>
      {isRestricted ? (
        <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
          <p className="font-black">Ficha con información sensible</p>
          <p className="mt-1">
            Este registro está marcado como {record.sensitivity_level}. La
            información pública se limita para proteger a la persona y evitar
            exposición de datos privados.
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          {record.photo_url && !isHighRisk ? (
            <img
              src={record.photo_url}
              alt=""
              className="mb-4 max-h-[520px] w-full rounded-3xl object-cover"
            />
          ) : null}
          <p className="inline-flex rounded-full bg-cerca-50 px-3 py-1 text-sm font-black text-cerca-800">
            {statusLabels[record.status] || record.status}
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">{displayName}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Subido por: {uploader || "Fuente no indicada"}
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Ubicación actual</dt>
              <dd>{field(record.current_location)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Lugar donde fue encontrada</dt>
              <dd>{field(record.found_location)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Destino o traslado</dt>
              <dd>{field(record.destination)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Edad aproximada</dt>
              <dd>{field(record.approximate_age)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Género aparente</dt>
              <dd>
                {record.apparent_gender
                  ? genderLabels[record.apparent_gender] || record.apparent_gender
                  : "No indicado"}
              </dd>
            </div>
            {!isHighRisk && record.document_last4 ? (
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-bold">Documento</dt>
                <dd>Termina en {record.document_last4}</dd>
              </div>
            ) : null}
          </dl>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Creado</dt>
              <dd>{formatDate(record.created_at)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Actualizado</dt>
              <dd>{formatDate(record.updated_at)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="font-bold">Encontrado</dt>
              <dd>{formatDate(record.found_at)}</dd>
            </div>
          </dl>

          {record.notes_public ? (
            <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-slate-700">
              {record.notes_public}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            No se muestran teléfonos ni correos privados públicamente. Toda
            información enviada desde esta ficha queda pendiente de revisión.
          </p>
        </section>

        <aside>
          <FoundRecordActions foundRecordId={record.id} />
        </aside>
      </div>
    </main>
  );
}