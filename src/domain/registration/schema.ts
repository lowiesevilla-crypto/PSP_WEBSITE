import { z } from "zod";

const requiredTrimmedString = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: `${label} is invalid.`,
    });

export const membershipRegistrationSchema = z.object({
  firstName: requiredTrimmedString("First name", 100),
  lastName: requiredTrimmedString("Last name", 100),
  middleInitial: optionalTrimmedString(10),
  address: requiredTrimmedString("Address", 500),
  email: z.string().trim().toLowerCase().email().max(254),
  mobile: requiredTrimmedString("Mobile number", 30),
  dateSurvive: requiredDate("Date Survive"),
  surviveLocation: requiredTrimmedString("Location", 250),
  pspBirthdayCode: requiredTrimmedString("PSP Birthday Code", 100),
  birthDate: requiredDate("Date of Birth"),
  chapterId: z.string().trim().min(1, "Chapter is required.").max(191),
  applicationAcknowledged: z.literal(true, {
    error: "Application acknowledgement is required.",
  }),
  privacyAcknowledged: z.literal(true, {
    error: "Data privacy acknowledgement is required.",
  }),
  // Hidden honeypot. Real applicants never populate this field.
  website: z.string().max(0).optional(),
});

export type MembershipRegistrationInput = z.input<
  typeof membershipRegistrationSchema
>;
