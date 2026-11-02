import { z } from 'zod';

import { ageFromBirthDate } from './nutrition';

// Shared by the app (request bodies) and the API (validation). Ranges match the onboarding pickers,
// including imperial values (66 lb ≈ 29.9 kg) — the DB has looser sanity checks on top.

export const MIN_AGE = 13;
export const MAX_AGE = 100;

const profileFields = z.object({
  sex: z.enum(['male', 'female']),
  birthDate: z.iso.date(),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(29).max(301),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  targetWeightKg: z.number().min(29).max(301).nullable(),
  weeklyRateKg: z.number().min(0).max(2).nullable(),
  unitSystem: z.enum(['metric', 'imperial']),
});

const validAge = (birthDate: string) => {
  const age = ageFromBirthDate(birthDate);
  return age >= MIN_AGE && age <= MAX_AGE;
};
const ageMessage = { path: ['birthDate'], message: `Age must be between ${MIN_AGE} and ${MAX_AGE}` };

export const onboardingSchema = profileFields
  .extend({
    /** IANA time zone of the device, e.g. "Europe/London". */
    timezone: z.string().min(1).max(64).optional(),
  })
  .refine((p) => validAge(p.birthDate), ageMessage);

export type OnboardingRequest = z.infer<typeof onboardingSchema>;

/** `PATCH /api/profile`: any subset of the profile fields. */
export const profileUpdateSchema = profileFields
  .partial()
  .refine((p) => Object.keys(p).length > 0, { message: 'Nothing to update' })
  .refine((p) => p.birthDate === undefined || validAge(p.birthDate), ageMessage);

export type ProfileUpdateRequest = z.infer<typeof profileUpdateSchema>;
