import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const { data } = await supabaseAnon().from("public_survivor_records").select("full_name,approximate_age,document_last4,hospital,address,notes,source_name,source_sheet,verification_status,created_at").order("created_at", { ascending: false }).limit(10000);
  const header = ["nombre","edad","cedula_ultimos4","hospital_centro","direccion_zona","observaciones","fuente","hoja","verificacion","creado"];
  const rows = (data || []).map((r: any) => [r.full_name, r.approximate_age ?? "", r.document_last4 ?? "", r.hospital ?? "", r.address ?? "", r.notes ?? "", r.source_name ?? "", r.source_sheet ?? "", r.verification_status, r.created_at]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sobrevivientes-cerca.csv"`
    }
  });
}
