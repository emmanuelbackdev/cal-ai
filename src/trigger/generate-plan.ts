import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AbortTaskRunError, logger, schemaTask } from '@trigger.dev/sdk';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../server/db/client';
import { nutritionPlans, profiles, type Profile } from '../server/db/schema';
import { ACTIVITY_FACTORS, ageFromBirthDate, calculateBaselineTargets, MIN_CALORIES, type NutritionTargets } from '../shared/nutrition';
import { applyPlanGuardrails, MAX_CALORIE_DEVIATION } from '../shared/plan';
import { isAnthropicSetupError } from './anthropic-errors';

const PLAN_MODEL = process.env.PLAN_MODEL ?? 'claude-haiku-5-5';

const ACTIVITY_DESCRIPTIONS: Record<Profile['activityLevel'], string> = {
  sedentary: 'sedentary (little or no exercise)',
  light: 'lightly active (exercise 1–3 days/week)',
  moderate: 'moderately active (exercise 3–5 days/week)',
  active: 'very active (exercise 6–7 days/week)',
  very_active: 'extra active (very intense daily activity or a physical job)',
};

const PlanOutput = z.object({
  calories: z.number().describe('Daily calorie target in kcal'),
  protein_g: z.number().describe('Daily protein in grams'),
  carbs_g: z.number().describe('Daily carbohydrates in grams'),
  fat_g: z.number().describe('Daily fat in grams'),
  rationale: z.string().describe('1–2 short, encouraging sentences to the user explaining the plan'),
});

const SYSTEM_PROMPT = `You create daily calorie and macronutrient targets for users of a calorie-tracking app.

You get the user's profile and a baseline from the Mifflin-St Jeor equation. Personalize the baseline:
- Keep calories within ±${MAX_CALORIE_DEVIATION * 100}% of the baseline and never below the stated minimum.
- Set protein from body weight and goal (roughly 1.6–2.2 g per kg for losing or gaining, 1.2–1.6 g per kg to maintain).
- Make the macros add up to the calories: 4 kcal per gram of protein or carbs, 9 kcal per gram of fat.
- Use whole numbers.

The rationale is shown to the user right under their numbers. Write 1–2 short sentences addressed to "you" in plain, encouraging language that explain the reasoning (goal, pace, activity). Don't repeat the numbers, give medical advice, or mention the equation by name.`;

function describeProfile(profile: Profile, baseline: NutritionTargets) {
  const lines = [
    `Sex: ${profile.sex}`,
    `Age: ${ageFromBirthDate(profile.birthDate)}`,
    `Height: ${profile.heightCm} cm`,
    `Current weight: ${profile.weightKg} kg`,
    `Activity: ${ACTIVITY_DESCRIPTIONS[profile.activityLevel]} (factor ${ACTIVITY_FACTORS[profile.activityLevel]})`,
    `Goal: ${profile.goal} weight`,
  ];
  if (profile.goal !== 'maintain') {
    if (profile.targetWeightKg !== null) lines.push(`Target weight: ${profile.targetWeightKg} kg`);
    if (profile.weeklyRateKg !== null) lines.push(`Desired pace: ${profile.weeklyRateKg} kg per week`);
  }
  lines.push(
    `Minimum calories: ${MIN_CALORIES[profile.sex]} kcal`,
    `Baseline: ${baseline.calories} kcal, ${baseline.proteinG} g protein, ${baseline.carbsG} g carbs, ${baseline.fatG} g fat`
  );
  return lines.join('\n');
}

/** Asks Claude for a plan. Returns null (and logs why) when there's no usable answer. */
async function askClaude(profile: Profile, baseline: NutritionTargets) {
  const client = new Anthropic(); // ANTHROPIC_API_KEY
  const response = await client.messages.parse({
    model: PLAN_MODEL,
    max_tokens: 8000,
    output_config: { effort: 'medium', format: zodOutputFormat(PlanOutput) },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: describeProfile(profile, baseline) }],
  });

  if (response.stop_reason === 'refusal') {
    logger.warn('Claude declined to create a plan', { category: response.stop_details?.category });
    return null;
  }
  if (!response.parsed_output) {
    logger.warn('Claude returned no parsable plan', { stopReason: response.stop_reason });
    return null;
  }
  const out = response.parsed_output;
  logger.info('Claude plan', { output: out, usage: response.usage });
  return {
    targets: { calories: out.calories, proteinG: out.protein_g, carbsG: out.carbs_g, fatG: out.fat_g },
    rationale: out.rationale.trim(),
  };
}

/**
 * Creates the user's daily targets from their profile with Claude, checked against the formula
 * (src/shared/plan.ts). If Claude fails or declines, saves the formula plan instead so onboarding never blocks.
 * The new plan becomes the user's only active one.
 */
export const generatePlan = schemaTask({
  id: 'generate-plan',
  schema: z.object({ userId: z.string().uuid() }),
  maxDuration: 120,
  run: async ({ userId }, { ctx }) => {
    // A missing key is a setup problem, not a Claude failure: fail loudly instead of quietly saving a
    // formula plan. With no plan saved, the app shows an estimate and `/api/me` retries later.
    if (!process.env.ANTHROPIC_API_KEY) throw new AbortTaskRunError('ANTHROPIC_API_KEY is not set');

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
    if (!profile) throw new AbortTaskRunError(`No profile for user ${userId}`);

    const baseline = calculateBaselineTargets(profile);
    const ai = await askClaude(profile, baseline).catch((error: unknown) => {
      // Account/setup problems (bad key, no credit, unknown model) would silently pin every user to the
      // formula; fail instead so no plan is saved and `/api/me` retries once it's fixed.
      if (isAnthropicSetupError(error)) throw new AbortTaskRunError(`Anthropic rejected the request: ${error.message}`);
      logger.error('Claude request failed; using the formula plan', { error });
      return null;
    });
    const targets = ai ? applyPlanGuardrails(ai.targets, baseline, profile.sex) : baseline;

    // One statement batch (a single transaction over Neon HTTP): retire the old plan, insert the new one.
    const [, [plan]] = await db.batch([
      db
        .update(nutritionPlans)
        .set({ isActive: false })
        .where(and(eq(nutritionPlans.userId, userId), eq(nutritionPlans.isActive, true))),
      db
        .insert(nutritionPlans)
        .values({
          userId,
          ...targets,
          rationale: ai?.rationale ?? null,
          source: ai ? 'ai' : 'formula_fallback',
          model: ai ? PLAN_MODEL : null,
          triggerRunId: ctx.run.id,
          isActive: true,
        })
        .returning({ id: nutritionPlans.id }),
    ]);

    logger.info('Saved plan', { planId: plan.id, source: ai ? 'ai' : 'formula_fallback', targets, baseline });
    return { planId: plan.id, source: ai ? 'ai' : 'formula_fallback', targets };
  },
});
