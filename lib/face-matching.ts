import { sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

type SubjectType = "missing_case" | "found_record" | "deceased_record";

export type MatchCandidate = {
  subjectType: SubjectType;
  subjectId: string;
  score: number;
};

const FACE_THRESHOLD = 0.92;

function enabled() {
  return process.env.FACE_MATCHING_ENABLED === "true";
}

function publicBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function extractFaceEmbeddingFromImagePath(
  _pathOrUrl: string | null | undefined,
): Promise<number[] | null> {
  if (!enabled()) return null;

  // Build-safe placeholder: plug a worker/API here that returns a 128/512-d vector.
  // Avoid importing native TensorFlow/face-api packages in the Vercel function bundle.
  return null;
}

export async function compareEmbeddingToMissingCases(
  _embedding: number[],
): Promise<MatchCandidate[]> {
  if (!enabled()) return [];
  return [];
}

export async function compareEmbeddingToFoundRecords(
  _embedding: number[],
): Promise<MatchCandidate[]> {
  if (!enabled()) return [];
  return [];
}

function vectorLiteral(embedding: number[]) {
  return `[${embedding.map((value) => Number(value || 0).toFixed(6)).join(",")}]`;
}

async function storeFaceEmbedding(
  subjectType: SubjectType,
  subjectId: string,
  imagePath: string,
  embedding: number[],
) {
  if (!enabled() || !embedding.length) return;
  await supabaseAdmin().from("face_embeddings").upsert(
    {
      subject_type: subjectType,
      subject_id: subjectId,
      image_path: imagePath,
      embedding: vectorLiteral(embedding),
      model: "external-worker-placeholder",
    },
    { onConflict: "subject_type,subject_id,image_path" },
  );
}

async function notifyFaceMatchReview(missingCaseId: string) {
  const db = supabaseAdmin();
  const { data: missing } = await db
    .from("person_cases")
    .select("id, full_name, public_code, owner_email")
    .eq("id", missingCaseId)
    .maybeSingle();
  if (!missing) return;

  const subject = `Posible coincidencia en revisión: ${missing.full_name || "reporte"}`;
  const html = `<p><strong>Hay una posible coincidencia en revisión.</strong></p><p>Esto no confirma identidad. El equipo debe revisar la coincidencia antes de tomar decisiones.</p><p><a href="${publicBaseUrl()}/casos/${missing.public_code}">Ver reporte</a></p>`;

  if (missing.owner_email) {
    await sendEmail({ to: [missing.owner_email], subject, html });
  }

  const { data: subs } = await db
    .from("generic_subscriptions")
    .select("email")
    .eq("subject_type", "missing_case")
    .eq("subject_id", missing.id)
    .eq("status", "confirmed");

  for (const sub of subs || []) {
    await sendEmail({ to: [sub.email], subject, html });
  }
}

async function insertFaceMatch(missingCaseId: string, foundRecordId: string, score: number) {
  if (!enabled() || score < FACE_THRESHOLD) return false;
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("possible_matches")
    .select("id")
    .eq("missing_case_id", missingCaseId)
    .eq("found_record_id", foundRecordId)
    .eq("match_type", "face")
    .maybeSingle();
  if (existing) return false;

  const { error } = await db.from("possible_matches").insert({
    missing_case_id: missingCaseId,
    found_record_id: foundRecordId,
    match_type: "face",
    score,
    status: "reviewing",
    notified_at: new Date().toISOString(),
  });
  if (error) return false;
  await notifyFaceMatchReview(missingCaseId);
  return true;
}

export async function maybeCreateFaceMatchesForMissingCase(
  missingCaseId: string,
  imagePathOrUrl: string | null | undefined,
) {
  if (!enabled() || !imagePathOrUrl) return { created: 0 };
  const embedding = await extractFaceEmbeddingFromImagePath(imagePathOrUrl);
  if (!embedding) return { created: 0 };
  await storeFaceEmbedding("missing_case", missingCaseId, imagePathOrUrl, embedding);

  let created = 0;
  for (const candidate of await compareEmbeddingToFoundRecords(embedding)) {
    if (candidate.subjectType !== "found_record" && candidate.subjectType !== "deceased_record") continue;
    const didCreate = await insertFaceMatch(missingCaseId, candidate.subjectId, candidate.score);
    if (didCreate) created += 1;
  }
  return { created };
}

export async function maybeCreateFaceMatchesForFoundRecord(
  foundRecordId: string,
  imagePathOrUrl: string | null | undefined,
  subjectType: Extract<SubjectType, "found_record" | "deceased_record"> = "found_record",
) {
  if (!enabled() || !imagePathOrUrl) return { created: 0 };
  const embedding = await extractFaceEmbeddingFromImagePath(imagePathOrUrl);
  if (!embedding) return { created: 0 };
  await storeFaceEmbedding(subjectType, foundRecordId, imagePathOrUrl, embedding);

  let created = 0;
  for (const candidate of await compareEmbeddingToMissingCases(embedding)) {
    if (candidate.subjectType !== "missing_case") continue;
    const didCreate = await insertFaceMatch(candidate.subjectId, foundRecordId, candidate.score);
    if (didCreate) created += 1;
  }
  return { created };
}