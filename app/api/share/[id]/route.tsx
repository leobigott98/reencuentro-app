import { ImageResponse } from "next/og";
import { supabaseAnon } from "@/lib/supabase";
import { statusLabels } from "@/lib/types";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAnon();
  const { data } = await db.from("public_person_cases").select("*").eq("public_code", id).single();
  if (!data) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#f8fafc", display: "flex", padding: 48, fontFamily: "Arial" }}>
      <div style={{ background: "white", borderRadius: 40, padding: 44, width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#0d9268", fontSize: 28, fontWeight: 800 }}>CERCA Reencuentro</div>
          <div style={{ fontSize: 64, fontWeight: 900, marginTop: 24 }}>Se busca a {data.full_name}</div>
          <div style={{ fontSize: 34, marginTop: 24 }}>Última vez visto/a: {data.last_seen_location}</div>
        </div>
        <div style={{ fontSize: 30, color: "#334155" }}>Estado: {statusLabels[data.status as keyof typeof statusLabels]}</div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
