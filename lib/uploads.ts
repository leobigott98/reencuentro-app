import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_PHOTOS_BUCKET || "case-photos";
const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_EVIDENCE_BUCKET || "private-evidence";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function safeExt(file: File) {
  const fallback = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext && ext.length <= 5 ? ext : fallback;
}

export function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newOwnerToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function uploadPublicCasePhoto(file: File | null | undefined, folder = "cases") {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Formato de imagen inválido. Usa JPG, PNG o WebP.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La imagen es demasiado grande. Máximo 5 MB.");

  const db = supabaseAdmin();
  const path = `${folder}/${crypto.randomUUID()}.${safeExt(file)}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await db.storage.from(PUBLIC_BUCKET).upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type || "image/jpeg",
    upsert: false
  });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

  const { data } = db.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPrivateEvidence(file: File | null | undefined, folder = "evidence") {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Formato de evidencia inválido. Usa JPG, PNG o WebP.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La evidencia es demasiado grande. Máximo 5 MB.");

  const db = supabaseAdmin();
  const path = `${folder}/${crypto.randomUUID()}.${safeExt(file)}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await db.storage.from(PRIVATE_BUCKET).upload(path, Buffer.from(arrayBuffer), {
    contentType: file.type || "image/jpeg",
    upsert: false
  });
  if (error) throw new Error(`No se pudo subir la evidencia: ${error.message}`);
  return path;
}

export async function signedEvidenceUrl(path: string | null | undefined) {
  if (!path) return null;
  const db = supabaseAdmin();
  const { data, error } = await db.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 60 * 30);
  if (error) return null;
  return data.signedUrl;
}
