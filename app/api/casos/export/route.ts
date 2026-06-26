import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";
import { statusLabels } from "@/lib/types";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const { data } = await supabaseAnon().from("public_person_cases").select("full_name,approximate_age,document_last4,status,last_seen_location,current_location,description,view_count,share_count,updated_at").order("updated_at", { ascending: false }).limit(10000);
  const header = ["nombre","edad","cedula_ultimos4","estatus","ultima_ubicacion","ubicacion_actual","descripcion","vistas","compartidos","actualizado"];
  const rows = (data || []).map((r: any) => [
    r.full_name,
    r.approximate_age ?? "",
    r.document_last4 ?? "",
    statusLabels[r.status as keyof typeof statusLabels] || r.status,
    r.last_seen_location,
    r.current_location ?? "",
    r.description ?? "",
    r.view_count ?? 0,
    r.share_count ?? 0,
    r.updated_at
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="personas-cerca.csv"`
    }
  });
}
