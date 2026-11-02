/** One food item as estimated by the model (snake_case to match the structured output schema). */
export type AnalyzedItem = {
  name: string;
  portion_description: string;
  estimated_grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// Per-item ceilings that no single food on a plate plausibly exceeds; anything above is a model error.
const MAX_ITEM_CALORIES = 3000;
const MAX_ITEM_MACRO_G = 300;
const MAX_ITEM_GRAMS = 3000;
const MAX_ITEMS = 20;

const clamp = (n: number, max: number) => (Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0);
const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/**
 * Cleans model output before it's stored (plan.md `analyze-meal` step 5): non-negative, clamped to sane
 * ceilings, rounded to what the DB stores, empty names dropped; then sums the meal totals.
 */
export function sanitizeMealItems(items: AnalyzedItem[]) {
  const cleaned = items
    .filter((item) => item.name.trim().length > 0)
    .slice(0, MAX_ITEMS)
    .map((item, position) => ({
      position,
      name: item.name.trim(),
      portionDescription: item.portion_description.trim() || null,
      estimatedGrams: item.estimated_grams === null ? null : Math.round(clamp(item.estimated_grams, MAX_ITEM_GRAMS)),
      calories: Math.round(clamp(item.calories, MAX_ITEM_CALORIES)),
      proteinG: oneDecimal(clamp(item.protein_g, MAX_ITEM_MACRO_G)),
      carbsG: oneDecimal(clamp(item.carbs_g, MAX_ITEM_MACRO_G)),
      fatG: oneDecimal(clamp(item.fat_g, MAX_ITEM_MACRO_G)),
    }));

  const totals = cleaned.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: oneDecimal(sum.proteinG + item.proteinG),
      carbsG: oneDecimal(sum.carbsG + item.carbsG),
      fatG: oneDecimal(sum.fatG + item.fatG),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return { items: cleaned, totals };
}
