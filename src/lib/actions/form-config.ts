"use server";

import { db } from "@/db";
import { formFields, formSubmissions } from "@/db/schema/form-fields";
import { getServerSession } from "@/lib/auth/get-session";
import { buildFormSchema, type FieldConfig, type FieldType, type FormKey } from "@/lib/forms/config";
import { and, asc, desc, eq } from "drizzle-orm";

function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("Unauthorized: Admin only");
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertAdmin(role);
}

function toConfig(row: typeof formFields.$inferSelect): FieldConfig {
  return {
    id: row.id,
    formKey: row.formKey,
    name: row.name,
    label: row.label,
    type: row.type as FieldType,
    placeholder: row.placeholder,
    helpText: row.helpText,
    required: row.required,
    options: row.options ?? [],
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

const DEFAULT_FIELDS: Record<FormKey, Omit<FieldConfig, "id" | "formKey">[]> = {
  "stem-fest": [
    { name: "name", label: "Full Name", type: "text", placeholder: "e.g. Ahmed Al-Rashid", helpText: "", required: true, options: [], enabled: true, sortOrder: 0 },
    { name: "class", label: "Class / Grade", type: "text", placeholder: "e.g. Grade 11", helpText: "e.g. Grade 10, Class XI", required: true, options: [], enabled: true, sortOrder: 1 },
    { name: "school", label: "School", type: "text", placeholder: "Your school name", helpText: "", required: true, options: [], enabled: true, sortOrder: 2 },
    { name: "segment", label: "Segment", type: "select", placeholder: "Choose a segment", helpText: "", required: true, options: ["Science Olympiad", "Robotics", "Science Fair", "Quiz", "Art & Poster"], enabled: true, sortOrder: 3 },
    { name: "transactionId", label: "Transaction ID", type: "text", placeholder: "bKash / Nagad transaction ID", helpText: "", required: true, options: [], enabled: true, sortOrder: 4 },
    { name: "paymentNumber", label: "Payment Number", type: "tel", placeholder: "01XXXXXXXXX", helpText: "", required: true, options: [], enabled: true, sortOrder: 5 },
  ],
  "campus-ambassador": [
    { name: "name", label: "Full Name", type: "text", placeholder: "e.g. Ahmed Al-Rashid", helpText: "", required: true, options: [], enabled: true, sortOrder: 0 },
    { name: "class", label: "Class / Grade", type: "text", placeholder: "e.g. Grade 11", helpText: "e.g. Grade 10, Class XI", required: true, options: [], enabled: true, sortOrder: 1 },
    { name: "school", label: "School", type: "text", placeholder: "Your school name", helpText: "", required: true, options: [], enabled: true, sortOrder: 2 },
    { name: "experience", label: "Experience", type: "textarea", placeholder: "Tell us about your experience…", helpText: "Clubs, leadership roles, or relevant experience.", required: true, options: [], enabled: true, sortOrder: 3 },
    { name: "firstTimeCa", label: "Is this your first time being a CA?", type: "radio", placeholder: "", helpText: "", required: true, options: ["yes", "no"], enabled: true, sortOrder: 4 },
  ],
};

async function ensureSeeded(formKey: FormKey) {
  const existing = await db
    .select({ id: formFields.id })
    .from(formFields)
    .where(eq(formFields.formKey, formKey))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(formFields).values(
    DEFAULT_FIELDS[formKey].map((f) => ({ ...f, formKey }))
  );
}

export async function getFormFields(formKey: FormKey): Promise<FieldConfig[]> {
  await ensureSeeded(formKey);
  const rows = await db
    .select()
    .from(formFields)
    .where(and(eq(formFields.formKey, formKey), eq(formFields.enabled, true)))
    .orderBy(asc(formFields.sortOrder));
  return rows.map(toConfig);
}

export async function getAllFormFields(
  formKey: FormKey
): Promise<FieldConfig[]> {
  await requireAdmin();
  await ensureSeeded(formKey);
  const rows = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formKey, formKey))
    .orderBy(asc(formFields.sortOrder));
  return rows.map(toConfig);
}

export interface FieldInput {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
  enabled?: boolean;
}

export async function createFormField(
  formKey: FormKey,
  input: FieldInput
): Promise<{ ok: true; field: FieldConfig } | { ok: false; error: string }> {
  await requireAdmin();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.name)) {
    return { ok: false, error: "Field name must start with a letter and contain only letters, digits and underscores." };
  }
  const last = await db
    .select({ sortOrder: formFields.sortOrder })
    .from(formFields)
    .where(eq(formFields.formKey, formKey))
    .orderBy(asc(formFields.sortOrder));
  const nextSort = last.length ? last[last.length - 1].sortOrder + 1 : 0;
  const [row] = await db
    .insert(formFields)
    .values({
      formKey,
      name: input.name.trim(),
      label: input.label.trim(),
      type: input.type,
      placeholder: input.placeholder?.trim() ?? "",
      helpText: input.helpText?.trim() ?? "",
      required: input.required ?? false,
      options: input.options ?? [],
      enabled: input.enabled ?? true,
      sortOrder: nextSort,
    })
    .returning();
  return { ok: true, field: toConfig(row) };
}

export async function updateFormField(
  id: string,
  input: FieldInput
): Promise<{ ok: true; field: FieldConfig } | { ok: false; error: string }> {
  await requireAdmin();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.name)) {
    return { ok: false, error: "Field name must start with a letter and contain only letters, digits and underscores." };
  }
  const [row] = await db
    .update(formFields)
    .set({
      name: input.name.trim(),
      label: input.label.trim(),
      type: input.type,
      placeholder: input.placeholder?.trim() ?? "",
      helpText: input.helpText?.trim() ?? "",
      required: input.required ?? false,
      options: input.options ?? [],
      updatedAt: new Date(),
    })
    .where(eq(formFields.id, id))
    .returning();
  if (!row) return { ok: false, error: "Field not found." };
  return { ok: true, field: toConfig(row) };
}

export async function toggleFormFieldEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  await requireAdmin();
  await db
    .update(formFields)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(formFields.id, id));
}

export async function deleteFormField(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(formFields).where(eq(formFields.id, id));
}

export async function moveFormField(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  await requireAdmin();
  const rows = await db
    .select()
    .from(formFields)
    .orderBy(asc(formFields.sortOrder));
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;
  const a = rows[index];
  const b = rows[swapIndex];
  await db
    .update(formFields)
    .set({ sortOrder: b.sortOrder, updatedAt: new Date() })
    .where(eq(formFields.id, a.id));
  await db
    .update(formFields)
    .set({ sortOrder: a.sortOrder, updatedAt: new Date() })
    .where(eq(formFields.id, b.id));
}

export interface FormSubmissionView {
  id: string;
  data: Record<string, string>;
  createdAt: string;
}

export async function getAllFormSubmissions(
  formKey: FormKey
): Promise<FormSubmissionView[]> {
  await requireAdmin();
  const rows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.formKey, formKey))
    .orderBy(desc(formSubmissions.createdAt));
  return rows.map((row) => ({
    id: row.id,
    data: row.data,
    createdAt: row.createdAt.toISOString(),
  }));
}

export interface DynamicSubmitResult {
  success: boolean;
  id?: string;
  submittedAt?: string;
  error?: string;
}

export async function submitDynamicForm(
  formKey: FormKey,
  values: Record<string, unknown>
): Promise<DynamicSubmitResult> {
  const fields = await getFormFields(formKey);
  if (fields.length === 0) {
    return { success: false, error: "This form is not accepting responses right now." };
  }

  const schema = buildFormSchema(fields);
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Please fix the highlighted fields and try again." };
  }

  const clean: Record<string, string> = {};
  for (const field of fields) {
    clean[field.name] = String(parsed.data[field.name] ?? "").trim();
  }

  try {
    const [row] = await db
      .insert(formSubmissions)
      .values({ formKey, data: clean })
      .returning({ id: formSubmissions.id, createdAt: formSubmissions.createdAt });
    return {
      success: true,
      id: row.id,
      submittedAt: row.createdAt.toISOString(),
    };
  } catch {
    return { success: false, error: "Failed to submit. Please try again." };
  }
}
