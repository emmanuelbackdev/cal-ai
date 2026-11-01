CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('lose', 'maintain', 'gain');--> statement-breakpoint
CREATE TYPE "public"."meal_failure_reason" AS ENUM('not_food', 'ai_error', 'refused', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."meal_item_source" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TYPE "public"."meal_status" AS ENUM('pending', 'analyzing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan_source" AS ENUM('ai', 'formula_fallback', 'manual');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"portion_description" text,
	"estimated_grams" integer,
	"calories" integer NOT NULL,
	"protein_g" numeric(7, 1) NOT NULL,
	"carbs_g" numeric(7, 1) NOT NULL,
	"fat_g" numeric(7, 1) NOT NULL,
	"source" "meal_item_source" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_items_values_non_negative" CHECK ("meal_items"."calories" >= 0 and "meal_items"."protein_g" >= 0 and "meal_items"."carbs_g" >= 0 and "meal_items"."fat_g" >= 0 and coalesce("meal_items"."estimated_grams", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "meal_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" "meal_failure_reason",
	"image_file_id" text NOT NULL,
	"image_path" text NOT NULL,
	"local_date" date NOT NULL,
	"eaten_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"calories" integer,
	"protein_g" numeric(7, 1),
	"carbs_g" numeric(7, 1),
	"fat_g" numeric(7, 1),
	"confidence" "confidence",
	"user_edited" boolean DEFAULT false NOT NULL,
	"trigger_run_id" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meals_failure_reason_only_when_failed" CHECK (("meals"."status" = 'failed') = ("meals"."failure_reason" is not null)),
	CONSTRAINT "meals_totals_non_negative" CHECK (coalesce("meals"."calories", 0) >= 0 and coalesce("meals"."protein_g", 0) >= 0 and coalesce("meals"."carbs_g", 0) >= 0 and coalesce("meals"."fat_g", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "nutrition_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" numeric(7, 1) NOT NULL,
	"carbs_g" numeric(7, 1) NOT NULL,
	"fat_g" numeric(7, 1) NOT NULL,
	"rationale" text,
	"source" "plan_source" NOT NULL,
	"model" text,
	"trigger_run_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nutrition_plans_calories_range" CHECK ("nutrition_plans"."calories" between 800 and 10000),
	CONSTRAINT "nutrition_plans_macros_non_negative" CHECK ("nutrition_plans"."protein_g" >= 0 and "nutrition_plans"."carbs_g" >= 0 and "nutrition_plans"."fat_g" >= 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sex" "sex" NOT NULL,
	"birth_date" date NOT NULL,
	"height_cm" numeric(4, 1) NOT NULL,
	"weight_kg" numeric(4, 1) NOT NULL,
	"activity_level" "activity_level" NOT NULL,
	"goal" "goal" NOT NULL,
	"target_weight_kg" numeric(4, 1),
	"weekly_rate_kg" numeric(3, 2),
	"unit_system" "unit_system" DEFAULT 'metric' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_height_range" CHECK ("profiles"."height_cm" between 90 and 260),
	CONSTRAINT "profiles_weight_range" CHECK ("profiles"."weight_kg" between 25 and 350),
	CONSTRAINT "profiles_target_weight_range" CHECK ("profiles"."target_weight_kg" is null or "profiles"."target_weight_kg" between 25 and 350),
	CONSTRAINT "profiles_weekly_rate_range" CHECK ("profiles"."weekly_rate_kg" is null or "profiles"."weekly_rate_kg" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"timezone" text,
	"clerk_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weight_kg" numeric(4, 1) NOT NULL,
	"logged_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_logs_weight_range" CHECK ("weight_logs"."weight_kg" between 25 and 350)
);
--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_items_meal_position_idx" ON "meal_items" USING btree ("meal_id","position");--> statement-breakpoint
CREATE INDEX "meals_user_local_date_idx" ON "meals" USING btree ("user_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_plans_one_active_per_user" ON "nutrition_plans" USING btree ("user_id") WHERE "nutrition_plans"."is_active";--> statement-breakpoint
CREATE INDEX "nutrition_plans_user_created_idx" ON "nutrition_plans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_logs_user_day_unique" ON "weight_logs" USING btree ("user_id","logged_on");