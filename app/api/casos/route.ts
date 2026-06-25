import { NextRequest, NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const estado = (searchParams.get("estado") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") || 24)));
  const from = (page - 1) * limit;
  const to = from + limit; // Supabase range is inclusive; fetch one extra row to know if there is more.

  const db = supabaseAnon();
  let query = db.from("public_person_cases").select("*").order("updated_at", { ascending: false }).range(from, to);
  if (q) query = query.ilike("full_name", `%${q}%`);
  if (estado) query = query.eq("status", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ cases: [], hasMore: false }, { status: 500 });
  const rows = data || [];
  return NextResponse.json({ cases: rows.slice(0, limit), hasMore: rows.length > limit });
}
