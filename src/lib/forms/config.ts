import { z } from "zod";

export const FORM_KEYS = ["stem-fest", "campus-ambassador"] as const;
export type FormKey = (typeof FORM_KEYS)[number];

export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "date",
  "select",
  "radio",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  email: "Email",
  tel: "Phone number",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  radio: "Multiple choice",
};

const NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function isValidFieldName(name: string): boolean {
  return NAME_RE.test(name);
}

export interface FieldConfig {
  id: string;
  formKey: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  enabled: boolean;
  sortOrder: number;
}

function fieldSchema(field: FieldConfig) {
  let base: z.ZodTypeAny;
  switch (field.type) {
    case "email":
      base = z.string().email("Please enter a valid email address");
      break;
    case "tel":
      base = z
        .string()
        .regex(/^[0-9+\-\s()]{6,30}$/, "Please enter a valid phone number");
      break;
    case "number":
      base = z.string().regex(/^-?\d+(\.\d+)?$/, "Please enter a valid number");
      break;
    case "textarea":
      base = z.string().max(2000, "Keep it under 2 000 characters");
      break;
    case "select":
    case "radio":
      base = z.string().refine(
        (v) => v === "" || field.options.includes(v),
        "Please choose a valid option"
      );
      break;
    default:
      base = z.string().max(500, "Keep it under 500 characters");
  }

  if (field.required) {
    base = base.refine((v) => v.trim().length > 0, "This field is required");
  } else {
    base = z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      base.optional().or(z.literal(""))
    );
  }
  return base;
}

export function buildFormSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = fieldSchema(field);
  }
  return z.object(shape);
}

export function defaultValues(fields: FieldConfig[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) values[field.name] = "";
  return values;
}
