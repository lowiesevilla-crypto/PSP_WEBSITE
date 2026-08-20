import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const membershipRegistrationSchema = z.object({
  chapterId: z.string().trim().min(1).max(191),
  firstName: z.string().trim().min(1).max(100),
  middleName: optionalTrimmedString(100),
  lastName: z.string().trim().min(1).max(100),
  suffix: optionalTrimmedString(30),
  email: z.string().trim().toLowerCase().email().max(254),
  mobile: optionalTrimmedString(30),
  birthDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined))
    .refine((value) => !value || !Number.isNaN(value.getTime()), {
      message: "Birth date is invalid.",
    }),
  address: optionalTrimmedString(500),
  // Hidden honeypot. Real applicants never populate this field.
  website: z.string().max(0).optional(),
});

export type MembershipRegistrationInput = z.input<
  typeof membershipRegistrationSchema
>;
