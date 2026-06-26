"use client";
import { useActionState } from "react";
import { importSurvivorFile } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const initial = { ok: false, message: "" } as { ok: boolean; message: string };

export function SurvivorImportForm() {
  const [state, action] = useActionState(importSurvivorFile, initial);
  return (
    <form action={action} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-black">Importar sobrevivientes/pacientes</h2>
      <p className="text-sm text-slate-600">Acepta CSV, XLS o XLSX con columnas como nombre, edad, cédula, hospital, teléfono, dirección y observaciones. El teléfono se guarda privado y no se muestra al público.</p>
      {state.message ? <p className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-cerca-50 text-cerca-800" : "bg-red-50 text-red-700"}`}>{state.message}</p> : null}
      <div><label>Fuente del listado *</label><input name="source_name" required placeholder="Ej. Consolidado hospitales / Cruz Roja / Voluntarios" /></div>
      <div><label>Archivo *</label><input name="survivor_file" type="file" required accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" /></div>
      <div><label>Notas internas</label><textarea name="notes" rows={2} placeholder="Opcional: de dónde salió, quién lo validó, fecha, etc." /></div>
      <SubmitButton>Importar listado</SubmitButton>
    </form>
  );
}
