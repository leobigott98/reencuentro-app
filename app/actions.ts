"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminEmails, sendEmail } from "@/lib/email";
import {
  clearSession,
  currentSession,
  hashCode,
  isAdmin,
  newOtpCode,
  normalizeEmail,
  isAdminEmail,
  setSession,
} from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { CaseStatus, statusLabels } from "@/lib/types";
import {
  newOwnerToken,
  tokenHash,
  uploadPrivateEvidence,
  uploadPrivateFile,
  uploadPublicCasePhoto,
} from "@/lib/uploads";
import { isSpreadsheetFile, parseFoundCsv, parseFoundWorkbook } from "@/lib/csv";
import {
  maybeCreatePossibleMatchesForFoundRecord,
  maybeCreatePossibleMatchesForMissingCase,
} from "@/lib/matching";
import { parseSurvivorWorkbook } from "@/lib/survivor-import";

const baseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

function normalizeDocumentId(value: string) {
  const cleaned = value.toUpperCase().replace(/[^0-9VEJPG]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 5 ? cleaned : "";
}

function documentLast4(value: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function normalizeNameForSearch(value: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function optionalIsoDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function foundSensitivityLevel(
  status: string,
  fullName: string | null,
  photoUrl: string | null,
) {
  if (
    status.includes("minor") ||
    status.includes("deceased") ||
    !fullName ||
    (photoUrl && status.includes("deceased"))
  ) {
    return "high_risk";
  }
  if (status === "unidentified" || status === "partially_identified") {
    return "restricted";
  }
  return "normal";
}

export type SubscriptionSubjectType = "missing_case" | "found_record" | "upload_batch";

export type GenericSubscriptionRequestState = {
  ok: boolean;
  message: string;
  subjectType?: SubscriptionSubjectType;
  subjectId?: string;
  email?: string;
};

export type GenericSubscriptionConfirmState = {
  ok: boolean;
  message: string;
};

type SubscriberRow = {
  email: string;
  unsubscribe_token: string | null;
};

function subscriptionFooter(
  subjectType: SubscriptionSubjectType,
  subjectId: string,
  token: string | null,
) {
  const unsubscribeLink = token
    ? `<a href="${baseUrl()}/desuscribir?token=${encodeURIComponent(token)}&subject_type=${encodeURIComponent(subjectType)}&subject_id=${encodeURIComponent(subjectId)}">Cancelar suscripción</a>`
    : "Cancelar suscripción no disponible";

  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" /><p style="font-size:12px;color:#64748b">Recibes este correo porque te suscribiste a actualizaciones en CERCA Reencuentro. ${unsubscribeLink}</p>`;
}

export async function notifySubscribers(
  subjectType: SubscriptionSubjectType,
  subjectId: string,
  subject: string,
  html: string,
) {
  const db = supabaseAdmin();
  const sent = new Set<string>();
  const { data } = await db
    .from("generic_subscriptions")
    .select("email, unsubscribe_token")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("status", "confirmed");

  const genericSubs = (data || []) as SubscriberRow[];
  for (const sub of genericSubs) {
    const email = normalizeEmail(sub.email);
    if (!email || sent.has(email)) continue;
    sent.add(email);
    await sendEmail({
      to: [email],
      subject,
      html: `${html}${subscriptionFooter(subjectType, subjectId, sub.unsubscribe_token)}`,
    });
  }

  if (subjectType !== "missing_case") return;

  const { data: legacyData } = await db
    .from("case_subscriptions")
    .select("email, unsubscribe_token")
    .eq("person_id", subjectId)
    .eq("status", "confirmed");

  const legacySubs = (legacyData || []) as SubscriberRow[];
  for (const sub of legacySubs) {
    const email = normalizeEmail(sub.email);
    if (!email || sent.has(email)) continue;
    sent.add(email);
    await sendEmail({
      to: [email],
      subject,
      html: `${html}${subscriptionFooter("missing_case", subjectId, sub.unsubscribe_token)}`,
    });
  }
}

async function notifyCaseSubscribers(
  personId: string,
  subject: string,
  html: string,
) {
  await notifySubscribers("missing_case", personId, subject, html);
}
async function notifyCaseOwner(
  personId: string,
  subject: string,
  html: string,
) {
  const db = supabaseAdmin();
  const { data: person } = await db
    .from("person_cases")
    .select("owner_email, full_name, public_code")
    .eq("id", personId)
    .maybeSingle();
  if (!person?.owner_email) return;
  await sendEmail({
    to: [person.owner_email],
    subject,
    html: `${html}<p style="font-size:12px;color:#64748b">Recibes este correo porque creaste el reporte original de este caso.</p><p><a href="${baseUrl()}/mi-cuenta">Ver mis reportes</a></p>`,
  });
}

const reportSchema = z.object({
  full_name: z.string().min(3).max(160),
  approximate_age: z.coerce
    .number()
    .int()
    .min(0)
    .max(120)
    .optional()
    .or(z.literal("")),
  document_id: z.string().max(40).optional(),
  photo_url: z.string().url().optional().or(z.literal("")),
  last_seen_location: z.string().min(3).max(280),
  last_seen_at: z.string().optional(),
  description: z.string().max(1200).optional(),
  reporter_name: z.string().min(3).max(160),
  reporter_phone: z.string().min(6).max(80),
  reporter_email: z.string().email(),
  reporter_relationship: z.string().min(2).max(120),
});

export async function createMissingReport(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar el reporte." };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa los campos obligatorios." };

  const data = parsed.data;
  const ageRaw = text(formData, "approximate_age");
  const ageValue = ageRaw ? Number(ageRaw) : null;
  const email = normalizeEmail(data.reporter_email);
  const db = supabaseAdmin();

  let uploadedPhoto: string | null = null;
  try {
    uploadedPhoto = await uploadPublicCasePhoto(
      file(formData, "photo_file"),
      "missing-drafts",
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo subir la foto.",
    };
  }

  const normalizedDoc = normalizeDocumentId(text(formData, "document_id"));
  if (normalizedDoc) {
    const { data: existing } = await db
      .from("person_cases")
      .select("public_code, full_name, status")
      .eq("document_id", normalizedDoc)
      .neq("status", "duplicate")
      .maybeSingle();
    if (existing) {
      return {
        ok: false,
        message: `Ya existe un caso con esa cédula: ${existing.full_name}. Revisa /casos/${existing.public_code} antes de crear un duplicado.`,
      };
    }
  }

  const code = newOtpCode();
  const payload = {
    full_name: data.full_name.trim(),
    approximate_age: ageValue,
    document_id: normalizeDocumentId(text(formData, "document_id")) || null,
    document_last4: documentLast4(text(formData, "document_id")),
    photo_url: uploadedPhoto || data.photo_url || null,
    last_seen_location: data.last_seen_location.trim(),
    last_seen_at: data.last_seen_at || null,
    description: data.description || null,
    reporter_name: data.reporter_name.trim(),
    reporter_phone: data.reporter_phone.trim(),
    reporter_email: email,
    reporter_relationship: data.reporter_relationship.trim(),
  };

  const { data: draft, error } = await db
    .from("report_drafts")
    .insert({
      email,
      code_hash: hashCode(code),
      payload,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !draft)
    return {
      ok: false,
      message: "No se pudo preparar la confirmación del reporte.",
    };

  await sendEmail({
    to: [email],
    subject: "Confirma tu reporte en CERCA Reencuentro",
    html: `<p>Recibimos tu reporte de <strong>${payload.full_name}</strong>.</p><p>Para publicarlo de forma segura, confirma tu correo con este código:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p><p>Vence en 15 minutos. No lo compartas.</p>`,
  });

  redirect(
    `/reportar/confirmar?draft=${draft.id}&email=${encodeURIComponent(email)}`,
  );
}

const confirmReportSchema = z.object({
  draft_id: z.string().uuid(),
  email: z.string().email(),
  code: z.string().min(6).max(12),
});

export async function confirmMissingReportOtp(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = confirmReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa el código enviado a tu correo." };

  const email = normalizeEmail(parsed.data.email);
  const cleanCode = parsed.data.code.replace(/\D/g, "");

  if (cleanCode.length !== 6) {
    return { ok: false, message: "El código debe tener 6 dígitos." };
  }

  const codeHash = hashCode(cleanCode);
  const db = supabaseAdmin();
  const { data: draft } = await db
    .from("report_drafts")
    .select("id, email, code_hash, payload, expires_at, confirmed_at")
    .eq("id", parsed.data.draft_id)
    .eq("email", email)
    .maybeSingle();

  if (
    !draft ||
    draft.confirmed_at ||
    draft.code_hash !== codeHash ||
    new Date(draft.expires_at).getTime() < Date.now()
  ) {
    return {
      ok: false,
      message:
        "Código inválido o vencido. Vuelve a enviar el reporte para recibir otro código.",
    };
  }

  const payload = draft.payload as any;
  const public_code = crypto.randomUUID().slice(0, 8);
  const ownerToken = newOwnerToken();

  const { data: person, error: personError } = await db
    .from("person_cases")
    .insert({
      public_code,
      owner_token_hash: tokenHash(ownerToken),
      owner_email: email,
      owner_name: payload.reporter_name,
      full_name: payload.full_name,
      approximate_age: payload.approximate_age,
      document_id: payload.document_id || null,
      document_last4: payload.document_last4 || null,
      photo_url: payload.photo_url,
      status: "missing",
      last_seen_location: payload.last_seen_location,
      last_seen_at: payload.last_seen_at,
      description: payload.description,
    })
    .select("id, public_code, full_name")
    .single();

  if (personError || !person)
    return { ok: false, message: "No se pudo crear el caso." };

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: "missing",
    reporter_name: payload.reporter_name,
    reporter_phone: payload.reporter_phone,
    reporter_email: email,
    reporter_relationship: payload.reporter_relationship,
    notes: payload.description,
    verification_status: "pending",
    visibility: "private",
  });

  await db
    .from("report_drafts")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", draft.id);

  const publicUrl = `${baseUrl()}/casos/${person.public_code}`;
  const manageUrl = `${publicUrl}?token=${ownerToken}`;
  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nuevo caso confirmado: ${person.full_name}`,
      html: `<p>Se confirmó un nuevo caso.</p><p><strong>${person.full_name}</strong></p><p><a href="${publicUrl}">${publicUrl}</a></p>`,
    });
  }
  await sendEmail({
    to: [email],
    subject: `Tu reporte fue publicado: ${person.full_name}`,
    html: `<p>Gracias por confirmar tu correo.</p><p>Ficha pública: <a href="${publicUrl}">${publicUrl}</a></p><p>Enlace privado de gestión: <a href="${manageUrl}">${manageUrl}</a></p><p>También puedes entrar a tu panel con OTP desde <a href="${baseUrl()}/mi-cuenta">Mis reportes</a>.</p>`,
  });

  await maybeCreatePossibleMatchesForMissingCase(person.id);

  await setSession(email, { allowPublicFallback: true });
  revalidatePath("/");
  redirect(`/casos/${person.public_code}?creado=1&token=${ownerToken}`);
}


const volunteerRegistrationSchema = z.object({
  full_name: z.string().min(3).max(160),
  email: z.string().email(),
  phone: z.string().min(6).max(80),
  zone: z.string().min(2).max(160),
  organization_name: z.string().max(160).optional(),
  center_name: z.string().max(160).optional(),
  type_of_help: z.string().max(800).optional(),
});

export async function requestVolunteerRegistrationOtp(
  _: unknown,
  formData: FormData,
) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = volunteerRegistrationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos obligatorios." };
  }

  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const code = newOtpCode();
  const db = supabaseAdmin();

  const { error } = await db.from("report_drafts").insert({
    email,
    code_hash: hashCode(code),
    payload: {
      kind: "volunteer_registration",
      full_name: data.full_name.trim(),
      email,
      phone: data.phone.trim(),
      zone: data.zone.trim(),
      organization_name: data.organization_name?.trim() || null,
      center_name: data.center_name?.trim() || null,
      type_of_help: data.type_of_help?.trim() || null,
    },
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  if (error) {
    return { ok: false, message: "No se pudo preparar la confirmación." };
  }

  await sendEmail({
    to: [email],
    subject: "Confirma tu registro voluntario en CERCA Reencuentro",
    html: `<p>Recibimos tu solicitud para registrarte como voluntario/a.</p><p>Confirma tu correo con este código:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p><p>Vence en 15 minutos. No lo compartas.</p>`,
  });

  redirect(`/voluntarios/confirmar?email=${encodeURIComponent(email)}`);
}

const confirmVolunteerRegistrationSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(12),
});

export async function confirmVolunteerRegistrationOtp(
  _: unknown,
  formData: FormData,
) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = confirmVolunteerRegistrationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, message: "Revisa el correo y el código." };
  }

  const email = normalizeEmail(parsed.data.email);
  const codeHash = hashCode(parsed.data.code.replace(/\s+/g, ""));
  const db = supabaseAdmin();
  const { data: drafts } = await db
    .from("report_drafts")
    .select("id, code_hash, payload, expires_at, confirmed_at")
    .eq("email", email)
    .is("confirmed_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const draft = (drafts || []).find(
    (item: any) => item?.payload?.kind === "volunteer_registration",
  ) as any;

  if (
    !draft ||
    draft.code_hash !== codeHash ||
    new Date(draft.expires_at).getTime() < Date.now()
  ) {
    return { ok: false, message: "Código inválido o vencido." };
  }

  const payload = draft.payload as any;
  const { error } = await db.from("volunteer_profiles").upsert(
    {
      email,
      full_name: String(payload.full_name || "").trim(),
      phone: String(payload.phone || "").trim(),
      zone: String(payload.zone || "").trim(),
      organization_name: payload.organization_name || null,
      center_name: payload.center_name || null,
      role: "volunteer",
      verification_status: "self_registered",
      trust_score: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (error) {
    return { ok: false, message: "No se pudo crear el perfil voluntario." };
  }

  await db
    .from("report_drafts")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", draft.id);

  if (payload.type_of_help) {
    await db.from("trust_events").insert({
      actor_email: email,
      event_type: "volunteer_self_registered",
      points: 0,
      notes: `type_of_help: ${payload.type_of_help}`,
    });
  }

  await setSession(email);
  revalidatePath("/voluntario");
  redirect("/voluntario");
}

const infoSchema = z.object({
  person_id: z.string().uuid(),
  info_name: z.string().min(3).max(160),
  info_phone: z.string().min(6).max(80),
  info_email: z.string().email().optional().or(z.literal("")),
  seen_location: z.string().min(3).max(280),
  seen_at: z.string().optional(),
  notes: z.string().min(8).max(1500),
  evidence_url: z.string().url().optional().or(z.literal("")),
});

export async function submitInfo(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar el aviso." };
  const parsed = infoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa la información enviada." };
  const data = parsed.data;
  const db = supabaseAdmin();

  const { data: person } = await db
    .from("person_cases")
    .select("id, public_code, full_name")
    .eq("id", data.person_id)
    .single();
  if (!person) return { ok: false, message: "No se encontró el caso." };

  let evidencePath: string | null = null;
  try {
    evidencePath = await uploadPrivateEvidence(
      file(formData, "evidence_file"),
      "sightings",
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo subir la evidencia.",
    };
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
    visibility: "private",
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nueva información sobre ${person.full_name}`,
      html: `<p>Alguien envió información sobre <strong>${person.full_name}</strong>.</p><p>Ubicación: ${data.seen_location}</p><p>Notas: ${data.notes}</p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`,
    });
  }

  return {
    ok: true,
    message:
      "Gracias. La información fue enviada para revisión; no cambiará el estado hasta validarse.",
  };
}

const ownerFoundSchema = z.object({
  public_code: z.string().min(4).max(32),
  token: z.string().min(16).max(120),
  location: z.string().min(3).max(280),
  notes: z.string().max(1200).optional(),
});

export async function requestOwnerFound(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar la solicitud." };
  const parsed = ownerFoundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revisa la información." };
  const data = parsed.data;
  const db = supabaseAdmin();
  const { data: person } = await db
    .from("person_cases")
    .select("id, full_name, public_code, owner_token_hash, owner_email")
    .eq("public_code", data.public_code)
    .single();

  if (
    !person ||
    !person.owner_token_hash ||
    person.owner_token_hash !== tokenHash(data.token)
  ) {
    return { ok: false, message: "El enlace privado no es válido." };
  }

  let evidencePath: string | null = null;
  try {
    evidencePath = await uploadPrivateEvidence(
      file(formData, "evidence_file"),
      "owner-found",
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo subir la foto.",
    };
  }

  await db
    .from("person_cases")
    .update({
      status: "located",
      current_location: data.location,
      updated_at: new Date().toISOString(),
    })
    .eq("id", person.id);

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: "found",
    reporter_name: "Reportante original",
    reporter_phone: "Privado: enlace del reportante",
    reporter_relationship: "reportante original",
    seen_location: data.location,
    notes:
      data.notes || "El reportante original marcó el caso como encontrado/a.",
    evidence_file_path: evidencePath,
    verification_status: "verified",
    visibility: "private",
  });

  await db.from("verification_logs").insert({
    person_id: person.id,
    action: "owner_status:located",
    notes: data.notes || data.location,
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Caso marcado como encontrado por reportante: ${person.full_name}`,
      html: `<p>El reportante original marcó a <strong>${person.full_name}</strong> como encontrado/a.</p><p>Ubicación: ${data.location}</p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`,
    });
  }

  await notifyCaseOwner(
    person.id,
    `Actualizaste el caso: ${person.full_name}`,
    `<p>Marcaste a <strong>${person.full_name}</strong> como <strong>${statusLabels.located}</strong>.</p><p><strong>Ubicación:</strong> ${data.location}</p><p><a href="${baseUrl()}/casos/${person.public_code}">Ver ficha pública</a></p>`,
  );
  await notifyCaseSubscribers(
    person.id,
    `Actualización de caso: ${person.full_name}`,
    `<p>El caso de <strong>${person.full_name}</strong> cambió de estado a <strong>${statusLabels.located}</strong>.</p><p><strong>Ubicación:</strong> ${data.location}</p><p><a href="${baseUrl()}/casos/${person.public_code}">Ver ficha pública</a></p>`,
  );

  revalidatePath("/");
  revalidatePath(`/casos/${person.public_code}`);
  revalidatePath("/mi-cuenta");
  return {
    ok: true,
    message:
      "Listo. El caso fue marcado como localizado y se enviaron actualizaciones por correo.",
  };
}

const ownerStatusSchema = z.object({
  person_id: z.string().uuid(),
  status: z.enum([
    "located",
    "safe",
    "hospitalized",
    "found_alive",
    "reunified",
  ]),
  location: z.string().min(3).max(280),
  notes: z.string().max(1200).optional(),
});

export async function ownerUpdateCaseStatus(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar la actualización." };
  const session = await currentSession();
  if (!session)
    return {
      ok: false,
      message:
        "Debes entrar con el correo del reportante para actualizar este caso.",
    };

  const parsed = ownerStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa el estado, ubicación y notas." };
  const data = parsed.data;
  const db = supabaseAdmin();

  const { data: person } = await db
    .from("person_cases")
    .select("id, full_name, public_code, owner_email, owner_name")
    .eq("id", data.person_id)
    .maybeSingle();

  if (
    !person ||
    normalizeEmail(String(person.owner_email || "")) !== session.email
  ) {
    return {
      ok: false,
      message: "No puedes actualizar un caso que no fue creado con tu correo.",
    };
  }

  let evidencePath: string | null = null;
  try {
    evidencePath = await uploadPrivateEvidence(
      file(formData, "evidence_file"),
      "owner-status",
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo subir la foto.",
    };
  }

  const now = new Date().toISOString();
  await db
    .from("person_cases")
    .update({
      status: data.status,
      current_location: data.location.trim(),
      updated_at: now,
    })
    .eq("id", person.id);

  await db.from("case_reports").insert({
    person_id: person.id,
    report_type: data.status === "safe" ? "safe" : "found",
    reporter_name: person.owner_name || "Reportante original",
    reporter_phone: "Privado: reportante autenticado",
    reporter_email: session.email,
    reporter_relationship: "reportante original",
    seen_location: data.location.trim(),
    notes:
      data.notes?.trim() ||
      `El reportante original actualizó el estado a ${statusLabels[data.status]}.`,
    evidence_file_path: evidencePath,
    verification_status: "verified",
    visibility: "private",
  });

  await db.from("verification_logs").insert({
    person_id: person.id,
    action: `owner_status:${data.status}`,
    notes: data.notes?.trim() || data.location.trim(),
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Actualización por reportante: ${person.full_name}`,
      html: `<p>El reportante original actualizó el caso de <strong>${person.full_name}</strong>.</p><p><strong>Nuevo estado:</strong> ${statusLabels[data.status]}</p><p><strong>Ubicación:</strong> ${data.location}</p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`,
    });
  }

  await notifyCaseOwner(
    person.id,
    `Actualizaste el caso: ${person.full_name}`,
    `<p>Actualizaste el caso de <strong>${person.full_name}</strong> a <strong>${statusLabels[data.status]}</strong>.</p><p><strong>Ubicación:</strong> ${data.location}</p><p><a href="${baseUrl()}/casos/${person.public_code}">Ver ficha pública</a></p>`,
  );
  await notifyCaseSubscribers(
    person.id,
    `Actualización de caso: ${person.full_name}`,
    `<p>El caso de <strong>${person.full_name}</strong> cambió de estado a <strong>${statusLabels[data.status]}</strong>.</p><p><strong>Ubicación:</strong> ${data.location}</p><p><a href="${baseUrl()}/casos/${person.public_code}">Ver ficha pública</a></p>`,
  );

  revalidatePath("/");
  revalidatePath("/mi-cuenta");
  revalidatePath(`/casos/${person.public_code}`);
  return {
    ok: true,
    message:
      "Actualización publicada. Enviamos correo al reportante, suscriptores y moderadores.",
  };
}

const foundListSchema = z.object({
  uploader_name: z.string().min(3).max(160),
  uploader_phone: z.string().min(6).max(80),
  uploader_email: z.string().email().optional().or(z.literal("")),
  source_name: z.string().min(2).max(160),
  source_location: z.string().min(2).max(180),
  rows_text: z.string().max(20000).optional(),
});

export async function uploadFoundList(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar el listado." };
  const parsed = foundListSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisa los datos del responsable, fuente y ubicación.",
    };
  const data = parsed.data;
  const uploadedList = file(formData, "list_file") || file(formData, "csv_file");
  const evidenceFile = file(formData, "evidence_file");
  const rows = [...parseFoundCsv(data.rows_text || "")];

  if (uploadedList) {
    try {
      const buffer = Buffer.from(await uploadedList.arrayBuffer());
      if (isSpreadsheetFile(uploadedList.name, uploadedList.type)) {
        rows.push(...parseFoundWorkbook(buffer, uploadedList.name));
      } else {
        rows.push(...parseFoundCsv(buffer.toString("utf8")));
      }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? `No se pudo leer el archivo: ${error.message}`
            : "No se pudo leer el archivo.",
      };
    }
  }

  if (!rows.length) {
    return {
      ok: false,
      message:
        "No encontré filas válidas. Incluye ubicación o centro/refugio por cada fila.",
    };
  }

  let originalFilePath: string | null = null;
  let evidencePath: string | null = null;
  try {
    originalFilePath = await uploadPrivateFile(
      uploadedList,
      "uploads/original-lists",
    );
    evidencePath = await uploadPrivateEvidence(evidenceFile, "found-list-evidence");
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los archivos del lote.",
    };
  }

  const db = supabaseAdmin();
  const session = await currentSession();
  const uploaderEmail = session?.email || (data.uploader_email ? normalizeEmail(data.uploader_email) : null);
  const now = new Date().toISOString();

  const { data: batch, error: batchError } = await db
    .from("upload_batches")
    .insert({
      uploaded_by_email: uploaderEmail,
      uploaded_by_name: data.uploader_name.trim(),
      uploaded_by_phone: data.uploader_phone.trim(),
      source_name: data.source_name.trim(),
      source_location: data.source_location.trim(),
      original_file_path: originalFilePath,
      evidence_file_path: evidencePath,
      row_count: 0,
      created_at: now,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { ok: false, message: "No se pudo crear el lote de carga." };
  }

  const inserted: { id: string }[] = [];
  let skippedDuplicates = 0;
  let possibleMatchCount = 0;

  for (const row of rows) {
    const rowDoc = normalizeDocumentId(row.document_id || "");
    if (rowDoc) {
      const { data: existingFound } = await db
        .from("found_records")
        .select("id")
        .eq("document_id", rowDoc)
        .neq("status", "discarded")
        .maybeSingle();
      if (existingFound) {
        skippedDuplicates += 1;
        continue;
      }
    }

    const fullName = row.full_name?.trim() || null;
    const status = fullName ? "partially_identified" : "unidentified";
    const sensitivityLevel = foundSensitivityLevel(status, fullName, null);
    const notesPrivate = row.source_sheet ? `Hoja: ${row.source_sheet}` : null;
    const public_code = crypto.randomUUID().slice(0, 8);
    const { data: found, error } = await db
      .from("found_records")
      .insert({
        public_code,
        upload_batch_id: batch.id,
        created_by_email: uploaderEmail,
        created_by_name: data.uploader_name.trim(),
        created_by_phone: data.uploader_phone.trim(),
        source_name: data.source_name.trim(),
        full_name: fullName,
        normalized_name: normalizeNameForSearch(fullName),
        document_id: rowDoc || null,
        document_last4: documentLast4(rowDoc),
        approximate_age: row.approximate_age ?? null,
        evidence_file_path: evidencePath,
        status,
        sensitivity_level: sensitivityLevel,
        current_location: row.current_location,
        notes_public: row.notes_public,
        notes_private: notesPrivate,
        created_at: now,
        updated_at: now,
      })
      .select("id, public_code, full_name, current_location, source_name")
      .single();

    if (!error && found) {
      inserted.push(found);
      await db.from("found_record_reports").insert({
        found_record_id: found.id,
        reporter_name: data.uploader_name.trim(),
        reporter_phone: data.uploader_phone.trim(),
        reporter_email: uploaderEmail,
        source_name: data.source_name.trim(),
        report_type: "found_upload",
        location: row.current_location,
        notes:
          row.notes_public ||
          notesPrivate ||
          `Listado cargado por ${data.source_name}`,
        evidence_file_path: evidencePath,
        verification_status: "pending",
        visibility: "private",
      });
      const matchResult = await maybeCreatePossibleMatchesForFoundRecord(found.id);
      possibleMatchCount += matchResult.created;
    }
  }

  await db
    .from("upload_batches")
    .update({ row_count: inserted.length })
    .eq("id", batch.id);

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nuevo listado de encontrados (${inserted.length})`,
      html: `<p>${data.uploader_name} cargó ${inserted.length} registros de personas encontradas.</p><p>Fuente: ${data.source_name}</p><p>Ubicación/fuente: ${data.source_location}</p><p>Duplicados omitidos: ${skippedDuplicates}</p><p>Posibles coincidencias: ${possibleMatchCount}</p><p><a href="${baseUrl()}/encontrados/lotes/${batch.id}">Ver lote</a></p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`,
    });
  }

  revalidatePath("/");
  revalidatePath("/voluntario");
  revalidatePath(`/encontrados/lotes/${batch.id}`);
  return {
    ok: true,
    message: `Listado recibido: ${inserted.length} insertado(s), ${skippedDuplicates} duplicado(s) omitido(s), ${possibleMatchCount} posible(s) coincidencia(s).`,
  };
}
export async function updateCaseStatus(formData: FormData) {
  if (!(await isAdmin())) throw new Error("No autorizado");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as CaseStatus;
  const note = String(formData.get("note") || "Cambio de estado");
  const allowed = Object.keys(statusLabels);
  if (!allowed.includes(status)) throw new Error("Estado inválido");

  const db = supabaseAdmin();
  await db
    .from("person_cases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  await db
    .from("verification_logs")
    .insert({ person_id: id, action: `status:${status}`, notes: note });
  const { data: person } = await db
    .from("person_cases")
    .select("full_name, public_code, status")
    .eq("id", id)
    .maybeSingle();
  if (person) {
    const html = `<p>El caso de <strong>${person.full_name}</strong> cambió de estado a <strong>${statusLabels[status]}</strong>.</p><p>${note || "Actualización de estado."}</p><p><a href="${baseUrl()}/casos/${person.public_code}">Ver ficha</a></p>`;
    await notifyCaseOwner(
      id,
      `Actualización de tu reporte: ${person.full_name}`,
      html,
    );
    await notifyCaseSubscribers(
      id,
      `Actualización de caso: ${person.full_name}`,
      html,
    );
  }
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function markReportReviewed(formData: FormData) {
  if (!(await isAdmin())) throw new Error("No autorizado");
  const id = String(formData.get("id"));
  const status = String(formData.get("verification_status"));
  const db = supabaseAdmin();
  await db
    .from("case_reports")
    .update({ verification_status: status })
    .eq("id", id);
  if (status === "verified") {
    const { data: report } = await db
      .from("case_reports")
      .select(
        "person_id, notes, seen_location, person_cases(full_name, public_code)",
      )
      .eq("id", id)
      .maybeSingle();
    const pc: any = Array.isArray((report as any)?.person_cases)
      ? (report as any).person_cases[0]
      : (report as any)?.person_cases;
    if (report?.person_id && pc) {
      await notifyCaseSubscribers(
        report.person_id,
        `Nueva información verificada: ${pc.full_name}`,
        `<p>Hay nueva información verificada sobre <strong>${pc.full_name}</strong>.</p><p><strong>Ubicación:</strong> ${(report as any).seen_location || "No indicada"}</p><p><a href="${baseUrl()}/casos/${pc.public_code}">Ver ficha</a></p>`,
      );
    }
  }
  revalidatePath("/admin");
}

const foundStatusSchema = z.enum([
  "unidentified",
  "partially_identified",
  "safe",
  "hospitalized",
  "transferred",
  "minor_unaccompanied",
  "deceased_unidentified",
]);

const foundPersonSchema = z.object({
  full_name: z.string().max(160).optional(),
  document_id: z.string().max(40).optional(),
  current_location: z.string().min(3).max(280),
  found_location: z.string().max(280).optional(),
  destination: z.string().max(280).optional(),
  found_at: z.string().optional(),
  approximate_age: z.coerce
    .number()
    .int()
    .min(0)
    .max(120)
    .optional()
    .or(z.literal("")),
  apparent_gender: z.enum(["female", "male", "unknown"]).optional().or(z.literal("")),
  status: foundStatusSchema,
  notes_public: z.string().max(1200).optional(),
  notes_private: z.string().max(2000).optional(),
  reporter_name: z.string().min(3).max(160),
  reporter_phone: z.string().min(6).max(80),
  reporter_email: z.string().email().optional().or(z.literal("")),
  source_name: z.string().min(2).max(160),
});

export async function createFoundPersonReport(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar el reporte." };
  const parsed = foundPersonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa los campos obligatorios." };

  const data = parsed.data;
  const session = await currentSession();
  const db = supabaseAdmin();
  const normalizedDoc = normalizeDocumentId(text(formData, "document_id"));
  const fullName = data.full_name?.trim() || null;
  const reporterEmail = data.reporter_email ? normalizeEmail(data.reporter_email) : null;
  const createdByEmail = session?.email || reporterEmail;
  const ageRaw = text(formData, "approximate_age");
  const ageValue = ageRaw ? Number(ageRaw) : null;

  let photoUrl: string | null = null;
  let evidencePath: string | null = null;
  try {
    photoUrl = await uploadPublicCasePhoto(
      file(formData, "photo_file"),
      "found",
    );
    evidencePath = await uploadPrivateEvidence(
      file(formData, "evidence_file"),
      "found-reports",
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo subir la foto.",
    };
  }

  const public_code = crypto.randomUUID().slice(0, 8);
  const sensitivityLevel = foundSensitivityLevel(data.status, fullName, photoUrl);
  const now = new Date().toISOString();

  const { data: found, error } = await db
    .from("found_records")
    .insert({
      public_code,
      created_by_email: createdByEmail,
      created_by_name: data.reporter_name.trim(),
      created_by_phone: data.reporter_phone.trim(),
      source_name: data.source_name.trim(),
      full_name: fullName,
      normalized_name: normalizeNameForSearch(fullName),
      document_id: normalizedDoc || null,
      document_last4: documentLast4(normalizedDoc),
      approximate_age: ageValue,
      apparent_gender: data.apparent_gender || null,
      photo_url: photoUrl,
      evidence_file_path: evidencePath,
      status: data.status,
      sensitivity_level: sensitivityLevel,
      found_location: data.found_location?.trim() || null,
      current_location: data.current_location.trim(),
      destination: data.destination?.trim() || null,
      notes_public: data.notes_public?.trim() || null,
      notes_private: data.notes_private?.trim() || null,
      found_at: optionalIsoDateTime(data.found_at),
      created_at: now,
      updated_at: now,
    })
    .select("id, public_code, full_name, current_location, source_name")
    .single();

  if (error || !found)
    return { ok: false, message: "No se pudo crear el reporte de encontrado." };

  await db.from("found_record_reports").insert({
    found_record_id: found.id,
    reporter_name: data.reporter_name.trim(),
    reporter_phone: data.reporter_phone.trim(),
    reporter_email: reporterEmail,
    source_name: data.source_name.trim(),
    report_type: "found_upload",
    location: data.current_location.trim(),
    notes: data.notes_private?.trim() || data.notes_public?.trim() || null,
    evidence_file_path: evidencePath,
    verification_status: "pending",
    visibility: "private",
  });

  await maybeCreatePossibleMatchesForFoundRecord(found.id);

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nueva persona encontrada: ${fullName || "sin identificar"}`,
      html: `<p>Se reportó una persona encontrada: <strong>${fullName || "sin identificar"}</strong>.</p><p>Estado: ${data.status}</p><p>Ubicación: ${data.current_location}</p><p><a href="${baseUrl()}/encontrados/${found.public_code}">Ver ficha pública</a></p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`,
    });
  }

  revalidatePath("/");
  revalidatePath("/voluntario");
  revalidatePath(`/encontrados/${found.public_code}`);
  redirect(`/encontrados/${found.public_code}`);
}

const foundRecordReportSchema = z.object({
  found_record_id: z.string().uuid(),
  report_type: z.enum(["identity_tip", "correction"]),
  reporter_name: z.string().min(3).max(160),
  reporter_phone: z.string().min(6).max(80),
  reporter_email: z.string().email().optional().or(z.literal("")),
  notes: z.string().min(8).max(1500),
});

export async function submitFoundRecordReport(_: unknown, formData: FormData) {
  if (isSpam(formData))
    return { ok: false, message: "No se pudo procesar el aviso." };
  const parsed = foundRecordReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa la información enviada." };
  const data = parsed.data;
  const db = supabaseAdmin();
  const { data: found } = await db
    .from("found_records")
    .select("id, public_code, full_name")
    .eq("id", data.found_record_id)
    .maybeSingle();
  if (!found) return { ok: false, message: "No se encontró la ficha." };

  let evidencePath: string | null = null;
  try {
    evidencePath = await uploadPrivateEvidence(
      file(formData, "evidence_file"),
      "found-public-reports",
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo subir la evidencia.",
    };
  }

  await db.from("found_record_reports").insert({
    found_record_id: found.id,
    reporter_name: data.reporter_name.trim(),
    reporter_phone: data.reporter_phone.trim(),
    reporter_email: data.reporter_email ? normalizeEmail(data.reporter_email) : null,
    source_name: "ficha pública",
    report_type: data.report_type,
    notes: data.notes.trim(),
    evidence_file_path: evidencePath,
    verification_status: "pending",
    visibility: "private",
  });

  const admins = adminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `Nuevo aviso sobre encontrado: ${found.full_name || found.public_code}`,
      html: `<p>Recibimos un aviso de tipo <strong>${data.report_type}</strong> sobre <strong>${found.full_name || "persona sin identificar"}</strong>.</p><p>${data.notes}</p><p><a href="${baseUrl()}/encontrados/${found.public_code}">Ver ficha</a></p><p><a href="${baseUrl()}/admin">Revisar en admin</a></p>`,
    });
  }

  return {
    ok: true,
    message: "Gracias. La información fue enviada para revisión privada.",
  };
}

export async function requestFoundRecordSubscription(
  prev: GenericSubscriptionRequestState,
  formData: FormData,
) {
  const nextFormData = new FormData();
  formData.forEach((value, key) => nextFormData.append(key, value));
  nextFormData.set("subject_type", "found_record");
  nextFormData.set("subject_id", text(formData, "found_record_id"));
  const state = await requestGenericSubscription(prev, nextFormData);
  return {
    ...state,
    foundRecordId: state.subjectId,
  };
}

export async function confirmFoundRecordSubscription(
  prev: GenericSubscriptionConfirmState,
  formData: FormData,
) {
  const nextFormData = new FormData();
  formData.forEach((value, key) => nextFormData.append(key, value));
  nextFormData.set("subject_type", "found_record");
  nextFormData.set("subject_id", text(formData, "found_record_id"));
  return confirmGenericSubscription(prev, nextFormData);
}
const otpRequestSchema = z.object({ email: z.string().email() });

export async function requestLoginOtp(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = otpRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Indica un correo válido." };
  const email = normalizeEmail(parsed.data.email);
  const db = supabaseAdmin();
  let allowed = isAdminEmail(email);
  if (!allowed) {
    const { count: volunteerCount } = await db
      .from("volunteer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("email", email);
    allowed = Boolean(volunteerCount && volunteerCount > 0);
  }
  if (!allowed) {
    const { count: caseCount } = await db
      .from("person_cases")
      .select("id", { count: "exact", head: true })
      .eq("owner_email", email);
    allowed = Boolean(caseCount && caseCount > 0);
  }

  // Respuesta genérica para no revelar si el correo tiene reportes.
  if (!allowed)
    return {
      ok: true,
      message:
        "Si el correo tiene reportes o acceso autorizado, enviaremos un código de acceso.",
    };

  const code = newOtpCode();
  await db.from("otp_codes").insert({
    email,
    code_hash: hashCode(code),
    purpose: "login",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  await sendEmail({
    to: [email],
    subject: "Código de acceso a CERCA Reencuentro",
    html: `<p>Tu código de acceso es:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p><p>Vence en 10 minutos. No lo compartas.</p>`,
  });
  return {
    ok: true,
    message: "Te enviamos un código de 6 dígitos. Revisa tu correo.",
  };
}

const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(12),
});

export async function verifyLoginOtp(_: unknown, formData: FormData) {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = otpVerifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Revisa el correo y el código." };
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
  await db
    .from("otp_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otp.id);
  const session = await setSession(email);
  redirect(session.role === "admin" ? "/admin" : "/mi-cuenta");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

const aidResourceSchema = z.object({
  kind: z.enum([
    "collection_center",
    "specific_request",
    "news",
    "emergency_contact",
    "tip",
  ]),
  title: z.string().min(3).max(180),
  location: z.string().max(240).optional(),
  description: z.string().min(5).max(2000),
  contact_name: z.string().max(160).optional(),
  contact_phone: z.string().max(100).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
  priority: z.enum(["normal", "high", "critical"]).default("normal"),
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
    is_published: true,
  });
  if (error) return { ok: false, message: "No se pudo publicar." };
  revalidatePath("/");
  revalidatePath("/ayudar");
  return { ok: true, message: "Información publicada." };
}

export async function deleteAidResource(formData: FormData) {
  if (!(await isAdmin())) throw new Error("No autorizado");
  const id = String(formData.get("id") || "");
  await supabaseAdmin()
    .from("aid_resources")
    .update({ is_published: false })
    .eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/ayudar");
}

const survivorImportSchema = z.object({
  source_name: z.string().min(2).max(160),
  notes: z.string().max(500).optional(),
});

export async function importSurvivorFile(_: unknown, formData: FormData) {
  if (!(await isAdmin())) return { ok: false, message: "No autorizado." };
  const parsed = survivorImportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, message: "Indica la fuente del listado." };
  const uploaded = file(formData, "survivor_file");
  if (!uploaded)
    return { ok: false, message: "Sube un archivo CSV, XLS o XLSX." };
  if (uploaded.size > 5 * 1024 * 1024)
    return { ok: false, message: "Archivo demasiado grande. Máximo 5 MB." };

  const name = uploaded.name.toLowerCase();
  const isSupported =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    uploaded.type.includes("spreadsheet") ||
    uploaded.type.includes("csv");
  if (!isSupported)
    return {
      ok: false,
      message: "Formato no soportado. Usa .xlsx, .xls o .csv.",
    };

  const buffer = Buffer.from(await uploaded.arrayBuffer());
  const rows = parseSurvivorWorkbook(buffer, uploaded.name);
  if (!rows.length)
    return {
      ok: false,
      message:
        "No se detectaron pacientes/sobrevivientes válidos en el archivo.",
    };

  const session = await currentSession();
  const db = supabaseAdmin();
  const batchId = crypto.randomUUID();
  const existingDocs = new Set<string>();
  const docs = rows.map((r) => r.document_id).filter(Boolean) as string[];
  if (docs.length) {
    const { data: existing } = await db
      .from("survivor_records")
      .select("document_id")
      .in("document_id", docs.slice(0, 2000));
    for (const e of existing || [])
      if ((e as any).document_id) existingDocs.add((e as any).document_id);
  }
  const payload = rows
    .filter((r) => !r.document_id || !existingDocs.has(r.document_id))
    .slice(0, 2000)
    .map((r) => ({
      import_batch_id: batchId,
      full_name: r.full_name,
      normalized_name: r.normalized_name,
      approximate_age: r.approximate_age,
      document_id: r.document_id,
      document_last4: r.document_last4,
      hospital: r.hospital,
      phone: r.phone,
      address: r.address,
      notes: r.notes,
      source_name: parsed.data.source_name.trim(),
      source_file_name: uploaded.name,
      source_sheet: r.source_sheet,
      imported_by_email: session?.email || null,
      is_published: true,
    }));

  const { error } = await db.from("survivor_records").insert(payload);
  if (error)
    return {
      ok: false,
      message: `No se pudo importar el listado: ${error.message}`,
    };
  revalidatePath("/sobrevivientes");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Listado importado: ${payload.length} sobreviviente(s)/paciente(s). Se omitieron duplicados con la misma cédula si ya existían.`,
  };
}

const genericSubscriptionSubjectSchema = z.enum([
  "missing_case",
  "found_record",
  "upload_batch",
]);

const genericSubscriptionRequestSchema = z.object({
  subject_type: genericSubscriptionSubjectSchema,
  subject_id: z.string().uuid(),
  subscriber_name: z.string().max(160).optional(),
  email: z.string().email(),
});

const genericSubscriptionConfirmSchema = z.object({
  subject_type: genericSubscriptionSubjectSchema,
  subject_id: z.string().uuid(),
  email: z.string().email(),
  code: z.string().min(6).max(12),
});

type SubscriptionSubject = {
  title: string;
  publicUrl: string;
};

async function getSubscriptionSubject(
  subjectType: SubscriptionSubjectType,
  subjectId: string,
): Promise<SubscriptionSubject | null> {
  const db = supabaseAdmin();

  if (subjectType === "missing_case") {
    const { data } = await db
      .from("person_cases")
      .select("id, full_name, public_code")
      .eq("id", subjectId)
      .maybeSingle();
    if (!data) return null;
    return {
      title: String(data.full_name || "caso de desaparición"),
      publicUrl: `${baseUrl()}/casos/${data.public_code}`,
    };
  }

  if (subjectType === "found_record") {
    const { data } = await db
      .from("found_records")
      .select("id, full_name, public_code")
      .eq("id", subjectId)
      .neq("status", "discarded")
      .maybeSingle();
    if (!data) return null;
    return {
      title: String(data.full_name || data.public_code || "persona por identificar"),
      publicUrl: `${baseUrl()}/encontrados/${data.public_code}`,
    };
  }

  const { data } = await db
    .from("upload_batches")
    .select("id, source_name")
    .eq("id", subjectId)
    .maybeSingle();
  if (!data) return null;
  return {
    title: String(data.source_name || "lote de personas encontradas"),
    publicUrl: `${baseUrl()}/encontrados/lotes/${data.id}`,
  };
}

export async function requestGenericSubscription(
  _: GenericSubscriptionRequestState,
  formData: FormData,
): Promise<GenericSubscriptionRequestState> {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = genericSubscriptionRequestSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    return { ok: false, message: "Indica un correo válido." };

  const data = parsed.data;
  const subject = await getSubscriptionSubject(data.subject_type, data.subject_id);
  if (!subject) return { ok: false, message: "No se encontró la ficha." };

  const email = normalizeEmail(data.email);
  const code = newOtpCode();
  const db = supabaseAdmin();
  const { error } = await db.from("generic_subscriptions").upsert(
    {
      subject_type: data.subject_type,
      subject_id: data.subject_id,
      email,
      subscriber_name: data.subscriber_name?.trim() || null,
      code_hash: hashCode(code),
      status: "pending",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "subject_type,subject_id,email" },
  );

  if (error) return { ok: false, message: "No se pudo crear la suscripción." };

  await sendEmail({
    to: [email],
    subject: `Confirma tu suscripción: ${subject.title}`,
    html: `<p>Para recibir actualizaciones sobre <strong>${subject.title}</strong>, confirma con este código:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p><p>Vence en 15 minutos.</p><p><a href="${subject.publicUrl}">Ver ficha</a></p>`,
  });

  return {
    ok: true,
    message: "Te enviamos un código para confirmar la suscripción.",
    subjectType: data.subject_type,
    subjectId: data.subject_id,
    email,
  };
}

export async function confirmGenericSubscription(
  _: GenericSubscriptionConfirmState,
  formData: FormData,
): Promise<GenericSubscriptionConfirmState> {
  if (isSpam(formData)) return { ok: false, message: "No se pudo procesar." };
  const parsed = genericSubscriptionConfirmSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return { ok: false, message: "Revisa el código." };

  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const codeHash = hashCode(data.code.replace(/\s+/g, ""));
  const db = supabaseAdmin();
  const { data: sub } = await db
    .from("generic_subscriptions")
    .select("id, code_hash, expires_at")
    .eq("subject_type", data.subject_type)
    .eq("subject_id", data.subject_id)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (
    !sub ||
    sub.code_hash !== codeHash ||
    new Date(sub.expires_at).getTime() < Date.now()
  ) {
    return { ok: false, message: "Código inválido o vencido." };
  }

  const { error } = await db
    .from("generic_subscriptions")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (error) return { ok: false, message: "No se pudo confirmar." };

  return {
    ok: true,
    message:
      "Suscripción confirmada. Te avisaremos por correo cuando haya actualizaciones verificadas.",
  };
}

export async function requestCaseSubscription(
  prev: GenericSubscriptionRequestState,
  formData: FormData,
) {
  const nextFormData = new FormData();
  formData.forEach((value, key) => nextFormData.append(key, value));
  nextFormData.set("subject_type", "missing_case");
  nextFormData.set("subject_id", text(formData, "person_id"));
  const state = await requestGenericSubscription(prev, nextFormData);
  return {
    ...state,
    personId: state.subjectId,
  };
}

export async function confirmCaseSubscription(
  prev: GenericSubscriptionConfirmState,
  formData: FormData,
) {
  const nextFormData = new FormData();
  formData.forEach((value, key) => nextFormData.append(key, value));
  nextFormData.set("subject_type", "missing_case");
  nextFormData.set("subject_id", text(formData, "person_id"));
  return confirmGenericSubscription(prev, nextFormData);
}
