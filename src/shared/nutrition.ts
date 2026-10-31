export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Pace = 'slow' | 'recommended' | 'fast';

export type ProfileInput = {
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeightKg: number | null;
  weeklyRateKg: number | null;
};

export type NutritionTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Weekly weight change in kg for each pace option. */
export const PACE_RATES_KG: Record<Exclude<Goal, 'maintain'>, Record<Pace, number>> = {
  lose: { slow: 0.25, recommended: 0.5, fast: 0.75 },
  gain: { slow: 0.1, recommended: 0.25, fast: 0.5 },
};

const KCAL_PER_KG = 7700;
const MIN_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 };

export function ageFromBirthDate(birthDate: string, today = new Date()) {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

/** Mifflin-St Jeor BMR × activity factor, adjusted for the goal pace. */
export function calculateBaselineTargets(profile: ProfileInput, today = new Date()): NutritionTargets {
  const age = ageFromBirthDate(profile.birthDate, today);
  const bmr =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * age +
    (profile.sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTORS[profile.activityLevel];

  const rate = profile.goal === 'maintain' ? 0 : (profile.weeklyRateKg ?? 0);
  const dailyAdjustment = (rate * KCAL_PER_KG) / 7;
  const raw = tdee + (profile.goal === 'lose' ? -dailyAdjustment : dailyAdjustment);
  const calories = Math.round(Math.max(raw, MIN_CALORIES[profile.sex]) / 10) * 10;

  const proteinG = Math.round(profile.weightKg * (profile.goal === 'lose' ? 2.0 : 1.8));
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, proteinG, carbsG, fatG };
}

/** Date the target weight would be reached at the chosen pace, or null if not applicable. */
export function projectedGoalDate(profile: ProfileInput, today = new Date()) {
  if (profile.goal === 'maintain' || !profile.targetWeightKg || !profile.weeklyRateKg) return null;
  const weeks = Math.abs(profile.targetWeightKg - profile.weightKg) / profile.weeklyRateKg;
  return new Date(today.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
}
