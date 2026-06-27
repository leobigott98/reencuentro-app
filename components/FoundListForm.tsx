"use client";

import { useActionState } from "react";
import { uploadFoundList } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

const acceptedListTypes = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export function FoundListForm() {
  const [state, action] = useActionState(uploadFoundList, initial);
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
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
        {state.message ? (
          <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>
            {state.message}
          </p>
        ) : null}
        <div>
          <label>Archivo Excel/CSV</label>
          <input name="list_file" type="file" accept={acceptedListTypes} />
          <p className="mt-1 text-xs text-slate-500">
            Si el archivo tiene una hoja maestra de búsqueda, se usa esa hoja para evitar duplicados por hospital.
          </p>
        </div>
        <div>
          <label>O pegar filas manualmente</label>
          <textarea
            name="rows_text"
            rows={7}
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
          <input name="source_name" required placeholder="Ej. Hospital Domingo Luciani" />
        </div>
        <div>
          <label>Ubicación general *</label>
          <input name="source_location" required placeholder="Ciudad, parroquia o centro" />
        </div>
        <div>
          <label>Responsable *</label>
          <input name="uploader_name" required placeholder="Nombre de quien carga" />
        </div>
        <div>
          <label>Teléfono/WhatsApp *</label>
          <input name="uploader_phone" required inputMode="tel" />
        </div>
        <div>
          <label>Email</label>
          <input name="uploader_email" type="email" />
        </div>
        <div>
          <label>Evidencia privada</label>
          <input name="evidence_file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" />
        </div>
      </section>

      <SubmitButton>Cargar y publicar búsqueda</SubmitButton>
    </form>
  );
}