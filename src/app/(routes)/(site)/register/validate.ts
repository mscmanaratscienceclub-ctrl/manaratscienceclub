import { z } from "zod";

export const ambassadorTypeSchema = z.enum(["campus", "batch"]);

export type AmbassadorType = z.infer<typeof ambassadorTypeSchema>;

export const ambassadorFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  class: z.string().trim().min(1, "Please enter your class / grade").max(50),
  school: z.string().trim().min(2, "School name must be at least 2 characters").max(200),
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
