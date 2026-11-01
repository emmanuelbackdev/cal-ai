import type { NutritionPlan, Profile, User } from '@/server/db/schema';

/** A DB row as it arrives over JSON: dates become ISO strings. */
type Json<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };

export type MeResponse = {
  user: Json<User>;
  profile: Json<Profile> | null;
  /** The active nutrition plan, or null until one has been generated. */
  plan: Json<NutritionPlan> | null;
};

export type OnboardingResponse = {
  profile: Json<Profile>;
  /** False when the user already had a profile; the existing one is kept and the submitted draft is ignored. */
  created: boolean;
};
