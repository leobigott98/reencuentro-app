import { cookies } from "next/headers";
import crypto from "crypto";
import { adminEmails } from "./email";

const sessionCookie = "cerca_session";
const maxAge = 60 * 60 * 24 * 7;

export type SessionRole = "reporter" | "admin";
export type CercaSession = { email: string; role: SessionRole; iat: number };

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

export function roleForEmail(email: string): SessionRole {
  return adminEmails().map(normalizeEmail).includes(normalizeEmail(email)) ? "admin" : "reporter";
}

export function hashCode(code: string) {
  return crypto.createHmac("sha256", secret()).update(code).digest("hex");
}

export function newOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function setSession(email: string) {
  const store = await cookies();
  const payload: CercaSession = { email: normalizeEmail(email), role: roleForEmail(email), iat: Date.now() };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  store.set(sessionCookie, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  });
}

export async function currentSession(): Promise<CercaSession | null> {
  const store = await cookies();
  const raw = store.get(sessionCookie)?.value;
  if (!raw) return null;
  const [value, sig] = raw.split(".");
  if (!value || !sig || !safeEqual(sig, sign(value))) return null;
  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as CercaSession;
    if (!payload.email || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function isAdmin() {
  const session = await currentSession();
  return session?.role === "admin";
}

export async function clearSession() {
  const store = await cookies();
  store.delete(sessionCookie);
}
