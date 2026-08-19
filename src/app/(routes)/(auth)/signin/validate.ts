import { z } from "zod";

// Sign-in only checks non-empty — password policy applies at creation time.
// Enforcing a minimum here would lock out accounts created under older rules.
export const SignInSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export type SignInValues = z.infer<typeof SignInSchema>;
