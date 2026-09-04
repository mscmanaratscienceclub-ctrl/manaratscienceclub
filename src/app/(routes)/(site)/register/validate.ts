import { z } from "zod";

export const ambassadorTypeSchema = z.enum(["campus", "batch"]);

export type AmbassadorType = z.infer<typeof ambassadorTypeSchema>;

const phonePattern = /^(?:\+?8801|01)[\s-]?\d{9}$/;

export const ambassadorGenderSchema = z.enum(["male", "female", "other"], {
  message: "Please select your gender",
});

export const ambassadorFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(20, "Phone number looks too long")
    .refine(
      (value) => phonePattern.test(value.replace(/\s+/g, "")),
      "Enter a valid local number, e.g. 01XXXXXXXXX"
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(254, "Email looks too long")
    .pipe(z.email("Enter a valid email address")),
  class: z.string().trim().min(1, "Please enter your class / grade").max(50),
  school: z.string().trim().min(2, "School name must be at least 2 characters").max(200),
  gender: ambassadorGenderSchema,
  facebook: z.string().trim().max(300, "Link looks too long").optional(),
  instagram: z.string().trim().max(300, "Link looks too long").optional(),
  experience: z
    .string()
    .trim()
    .min(1, "Please share your experience")
    .max(2000, "Keep it under 2 000 characters"),
  firstTimeCa: z.enum(["yes", "no"], {
    message: "Please answer this question",
  }),
});

export const ambassadorSubmissionSchema = ambassadorFormSchema.extend({
  type: ambassadorTypeSchema,
});

export type AmbassadorFormValues = z.infer<typeof ambassadorFormSchema>;
export type AmbassadorSubmission = z.infer<typeof ambassadorSubmissionSchema>;
