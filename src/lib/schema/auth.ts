import * as z from "zod";

export const signInSchema = z.object({
  username: z
    .string()
    .min(3, "Username is required")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Username may only contain letters, numbers, underscores and dots",
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username is required")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_.]+$/,
        "Username may only contain letters, numbers, underscores and dots",
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/,
        "Password must contain at least one letter and one number and one special character",
      ),
    matchPassword: z.string(),
    email: z.email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    displayUsername: z.string().optional(),
  })
  .refine((data) => data.password === data.matchPassword, {
    message: "Passwords do not match",
    path: ["matchPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
