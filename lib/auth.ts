import { cookies } from "next/headers";
import crypto from "crypto";
import { adminEmails } from "./email";
import { supabaseAdmin } from "./supabase";

const sessionCookie = "cerca_session";
const maxAge = 60 * 60 * 24 * 7;

export type SessionRole =
  | "public_registered"
  | "volunteer"
  | "minor_caregiver"
  | "admin";
export type CercaSession = { email: string; role: SessionRole; iat: number };

const sessionRoles = [
  "public_registered",
  "volunteer",
  "minor_caregiver",
  "admin",
] as const satisfies readonly SessionRole[];

function secret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string) {
  const normalized = normalizeEmail(email);
  return adminEmails().map(normalizeEmail).includes(normalized);
}

function toSessionRole(value: unknown): SessionRole | null {
  if (value === "reporter") return "public_registered";
  return sessionRoles.includes(value as SessionRole)
    ? (value as SessionRole)
    : null;
}

export async function roleForEmail(
  email: string,
  options: { allowPublicFallback?: boolean } = {},
): Promise<SessionRole | null> {
  const normalized = normalizeEmail(email);
  if (isAdminEmail(normalized)) return "admin";

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("volunteer_profiles")
    .select("role")
    .eq("email", normalized)
    .maybeSingle();
  if (profile) {
    return toSessionRole((profile as any).role) ?? "public_registered";
  }

  const { count } = await db
    .from("person_cases")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", normalized);
  if (count && count > 0) return "public_registered";

  return options.allowPublicFallback ? "public_registered" : null;
}

export function hashCode(code: string) {
  return crypto.createHmac("sha256", secret()).update(code).digest("hex");
}

export function newOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function setSession(
  email: string,
  options: { allowPublicFallback?: boolean } = {},
) {
  const store = await cookies();
  const normalized = normalizeEmail(email);
  const role = await roleForEmail(normalized, options);
  if (!role) throw new Error("No autorizado");
  const payload: CercaSession = { email: normalized, role, iat: Date.now() };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  store.set(sessionCookie, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return payload;
}

export async function currentSession(): Promise<CercaSession | null> {
  const store = await cookies();
  const raw = store.get(sessionCookie)?.value;
  if (!raw) return null;
  const [value, sig] = raw.split(".");
  if (!value || !sig || !safeEqual(sig, sign(value))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as CercaSession;
    const role = toSessionRole((payload as any).role);
    if (!payload.email || !role) return null;
    return {
      email: normalizeEmail(payload.email),
      role,
      iat: Number(payload.iat) || 0,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await currentSession();
  if (!session) throw new Error("No autorizado");
  return session;
}

export async function requireVolunteerOrAdmin() {
  const session = await requireSession();
  if (session.role !== "volunteer" && session.role !== "admin") {
    throw new Error("No autorizado");
  }
  return session;
}

export async function requireMinorCaregiverOrAdmin() {
  const session = await requireSession();
  if (session.role !== "minor_caregiver" && session.role !== "admin") {
    throw new Error("No autorizado");
  }
  return session;
}

export async function isAdmin() {
  const session = await currentSession();
  return session?.role === "admin";
}

export async function clearSession() {
  const store = await cookies();
  store.delete(sessionCookie);
}
