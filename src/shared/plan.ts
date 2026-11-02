import { MIN_CALORIES, type NutritionTargets, type Sex } from './nutrition';

/** How far the AI plan may move calories away from the formula baseline. */
export const MAX_CALORIE_DEVIATION = 0.25;
/** How far macro calories (4P + 4C + 9F) may drift from the calorie target before macros are rescaled. */
export const MACRO_TOLERANCE = 0.05;

const macroCalories = (t: Pick<NutritionTargets, 'proteinG' | 'carbsG' | 'fatG'>) => 4 * t.proteinG + 4 * t.carbsG + 9 * t.fatG;

/**
 * Keeps an AI-generated plan safe and self-consistent (plan.md "Guardrails"):
 * calories never below the sex minimum and within ±25% of the formula baseline; macros non-negative and
 * adding up to the calories within 5%, otherwise scaled proportionally to fit.
 */
export function applyPlanGuardrails(ai: NutritionTargets, baseline: NutritionTargets, sex: Sex): NutritionTargets {
  const min = MIN_CALORIES[sex];
  const low = Math.max(min, baseline.calories * (1 - MAX_CALORIE_DEVIATION));
  const high = Math.max(min, baseline.calories * (1 + MAX_CALORIE_DEVIATION));
  const calories = Math.round(Math.min(Math.max(ai.calories, low), high) / 10) * 10;

  // Any missing (zero or negative) macro makes the split unusable: fall back to the baseline split.
  let macros =
    ai.proteinG > 0 && ai.carbsG > 0 && ai.fatG > 0
      ? { proteinG: ai.proteinG, carbsG: ai.carbsG, fatG: ai.fatG }
      : { proteinG: baseline.proteinG, carbsG: baseline.carbsG, fatG: baseline.fatG };

  const total = macroCalories(macros);
  if (Math.abs(total - calories) > calories * MACRO_TOLERANCE) {
    const scale = calories / total;
    macros = { proteinG: macros.proteinG * scale, carbsG: macros.carbsG * scale, fatG: macros.fatG * scale };
  }

  return {
    calories,
    proteinG: Math.round(macros.proteinG),
    carbsG: Math.round(macros.carbsG),
    fatG: Math.round(macros.fatG),
  };
}
