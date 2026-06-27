"use client";

import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { uploadFoundList } from "@/app/actions";

type FoundListState = {
  ok: boolean;
  message: string;
  batchId?: string;
  rowCount?: number;
  insertedCount?: number;
};

const initial: FoundListState = { ok: false, message: "" };

const acceptedListTypes = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

const uploadAction = uploadFoundList as unknown as (
  state: FoundListState,
  formData: FormData,
) => Promise<FoundListState>;

export function FoundListForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FoundListState, FormData>(uploadAction, initial);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase text-cerca-700">Carga rápida</p>
          <h2 className="mt-1 text-2xl font-black">Subir lista de hospital o centro</h2>
          <p className="mt-2 text-sm text-slate-600">
            Acepta Excel con varias hojas, CSV o texto pegado. Detecta N°, hospital,
            apellidos y nombres, edad, cédula, teléfono, dirección y observaciones.
          </p>
        </div>

        <div aria-live="polite" className="space-y-3">
          {pending ? (
            <div className="rounded-2xl bg-cerca-50 p-4 text-sm text-cerca-950 ring-1 ring-cerca-100">
              <div className="flex items-start gap-3">
                <Loader2 className="mt-0.5 h-5 w-5 animate-spin" />
                <div>
                  <p className="font-black">Procesando el archivo...</p>
                  <p className="mt-1 text-cerca-900">
                    Estamos leyendo filas, guardando el lote y creando registros buscables. Un Excel grande puede tardar un poco; no cierres esta página.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {state.message ? (
            <div className={`rounded-2xl p-4 text-sm ${state.ok ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100" : "bg-red-50 text-red-700 ring-1 ring-red-100"}`}>
              {state.ok ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="font-black">Listado cargado correctamente</p>
                    <p className="mt-1">{state.message}</p>
                    {state.batchId ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/encontrados/lotes/${state.batchId}`} className="rounded-2xl bg-emerald-700 px-4 py-2 font-black text-white">
                          Ver lote cargado
                        </Link>
                        <Link href="/buscar?tab=encontradas" className="rounded-2xl bg-white px-4 py-2 font-black text-emerald-900 ring-1 ring-emerald-200">
                          Buscar registros
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p>{state.message}</p>
              )}
            </div>
          ) : null}
        </div>

        <div>
          <label>Archivo Excel/CSV</label>
          <input name="list_file" type="file" accept={acceptedListTypes} disabled={pending} />
          <p className="mt-1 text-xs text-slate-500">
            Si el archivo tiene una hoja maestra de búsqueda, se usa esa hoja para evitar duplicados por hospital.
          </p>
        </div>
        <div>
          <label>O pegar filas manualmente</label>
          <textarea
            name="rows_text"
            rows={7}
            disabled={pending}
            placeholder={
              "APELLIDOS Y NOMBRES, EDAD, CÉDULA / ID, TELÉFONO, DIRECCIÓN, OBSERVACIONES\nAna Pérez,32,V12345678,0412...,Hospital X,En observación"
            }
          />
          <p className="mt-1 text-xs text-slate-500">
            Para hojas blancas pegadas en hospitales, copia una fila por persona; puedes incluir sólo nombre, cédula y observación.
          </p>
        </div>
      </section>

      <section className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h3 className="font-black">Fuente y responsable</h3>
          <p className="mt-1 text-sm text-slate-600">
            Los datos del listado ayudan a buscar. La evidencia y el contacto del responsable quedan para verificación.
          </p>
        </div>
        <div>
          <label>Fuente / institución *</label>
          <input name="source_name" required disabled={pending} placeholder="Ej. Hospital Domingo Luciani" />
        </div>
        <div>
          <label>Ubicación general *</label>
          <input name="source_location" required disabled={pending} placeholder="Ciudad, parroquia o centro" />
        </div>
        <div>
          <label>Responsable *</label>
          <input name="uploader_name" required disabled={pending} placeholder="Nombre de quien carga" />
        </div>
        <div>
          <label>Teléfono/WhatsApp *</label>
          <input name="uploader_phone" required disabled={pending} inputMode="tel" />
        </div>
        <div>
          <label>Email</label>
          <input name="uploader_email" type="email" disabled={pending} />
        </div>
        <div>
          <label>Evidencia privada</label>
          <input name="evidence_file" type="file" disabled={pending} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
        </div>
      </section>

      <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cerca-600 px-5 py-3 font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando listado...
          </>
        ) : state.ok ? (
          "Cargar otro listado"
        ) : (
          "Cargar y publicar búsqueda"
        )}
      </button>
    </form>
  );
}
