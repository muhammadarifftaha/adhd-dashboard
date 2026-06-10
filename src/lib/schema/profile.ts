import * as z from "zod";

// Editable profile fields that the update action persists. Username and email
// are intentionally excluded — changing them needs dedicated flows (uniqueness
// normalization / email re-verification), not a generic profile save.
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  // Optional and empty-tolerant: clearing the field is allowed (stored as null).
  displayUsername: z
    .string()
    .max(30, "Display username must be at most 30 characters")
    .optional(),
  userInitials: z
    .string()
    .max(2, "Initials must be at most 2 characters")
    .optional(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
