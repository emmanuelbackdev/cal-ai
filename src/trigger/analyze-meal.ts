import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AbortTaskRunError, logger, schemaTask } from '@trigger.dev/sdk';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../server/db/client';
import { mealItems, meals, type Meal } from '../server/db/schema';
import { signedImageUrl } from '../server/imagekit';
import { sanitizeMealItems } from '../shared/meal-analysis';
import { isAnthropicSetupError } from './anthropic-errors';

const MEAL_MODEL = process.env.MEAL_MODEL ?? 'claude-haiku-5-5';

const MealAnalysis = z.object({
  is_food: z.boolean().describe('False if the photo does not show food or drink'),
  meal_name: z.string().describe('Short name for the meal, e.g. "Grilled chicken with rice"'),
  items: z
    .array(
      z.object({
        name: z.string().describe('Food item, e.g. "White rice"'),
        portion_description: z.string().describe('Visible portion, e.g. "1 cup" or "2 slices"'),
        estimated_grams: z.number().nullable().describe('Estimated weight in grams, or null if unknown'),
        calories: z.number(),
        protein_g: z.number(),
        carbs_g: z.number(),
        fat_g: z.number(),
      })
    )
    .describe('Each distinct food or drink visible, with nutrition for the visible portion'),
  confidence: z.enum(['low', 'medium', 'high']).describe('How confident you are in the estimates'),
});

const SYSTEM_PROMPT = `You estimate the nutrition of meals from photos for a calorie-tracking app.

List each distinct food or drink you can see, estimate its portion from visual cues (plate size, utensils, packaging), and give calories, protein, carbs and fat for that portion. Account for visible oils, sauces and dressings. When unsure between two portion sizes, choose the more likely one and lower your confidence rather than skipping the item.

If the photo doesn't show food or drink, set is_food to false and return no items.`;

type FailureReason = NonNullable<Meal['failureReason']>;

async function markFailed(mealId: string, failureReason: FailureReason) {
  // Never overwrite a meal that already finished (e.g. a late failure from an earlier attempt).
  await db
    .update(meals)
    .set({ status: 'failed', failureReason })
    .where(and(eq(meals.id, mealId), ne(meals.status, 'complete')));
}

/**
 * ImageKit transformation applied before the photo goes to the vision model: fit within 1024×1024 keeping
 * the aspect ratio, never upscale (`c-at_max`), JPEG at quality 80. Plenty of detail for food while
 * capping image tokens (~width×height/750, so ≤ ~1,400) — a plain `w-1024` would enlarge small photos
 * and let tall portrait photos through at 1024×1365.
 */
const VISION_IMAGE_TRANSFORMATION = 'w-1024,h-1024,c-at_max,q-80,f-jpg';

async function fetchImageBase64(filePath: string) {
  const url = await signedImageUrl(filePath, { transformation: VISION_IMAGE_TRANSFORMATION, expiresInSeconds: 300 });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ImageKit returned ${response.status} for the meal photo`);
  return Buffer.from(await response.arrayBuffer()).toString('base64');
}

/**
 * Estimates a meal's nutrition from its photo with Claude and stores the items and totals
 * (plan.md "analyze-meal"). Retries transient errors; after the last attempt the meal is marked failed.
 */
export const analyzeMeal = schemaTask({
  id: 'analyze-meal',
  schema: z.object({ mealId: z.string().uuid() }),
  maxDuration: 120,
  onFailure: async ({ payload }) => {
    await markFailed(payload.mealId, 'ai_error');
  },
  run: async ({ mealId }) => {
    if (!process.env.ANTHROPIC_API_KEY) throw new AbortTaskRunError('ANTHROPIC_API_KEY is not set');

    const meal = await db.query.meals.findFirst({ where: eq(meals.id, mealId) });
    if (!meal) throw new AbortTaskRunError(`Meal ${mealId} not found`);
    if (meal.status === 'complete') return { status: 'already_complete' as const };

    await db.update(meals).set({ status: 'analyzing', failureReason: null }).where(eq(meals.id, mealId));

    const image = await fetchImageBase64(meal.imagePath);
    const client = new Anthropic(); // ANTHROPIC_API_KEY
    const response = await client.messages
      .parse({
        model: MEAL_MODEL,
        max_tokens: 8000,
        output_config: { effort: 'low', format: zodOutputFormat(MealAnalysis) },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
              { type: 'text', text: 'Estimate the nutrition of this meal.' },
            ],
          },
        ],
      })
      .catch((error: unknown) => {
        // Bad key / no credit / unknown model: retrying can't help. onFailure marks the meal failed.
        if (isAnthropicSetupError(error)) throw new AbortTaskRunError(`Anthropic rejected the request: ${error.message}`);
        throw error;
      });

    if (response.stop_reason === 'refusal') {
      logger.warn('Claude declined to analyze the photo', { category: response.stop_details?.category });
      await markFailed(mealId, 'refused');
      return { status: 'refused' as const };
    }
    const analysis = response.parsed_output;
    if (!analysis) throw new Error(`No parsable analysis (stop_reason: ${response.stop_reason})`); // retried

    const { items, totals } = sanitizeMealItems(analysis.items);
    if (!analysis.is_food || items.length === 0) {
      await markFailed(mealId, 'not_food');
      return { status: 'not_food' as const };
    }

    // One batch (a single transaction over Neon HTTP): replace the items, then complete the meal.
    await db.batch([
      db.delete(mealItems).where(eq(mealItems.mealId, mealId)),
      db.insert(mealItems).values(items.map((item) => ({ ...item, mealId, source: 'ai' as const }))),
      db
        .update(meals)
        .set({
          status: 'complete',
          failureReason: null,
          name: analysis.meal_name.trim() || 'Meal',
          ...totals,
          confidence: analysis.confidence,
          model: MEAL_MODEL,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        })
        .where(eq(meals.id, mealId)),
    ]);

    logger.info('Analyzed meal', { mealId, totals, items: items.length, confidence: analysis.confidence });
    return { status: 'complete' as const, totals };
  },
});
