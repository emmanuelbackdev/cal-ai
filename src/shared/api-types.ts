import type { Meal, MealItem, NutritionPlan, Profile, User } from '@/server/db/schema';

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

export type ProfileResponse = { profile: Json<Profile> };

export type MealWithItems = Json<Meal> & {
  items: Json<MealItem>[];
  /** Signed thumbnail URL (expires after an hour; cache images by `imageFileId`). */
  imageUrl: string;
};

/** `GET /api/meals?date=YYYY-MM-DD`: that local day's meals, newest first. */
export type MealsResponse = { meals: MealWithItems[] };

/** `POST /api/meals`: the new `pending` meal; its analysis is already running. */
export type CreateMealResponse = { meal: MealWithItems };

/** `POST /api/uploads/imagekit-auth` */
export type UploadAuthResponse = { token: string; expire: number; signature: string; publicKey: string; folder: string };

/** `POST /api/realtime-token`: read-only token for runs tagged `tag`. */
export type RealtimeTokenResponse = { token: string; tag: string };

/** `GET /api/streak?today=YYYY-MM-DD` */
export type StreakResponse = {
  /** Consecutive days with an analyzed meal, ending today (or yesterday if today isn't logged yet). */
  current: number;
  loggedToday: boolean;
  /** Logged days (`YYYY-MM-DD`) within the last 7 days. */
  recentDates: string[];
};
