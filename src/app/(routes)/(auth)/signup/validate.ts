import { passwordSchema } from "@/lib/auth/password";
import {
  isValidUsername,
  USERNAME_MAX_LENGTH,
} from "@/lib/auth/usernames";
import { z } from "zod";

export const SignUpSchema = z
  .object({
    email: z
      .email({ message: "Invalid email address" })
      .min(1, { message: "Email is required" }),
    name: z.string().min(4, { message: "Must be at least 4 characters" }),
    username: z
      .string()
      .max(USERNAME_MAX_LENGTH, {
        message: `Must be at most ${USERNAME_MAX_LENGTH} characters`,
      })
      .refine(isValidUsername, {
        message: "4-20 letters/numbers only; reserved words aren't allowed",
      }),
    password: passwordSchema,
    confirmPassword: z.string().min(1, {
      message: "Please confirm your password",
    }),
    gender: z.boolean().nonoptional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof SignUpSchema>;
