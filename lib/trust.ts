import { supabaseAdmin } from "@/lib/supabase";

export async function addTrustEvent(
  actorEmail: string | null | undefined,
  eventType: string,
  points: number,
  notes?: string | null,
) {
  const email = String(actorEmail || "").trim().toLowerCase();
  const db = supabaseAdmin();

  await db.from("trust_events").insert({
    actor_email: email || null,
    event_type: eventType,
    points,
    notes: notes || null,
  });

  if (!email || !points) return;

  const { data: profile } = await db
    .from("volunteer_profiles")
    .select("email, trust_score")
    .eq("email", email)
    .maybeSingle();

  if (!profile) return;

  await db
    .from("volunteer_profiles")
    .update({ trust_score: Number(profile.trust_score || 0) + points })
    .eq("email", email);
}