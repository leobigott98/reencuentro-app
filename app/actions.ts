"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminEmails, sendEmail } from "@/lib/email";
import { clearSession, currentSession, hashCode, isAdmin, newOtpCode, normalizeEmail, roleForEmail, setSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { CaseStatus, statusLabels } from "@/lib/types";
import { newOwnerToken, tokenHash, uploadPrivateEvidence, uploadPublicCasePhoto } from "@/lib/uploads";
import { parseFoundCsv } from "@/lib/csv";

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function file(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function isSpam(formData: FormData) {
  return Boolean(text(formData, "website"));
}

const reportSchema = z.object({
  full_name: z.string().min(3).max(160),
  approximate_age: z.coerce.number().int().min(0).max(120).optional().or(z.literal("")),
  photo_url: z.string().url().optional().or(z.literal("")),
  last_seen_location: z.string().min(3).max(280),
  last_seen_at: z.string().optional(),
  description: z.string().max(1200).optional(),
  reporter_name: z.string().min(3).max(160),
  reporter_phone: z.string().min(6).max(80),
  reporter_email: z.string().email(),
  reporter_relationship: z.string().min(2).max(120)
});

export async function createMissingReport(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar el reporte." };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa los campos obligatorios." };

  const data = parsed.data;
  const ageRaw = text(formData, "approximate_age");
  const ageValue = ageRaw ? Number(ageRaw) : null;
  const db = supabaseAdmin();
  const public_code = crypto.randomUUID().slice(0, 8);
  const ownerToken = newOwnerToken();

  let uploadedPhoto: string | null = null;
  try {
    uploadedPhoto = await uploadPublicCasePhoto(file(formData, "photo_file"), "missing");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo subir la foto." };
  }

  const { data: person, error: personError } = await db
    .from("person_cases")
    .insert({
      public_code,
      owner_token_hash: tokenHash(ownerToken),
      owner_email: normalizeEmail(data.reporter_email),
      owner_name: data.reporter_name.trim(),
      full_name: data.full_name.trim(),
      approximate_age: ageValue,
      photo_url: uploadedPhoto || data.photo_url || null,
      status: "missing",
      last_seen_location: data.last_seen_location.trim(),
      last_seen_at: data.last_seen_at || null,
      description: data.description || null
    })
    .select("id, public_code, full_name")
    .single();

  if (personError || !person) return { ok: false, message: "No se pudo crear el caso." };

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: "missing",
    reporter_name: data.reporter_name.trim(),
    reporter_phone: data.reporter_phone.trim(),
    reporter_email: normalizeEmail(data.reporter_email),
    reporter_relationship: data.reporter_relationship.trim(),
    notes: data.description || null,
    verification_status: "pending",
    visibility: "private"
  });

  const publicUrl = `${baseUrl()}/casos/${person.public_code}`;
  const manageUrl = `${publicUrl}?token=${ownerToken}`;
  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nuevo caso pendiente: ${person.full_name}`,
      html: `<p>Se registró un nuevo caso.</p><p><strong>${person.full_name}</strong></p><p><a href="${publicUrl}">${publicUrl}</a></p>`
    });
  }
  if (data.reporter_email) {
    await sendEmail({
      to: [normalizeEmail(data.reporter_email)],
      subject: `Tu reporte fue creado: ${person.full_name}`,
      html: `<p>Gracias por reportar de forma responsable.</p><p>Ficha pública: <a href="${publicUrl}">${publicUrl}</a></p><p>Enlace privado para solicitar marcar como encontrado/a: <a href="${manageUrl}">${manageUrl}</a></p><p>No compartas este enlace privado.</p>`
    });
  }

  revalidatePath("/");
  redirect(`/casos/${person.public_code}?creado=1&token=${ownerToken}`);
}

const infoSchema = z.object({
  person_id: z.string().uuid(),
  info_name: z.string().min(3).max(160),
  info_phone: z.string().min(6).max(80),
  info_email: z.string().email().optional().or(z.literal("")),
  seen_location: z.string().min(3).max(280),
  seen_at: z.string().optional(),
  notes: z.string().min(8).max(1500),
  evidence_url: z.string().url().optional().or(z.literal(""))
});

export async function submitInfo(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar el aviso." };
  const parsed = infoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa la información enviada." };
  const data = parsed.data;
  const db = supabaseAdmin();

  const { data: person } = await db.from("person_cases").select("id, public_code, full_name").eq("id", data.person_id).single();
  if (!person) return { ok: false, message: "No se encontró el caso." };

  let evidencePath: string | null = null;
  try {
    evidencePath = await uploadPrivateEvidence(file(formData, "evidence_file"), "sightings");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo subir la evidencia." };
  }

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: "sighting",
    reporter_name: data.info_name.trim(),
    reporter_phone: data.info_phone.trim(),
    reporter_email: data.info_email || null,
    reporter_relationship: "informante",
    seen_location: data.seen_location.trim(),
    seen_at: data.seen_at || null,
    notes: data.notes.trim(),
    evidence_url: data.evidence_url || null,
    evidence_file_path: evidencePath,
    verification_status: "pending",
    visibility: "private"
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nueva información sobre ${person.full_name}`,
      html: `<p>Alguien envió información sobre <strong>${person.full_name}</strong>.</p><p>Ubicación: ${data.seen_location}</p><p>Notas: ${data.notes}</p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`
    });
  }

  return { ok: true, message: "Gracias. La información fue enviada para revisión; no cambiará el estado hasta validarse." };
}

const ownerFoundSchema = z.object({
  public_code: z.string().min(4).max(32),
  token: z.string().min(16).max(120),
  location: z.string().min(3).max(280),
  notes: z.string().max(1200).optional()
});

export async function requestOwnerFound(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar la solicitud." };
  const parsed = ownerFoundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa la información." };
  const data = parsed.data;
  const db = supabaseAdmin();
  const { data: person } = await db
    .from("person_cases")
    .select("id, full_name, public_code, owner_token_hash")
    .eq("public_code", data.public_code)
    .single();

  if (!person || !person.owner_token_hash || person.owner_token_hash !== tokenHash(data.token)) {
    return { ok: false, message: "El enlace privado no es válido." };
  }

  let evidencePath: string | null = null;
  try {
    evidencePath = await uploadPrivateEvidence(file(formData, "evidence_file"), "owner-found");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo subir la foto." };
  }

  await db.from("person_cases").update({
    status: "verifying_location",
    current_location: data.location,
    updated_at: new Date().toISOString()
  }).eq("id", person.id);

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: "found",
    reporter_name: "Reportante original",
    reporter_phone: "Privado: enlace del reportante",
    reporter_relationship: "reportante original",
    seen_location: data.location,
    notes: data.notes || "El reportante original solicitó marcar como encontrado/a.",
    evidence_file_path: evidencePath,
    verification_status: "reviewing",
    visibility: "private"
  });

  await db.from("verification_logs").insert({ person_id: person.id, action: "owner_found_request", notes: data.notes || data.location });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Solicitud de encontrado: ${person.full_name}`,
      html: `<p>El reportante original solicitó marcar a <strong>${person.full_name}</strong> como encontrado/a.</p><p>Ubicación: ${data.location}</p><p><a href="${baseUrl()}/admin">Validar en admin</a></p>`
    });
  }

  revalidatePath("/");
  revalidatePath(`/casos/${person.public_code}`);
  return { ok: true, message: "Solicitud recibida. El caso pasó a verificación antes de publicarse como reunificado." };
}

const foundListSchema = z.object({
  uploader_name: z.string().min(3).max(160),
  uploader_phone: z.string().min(6).max(80),
  uploader_email: z.string().email().optional().or(z.literal("")),
  source_name: z.string().min(2).max(160),
  rows_text: z.string().max(20000).optional()
});

export async function uploadFoundList(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar el listado." };
  const parsed = foundListSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa los datos del responsable del listado." };
  const data = parsed.data;

  let raw = data.rows_text || "";
  const csv = file(formData, "csv_file");
  if (csv && csv.size > 0) {
    if (csv.size > 1024 * 1024) return { ok: false, message: "El CSV es demasiado grande. Máximo 1 MB." };
    raw += "\n" + (await csv.text());
  }

  const rows = parseFoundCsv(raw);
  if (!rows.length) {
    return { ok: false, message: "No encontré filas válidas. Usa columnas: nombre, edad, ubicacion, notas." };
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const inserted: string[] = [];

  for (const row of rows) {
    const public_code = crypto.randomUUID().slice(0, 8);
    const { data: person, error } = await db.from("person_cases").insert({
      public_code,
      full_name: row.full_name,
      approximate_age: row.approximate_age ?? null,
      status: "possibly_found",
      last_seen_location: row.current_location,
      current_location: row.current_location,
      description: row.notes,
      created_at: now,
      updated_at: now
    }).select("id").single();

    if (!error && person) {
      inserted.push(person.id);
      await db.from("case_reports").insert({
        person_id: person.id,
        report_type: "found",
        reporter_name: data.uploader_name,
        reporter_phone: data.uploader_phone,
        reporter_email: data.uploader_email || null,
        reporter_relationship: data.source_name,
        seen_location: row.current_location,
        notes: row.notes || `Listado cargado por ${data.source_name}`,
        verification_status: "pending",
        visibility: "private"
      });
    }
  }

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nuevo listado de encontrados (${inserted.length})`,
      html: `<p>${data.uploader_name} cargó ${inserted.length} posibles personas encontradas.</p><p>Fuente: ${data.source_name}</p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`
    });
  }

  revalidatePath("/");
  return { ok: true, message: `Listado recibido: ${inserted.length} persona(s) cargadas como “posiblemente localizada(s)”.` };
}


export async function updateCaseStatus(formData: FormData) {
  if (!(await isAdmin())) throw new Error("No autorizado");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as CaseStatus;
  const note = String(formData.get("note") || "Cambio de estado");
  const allowed = Object.keys(statusLabels);
  if (!allowed.includes(status)) throw new Error("Estado inválido");

  const db = supabaseAdmin();
  await db.from("person_cases").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  await db.from("verification_logs").insert({ person_id: id, action: `status:${status}`, notes: note });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function markReportReviewed(formData: FormData) {
  if (!(await isAdmin())) throw new Error("No autorizado");
  const id = String(formData.get("id"));
  const status = String(formData.get("verification_status"));
  const db = supabaseAdmin();
  await db.from("case_reports").update({ verification_status: status }).eq("id", id);
  revalidatePath("/admin");
}

const foundPersonSchema = z.object({
  full_name: z.string().min(3).max(160),
  approximate_age: z.coerce.number().int().min(0).max(120).optional().or(z.literal("")),
  current_location: z.string().min(3).max(280),
  notes: z.string().max(1200).optional(),
  reporter_name: z.string().min(3).max(160),
  reporter_phone: z.string().min(6).max(80),
  reporter_email: z.string().email().optional().or(z.literal("")),
  source_name: z.string().min(2).max(160)
});

export async function createFoundPersonReport(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar el reporte." };
  const parsed = foundPersonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa los campos obligatorios." };
  const data = parsed.data;
  const ageRaw = text(formData, "approximate_age");
  const ageValue = ageRaw ? Number(ageRaw) : null;
  const db = supabaseAdmin();
  const public_code = crypto.randomUUID().slice(0, 8);

  let photoUrl: string | null = null;
  let evidencePath: string | null = null;
  try {
    photoUrl = await uploadPublicCasePhoto(file(formData, "photo_file"), "found");
    evidencePath = await uploadPrivateEvidence(file(formData, "evidence_file"), "found-reports");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo subir la foto." };
  }

  const { data: person, error } = await db.from("person_cases").insert({
    public_code,
    full_name: data.full_name.trim(),
    approximate_age: ageValue,
    photo_url: photoUrl,
    status: "possibly_found",
    last_seen_location: data.current_location.trim(),
    current_location: data.current_location.trim(),
    description: data.notes || null
  }).select("id, public_code, full_name").single();

  if (error || !person) return { ok: false, message: "No se pudo crear el reporte de encontrado." };

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: "found",
    reporter_name: data.reporter_name.trim(),
    reporter_phone: data.reporter_phone.trim(),
    reporter_email: data.reporter_email || null,
    reporter_relationship: data.source_name.trim(),
    seen_location: data.current_location.trim(),
    notes: data.notes || null,
    evidence_file_path: evidencePath,
    verification_status: "pending",
    visibility: "private"
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nueva persona posiblemente encontrada: ${person.full_name}`,
      html: `<p>Se reportó una persona posiblemente encontrada: <strong>${person.full_name}</strong>.</p><p>Ubicación: ${data.current_location}</p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`
    });
  }

  revalidatePath("/");
  redirect(`/casos/${person.public_code}?creado=1`);
}

const otpRequestSchema = z.object({ email: z.string().email() });

export async function requestLoginOtp(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = otpRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Indica un correo válido." };
  const email = normalizeEmail(parsed.data.email);
  const db = supabaseAdmin();
  const role = roleForEmail(email);
  let allowed = role === "admin";
  if (!allowed) {
    const { count } = await db.from("person_cases").select("id", { count: "exact", head: true }).eq("owner_email", email);
    allowed = Boolean(count && count > 0);
  }

  // Respuesta genérica para no revelar si el correo tiene reportes.
  if (!allowed) return { ok: true, message: "Si el correo tiene reportes o acceso admin, enviaremos un código de acceso." };

  const code = newOtpCode();
  await db.from("otp_codes").insert({
    email,
    code_hash: hashCode(code),
    purpose: "login",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
  await sendEmail({
    to: [email],
    subject: "Código de acceso a CERCA Reencuentro",
    html: `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p><p>Vence en 10 minutos. No lo compartas.</p>`
  });
  return { ok: true, message: "Te enviamos un código de 6 dígitos. Revisa tu correo." };
}

const otpVerifySchema = z.object({ email: z.string().email(), code: z.string().min(6).max(12) });

export async function verifyLoginOtp(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = otpVerifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa el correo y el código." };
  const email = normalizeEmail(parsed.data.email);
  const codeHash = hashCode(parsed.data.code.replace(/\s+/g, ""));
  const db = supabaseAdmin();
  const { data: otp } = await db
    .from("otp_codes")
    .select("id, expires_at, used_at")
    .eq("email", email)
    .eq("code_hash", codeHash)
    .eq("purpose", "login")
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "Código inválido o vencido." };
  }
  await db.from("otp_codes").update({ used_at: new Date().toISOString() }).eq("id", otp.id);
  await setSession(email);
  redirect(roleForEmail(email) === "admin" ? "/admin" : "/mi-cuenta");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

const aidResourceSchema = z.object({
  kind: z.enum(["collection_center", "specific_request", "news", "emergency_contact", "tip"]),
  title: z.string().min(3).max(180),
  location: z.string().max(240).optional(),
  description: z.string().min(5).max(2000),
  contact_name: z.string().max(160).optional(),
  contact_phone: z.string().max(100).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  priority: z.enum(["normal", "high", "critical"]).default("normal")
});

export async function createAidResource(_: unknown, formData: FormData) {
  if (!(await isAdmin())) return { ok: false, message: "No autorizado." };
  const parsed = aidResourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa la información." };
  const data = parsed.data;
  const db = supabaseAdmin();
  const { error } = await db.from("aid_resources").insert({
    kind: data.kind,
    title: data.title.trim(),
    location: data.location || null,
    description: data.description.trim(),
    contact_name: data.contact_name || null,
    contact_phone: data.contact_phone || null,
    source_url: data.source_url || null,
    priority: data.priority,
    is_published: true
  });
  if (error) return { ok: false, message: "No se pudo publicar." };
  revalidatePath("/");
  revalidatePath("/ayudar");
  return { ok: true, message: "Información publicada." };
}

export async function deleteAidResource(formData: FormData) {
  if (!(await isAdmin())) throw new Error("No autorizado");
  const id = String(formData.get("id") || "");
  await supabaseAdmin().from("aid_resources").update({ is_published: false }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/ayudar");
}
