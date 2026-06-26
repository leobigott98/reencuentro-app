"use client";
import { useActionState } from "react";
import { uploadFoundList } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" };

export function FoundListForm() {
  const [state, action] = useActionState(uploadFoundList, initial);
  return (
    <form action={action} className="space-y-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <section className="space-y-3">
        <h2 className="text-xl font-black">Responsable del listado</h2>
        <p className="text-sm text-slate-600">Estos datos quedan privados para verificación. Los registros cargados se publican como “posiblemente localizados” hasta revisión.</p>
        {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-900" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
        <div><label>Nombre del responsable *</label><input name="uploader_name" required /></div>
        <div><label>Teléfono/WhatsApp *</label><input name="uploader_phone" required /></div>
        <div><label>Email</label><input name="uploader_email" type="email" /></div>
        <div><label>Fuente / institución / refugio *</label><input name="source_name" required placeholder="Ej. Refugio X, Hospital Y, voluntario Z" /></div>
      </section>
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="text-xl font-black">Listado</h2>
        <p className="text-sm text-slate-600">CSV recomendado: <code>nombre,edad,ubicacion,notas</code>. También puedes pegar varias filas aquí abajo.</p>
        <div><label>Subir CSV</label><input name="csv_file" type="file" accept=".csv,text/csv" /></div>
        <div><label>O pegar filas manualmente</label><textarea name="rows_text" rows={8} placeholder={'nombre,edad,ubicacion,notas\nAna Pérez,32,Refugio La Guaira,Está consciente\nLuis Gómez,,Hospital X,Sin teléfono'} /></div>
      </section>
      <SubmitButton>Cargar listado de encontrados</SubmitButton>
    </form>
  );
}