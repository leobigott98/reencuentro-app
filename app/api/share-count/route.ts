import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { public_code } = await req.json();
    if (!public_code) return NextResponse.json({ ok: false }, { status: 400 });
    const db = supabaseAdmin();
    const { data } = await db.from("person_cases").select("id, share_count").eq("public_code", public_code).single();
    if (!data) return NextResponse.json({ ok: false }, { status: 404 });
    await db.from("person_cases").update({ share_count: Number(data.share_count || 0) + 1 }).eq("id", data.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
