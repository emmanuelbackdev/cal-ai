import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// All measurements are stored metric; conversion to imperial happens only for display.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
/** Grams of a macro, one decimal place. */
const grams = (name: string) => numeric(name, { precision: 7, scale: 1, mode: 'number' });

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const sexEnum = pgEnum('sex', ['male', 'female']);
export const activityLevelEnum = pgEnum('activity_level', ['sedentary', 'light', 'moderate', 'active', 'very_active']);
export const goalEnum = pgEnum('goal', ['lose', 'maintain', 'gain']);
export const unitSystemEnum = pgEnum('unit_system', ['metric', 'imperial']);
export const planSourceEnum = pgEnum('plan_source', ['ai', 'formula_fallback', 'manual']);
export const mealStatusEnum = pgEnum('meal_status', ['pending', 'analyzing', 'complete', 'failed']);
export const mealFailureReasonEnum = pgEnum('meal_failure_reason', ['not_food', 'ai_error', 'refused', 'timeout']);
export const confidenceEnum = pgEnum('confidence', ['low', 'medium', 'high']);
export const mealItemSourceEnum = pgEnum('meal_item_source', ['ai', 'user']);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** App users, mirrored from Clerk by the `sync-clerk-user` task. Clerk stays the source of truth for identity. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  /** IANA zone from the device; set by the app, not by Clerk. */
  timezone: text('timezone'),
  /** Clerk's `updated_at` for the last applied event, so out-of-order webhook retries can't overwrite newer data. */
  clerkUpdatedAt: timestamp('clerk_updated_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Onboarding answers / body stats. One per user. */
export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    sex: sexEnum('sex').notNull(),
    birthDate: date('birth_date').notNull(),
    heightCm: numeric('height_cm', { precision: 4, scale: 1, mode: 'number' }).notNull(),
    weightKg: numeric('weight_kg', { precision: 4, scale: 1, mode: 'number' }).notNull(),
    activityLevel: activityLevelEnum('activity_level').notNull(),
    goal: goalEnum('goal').notNull(),
    targetWeightKg: numeric('target_weight_kg', { precision: 4, scale: 1, mode: 'number' }),
    weeklyRateKg: numeric('weekly_rate_kg', { precision: 3, scale: 2, mode: 'number' }),
    unitSystem: unitSystemEnum('unit_system').notNull().default('metric'),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('profiles_height_range', sql`${t.heightCm} between 90 and 260`),
    check('profiles_weight_range', sql`${t.weightKg} between 25 and 350`),
    check('profiles_target_weight_range', sql`${t.targetWeightKg} is null or ${t.targetWeightKg} between 25 and 350`),
    check('profiles_weekly_rate_range', sql`${t.weeklyRateKg} is null or ${t.weeklyRateKg} between 0 and 2`),
  ]
);

/** Daily targets. Every (re)generation inserts a row; exactly one is active per user. */
export const nutritionPlans = pgTable(
  'nutrition_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    calories: integer('calories').notNull(),
    proteinG: grams('protein_g').notNull(),
    carbsG: grams('carbs_g').notNull(),
    fatG: grams('fat_g').notNull(),
    rationale: text('rationale'),
    source: planSourceEnum('source').notNull(),
    model: text('model'),
    triggerRunId: text('trigger_run_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('nutrition_plans_one_active_per_user').on(t.userId).where(sql`${t.isActive}`),
    index('nutrition_plans_user_created_idx').on(t.userId, t.createdAt),
    check('nutrition_plans_calories_range', sql`${t.calories} between 800 and 10000`),
    check('nutrition_plans_macros_non_negative', sql`${t.proteinG} >= 0 and ${t.carbsG} >= 0 and ${t.fatG} >= 0`),
  ]
);

/** A scanned meal. Totals are denormalized from its items and recomputed server-side on edit. */
export const meals = pgTable(
  'meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: mealStatusEnum('status').notNull().default('pending'),
    failureReason: mealFailureReasonEnum('failure_reason'),
    imageFileId: text('image_file_id').notNull(),
    imagePath: text('image_path').notNull(),
    /** The user's local calendar day, sent by the client; used for day bucketing and the daily scan quota. */
    localDate: date('local_date').notNull(),
    eatenAt: timestamp('eaten_at', { withTimezone: true }).notNull().defaultNow(),
    name: text('name'),
    calories: integer('calories'),
    proteinG: grams('protein_g'),
    carbsG: grams('carbs_g'),
    fatG: grams('fat_g'),
    confidence: confidenceEnum('confidence'),
    userEdited: boolean('user_edited').notNull().default(false),
    triggerRunId: text('trigger_run_id'),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('meals_user_local_date_idx').on(t.userId, t.localDate),
    check('meals_failure_reason_only_when_failed', sql`(${t.status} = 'failed') = (${t.failureReason} is not null)`),
    check(
      'meals_totals_non_negative',
      sql`coalesce(${t.calories}, 0) >= 0 and coalesce(${t.proteinG}, 0) >= 0 and coalesce(${t.carbsG}, 0) >= 0 and coalesce(${t.fatG}, 0) >= 0`
    ),
  ]
);

/** A single food detected in (or added to) a meal. */
export const mealItems = pgTable(
  'meal_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mealId: uuid('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    portionDescription: text('portion_description'),
    estimatedGrams: integer('estimated_grams'),
    calories: integer('calories').notNull(),
    proteinG: grams('protein_g').notNull(),
    carbsG: grams('carbs_g').notNull(),
    fatG: grams('fat_g').notNull(),
    source: mealItemSourceEnum('source').notNull().default('ai'),
    createdAt: createdAt(),
  },
  (t) => [
    index('meal_items_meal_position_idx').on(t.mealId, t.position),
    check(
      'meal_items_values_non_negative',
      sql`${t.calories} >= 0 and ${t.proteinG} >= 0 and ${t.carbsG} >= 0 and ${t.fatG} >= 0 and coalesce(${t.estimatedGrams}, 0) >= 0`
    ),
  ]
);

/** One weigh-in per user per day (re-logging the same day overwrites it). */
export const weightLogs = pgTable(
  'weight_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weightKg: numeric('weight_kg', { precision: 4, scale: 1, mode: 'number' }).notNull(),
    loggedOn: date('logged_on').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('weight_logs_user_day_unique').on(t.userId, t.loggedOn),
    check('weight_logs_weight_range', sql`${t.weightKg} between 25 and 350`),
  ]
);

// ---------------------------------------------------------------------------
// Relations (for `db.query.*` with `with: {...}`)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  nutritionPlans: many(nutritionPlans),
  meals: many(meals),
  weightLogs: many(weightLogs),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const nutritionPlansRelations = relations(nutritionPlans, ({ one }) => ({
  user: one(users, { fields: [nutritionPlans.userId], references: [users.id] }),
}));

export const mealsRelations = relations(meals, ({ one, many }) => ({
  user: one(users, { fields: [meals.userId], references: [users.id] }),
  items: many(mealItems),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  meal: one(meals, { fields: [mealItems.mealId], references: [meals.id] }),
}));

export const weightLogsRelations = relations(weightLogs, ({ one }) => ({
  user: one(users, { fields: [weightLogs.userId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type NutritionPlan = typeof nutritionPlans.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type MealItem = typeof mealItems.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
