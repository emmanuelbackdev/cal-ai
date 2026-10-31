# Cal AI Clone — Spec & Implementation Plan

## Context

Greenfield project (`/Users/emmy/Desktop/cal-ai` is empty). Goal: an AI calorie-tracking mobile app in the style of Cal AI — user snaps a meal photo, AI returns calories + protein/carbs/fat per food item, tracked against personalized daily targets generated from onboarding answers. This document captures every decision made in the interview so implementation has no guesswork.

---

## 1. Spec Summary

### Product & users
- **Problem:** Logging food manually is tedious; people quit. Photo → nutrition in seconds removes friction.
- **User:** Any individual wanting to lose, maintain, or gain weight. Personalized via onboarding.
- **Must do well:** Photo → accurate-enough, editable per-item nutrition, fast, against a personal daily target.
- **Platforms:** iOS + Android from one Expo codebase.
- **Monetization:** Free in v1. **20 AI scans/user/day** cap (env-configurable) to protect cost.

### In scope (v1)
Onboarding → Sign-in (Clerk: Apple + Google) → AI plan reveal → Home dashboard → Scan (camera or photo library) → Meal detail/edit → Progress tab (weight logs + charts) → Profile (edit info, units, targets, delete account).

### Out of scope (v1)
Paywall/subscriptions, barcode scan, text/voice logging, standalone manual entry, water/exercise tracking, Apple Health/Google Fit, push notifications, offline capture queue, social features, web app, non-English languages, streaks/gamification.

### Locked tech stack
| Concern | Choice |
|---|---|
| App | Expo (latest stable at scaffold time — **SDK 58**, released 2026-10-15) + React Native, TypeScript, Expo Router |
| Styling | NativeWind |
| Auth | Clerk — `@clerk/expo` v3, native Sign in with Apple (`@clerk/expo/apple`) + native Google (`@clerk/expo/google`); requires dev builds (no Expo Go) |
| API | Expo Router API Routes (`+api.ts`), deployed on **EAS Hosting** |
| DB | Neon Postgres + **Drizzle ORM** (`@neondatabase/serverless` driver, drizzle-kit migrations) |
| Background jobs / AI | **Trigger.dev v4** tasks |
| AI model | **Claude Haiku 5.5** (`claude-haiku-5-5`) via `@anthropic-ai/sdk`, structured outputs (`messages.parse` + `zodOutputFormat`). Model ID in env var per task (`MEAL_MODEL`, `PLAN_MODEL`) so it can be swapped |
| Live updates | Trigger.dev Realtime (`@trigger.dev/react-hooks`) — fallback to polling if RN incompatible (see Risks) |
| Images | ImageKit — private files, signed URLs, URL transformations |
| Errors/monitoring | Sentry (`@sentry/react-native` + Trigger.dev tasks + API routes) |
| Client state | TanStack Query (server state), Zustand + persisted storage (onboarding draft, unit pref) |
| Charts | `react-native-gifted-charts` (ASSUMPTION) |
| Tests | Jest (`jest-expo`) for logic + API handlers + task logic, AI mocked |

### Core user journeys

**A. New user (first launch)**
1. Welcome → onboarding questions (one per screen, progress bar): sex, birth date, unit system, height, current weight, activity level, goal (lose/maintain/gain), target weight, desired pace. Answers saved to a **local persisted draft** (Zustand).
2. "Save your plan" → Sign in with Apple / Google (Clerk).
3. App calls `POST /api/onboarding` with the draft → creates profile → triggers `generate-plan` task → "Building your plan…" screen subscribed via Realtime.
4. **Plan reveal ("aha")**: daily calories, protein/carbs/fat, short AI rationale, projected goal date. CTA → Home.

**B. Returning user / new device:** Sign in → `GET /api/me` → profile exists → Home. If signing in with an account that already has a profile while holding a local draft → keep existing profile, discard draft (ASSUMPTION).

**C. Scan a meal**
1. Home "+" → full-screen camera (`expo-camera`) with library button (`expo-image-picker`).
2. Image resized/compressed on device (`expo-image-manipulator`, ~1280px, JPEG 0.8).
3. App gets upload auth from `POST /api/uploads/imagekit-auth`, uploads **directly to ImageKit** (`isPrivateFile: true`, folder `/{env}/users/{userId}/meals/`).
4. `POST /api/meals` → quota check → insert `pending` meal → trigger `analyze-meal` (idempotencyKey = mealId, tag `user_{id}`).
5. Navigate back to Home immediately; **"Analyzing…" card** (with local image) appears optimistically; fills in when the run completes.
6. Tap card → Meal detail: photo, name, items (portion, kcal, P/C/F), totals. Edit item numbers/portions, delete item, add item, rename meal, delete meal. Totals recompute server-side.

**D. Home dashboard:** Week strip (select day) → calories remaining ring → P/C/F progress bars → that day's meals (pending / complete / failed cards).

**E. Progress tab:** Log weight (one per day, upsert) → weight-over-time chart + daily calories (last 7/30 days) vs target. Logging weight does **not** change targets.

**F. Profile:** Edit body stats/goal/activity, unit toggle, view/override targets manually, "Regenerate plan with AI", sign out, **delete account** (Apple requirement).

### Data model (Drizzle / Postgres)
All metric internally; conversion only at display.

- **users**: `id uuid pk`, `clerk_user_id text unique not null`, `email`, `timezone text` (IANA, from device), `created_at`.
- **profiles** (1:1 users, cascade): `user_id pk/fk`, `sex enum(male,female)`, `birth_date date`, `height_cm numeric`, `weight_kg numeric`, `activity_level enum(sedentary,light,moderate,active,very_active)`, `goal enum(lose,maintain,gain)`, `target_weight_kg numeric null`, `weekly_rate_kg numeric null`, `unit_system enum(metric,imperial)`, `onboarding_completed_at`, `updated_at`. Validation: plausible ranges (height 100–250 cm, weight 30–300 kg, age 13–100).
- **nutrition_plans** (history; latest active): `id`, `user_id fk`, `calories int`, `protein_g`, `carbs_g`, `fat_g`, `rationale text`, `source enum(ai,formula_fallback,manual)`, `model text null`, `trigger_run_id null`, `is_active bool`, `created_at`. Partial unique index: one active per user.
- **meals**: `id uuid pk`, `user_id fk`, `status enum(pending,analyzing,complete,failed)`, `failure_reason enum(not_food,ai_error,refused,timeout) null`, `image_file_id`, `image_path`, `local_date date` (user-local day bucket, sent by client), `eaten_at timestamptz`, `name`, `calories`, `protein_g`, `carbs_g`, `fat_g` (denormalized totals), `confidence enum(low,medium,high)`, `user_edited bool`, `trigger_run_id`, `model`, `input_tokens`, `output_tokens`, `created_at`, `updated_at`. Index `(user_id, local_date)`.
- **meal_items**: `id`, `meal_id fk cascade`, `position int`, `name`, `portion_description`, `estimated_grams null`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `source enum(ai,user)`.
- **weight_logs**: `id`, `user_id fk`, `weight_kg`, `logged_on date`, `created_at`; unique `(user_id, logged_on)`.

Source of truth: **Postgres**. Trigger.dev Realtime is only a "something changed" signal → client refetches via TanStack Query.

### Architecture

```
Expo app (iOS/Android)
  ├─ Clerk (native Apple/Google) → session JWT
  ├─ ImageKit  ← direct upload (signed auth params from API)
  ├─ Trigger.dev Realtime ← subscribe by tag user_{id} (read-only public token from API)
  └─ fetch → Expo API Routes (EAS Hosting)
                ├─ verify Clerk JWT (@clerk/backend)
                ├─ Drizzle → Neon Postgres
                ├─ ImageKit signing (upload auth, signed URLs)
                └─ tasks.trigger(...) → Trigger.dev
                                          ├─ analyze-meal  → ImageKit (fetch image) → Claude → Neon
                                          └─ generate-plan → Claude → Neon
Sentry: app + API routes + Trigger tasks
```

Single repo, single `package.json`:
```
src/app/             Expo Router screens + src/app/api/**/+api.ts
  (onboarding)/ (auth)/ (tabs)/{index,progress,profile} scan.tsx meal/[id].tsx plan-building.tsx plan-reveal.tsx
src/components, src/hooks, src/constants, src/stores, src/lib (api client, units, imagekit)
src/server/          shared server code: auth.ts, db/{schema,client}.ts, imagekit.ts, quota.ts
src/trigger/         analyze-meal.ts, generate-plan.ts, ai/{schemas,prompts}.ts  (matches trigger.config.ts dirs)
src/shared/          zod schemas + types shared by app, API, tasks; nutrition math (Mifflin-St Jeor, units)
drizzle/             migrations
trigger.config.ts, drizzle.config.ts, app.json, eas.json
```
Business logic lives server-side (API routes + tasks). Client only formats, validates input, and does optimistic UI.

### API surface (all require Clerk bearer token)
| Route | Purpose |
|---|---|
| `GET /api/me` | Upsert user from Clerk claims; return user, profile, active plan |
| `POST /api/onboarding` | Save profile from draft, trigger `generate-plan`; returns `{runId}` |
| `PATCH /api/profile` | Update profile/units |
| `POST /api/plan/regenerate` · `PATCH /api/plan` | AI regenerate (rate-limited, 5/day) · manual override (`source=manual`) |
| `POST /api/realtime-token` | `auth.createPublicToken({ scopes: { read: { tags: ["user_{id}"] } }, expirationTime: "1h" })` |
| `POST /api/uploads/imagekit-auth` | Upload token/expire/signature + allowed folder |
| `POST /api/meals` | Quota check → create pending meal → trigger task. `429` on quota |
| `GET /api/meals?date=` | Meals + items for a local day, with signed thumbnail URLs |
| `GET/PATCH/DELETE /api/meals/:id` | Detail; edit name/items (server recomputes totals, sets `user_edited`); delete (cancels run if pending, deletes ImageKit file) |
| `POST /api/meals/:id/retry` | Re-trigger failed analysis (counts against quota) |
| `GET /api/progress?range=` · `POST /api/weights` | Daily totals + weights · upsert weight |
| `DELETE /api/account` | Delete DB rows (cascade), ImageKit user folder, Clerk user |

### Background jobs (Trigger.dev v4)

**`analyze-meal`** (payload `{ mealId }`, idempotencyKey = mealId, tags `user_{id}`, `meal_{id}`, retry maxAttempts 3 w/ backoff, maxDuration ~60s)
1. Load meal; if `complete` → no-op (idempotent). Set `analyzing`.
2. Fetch image via signed ImageKit URL with transformation (`w-1024,q-80,f-jpg`), base64-encode.
3. `client.messages.parse({ model: MEAL_MODEL, output_config: { format: zodOutputFormat(MealAnalysis), effort: "low" }, ... })` with image + system prompt. Schema: `{ is_food, meal_name, items[{name, portion_description, estimated_grams, calories, protein_g, carbs_g, fat_g}], confidence }`.
4. Check `stop_reason` (`refusal` → `failed/refused`; Haiku 5.5 has no server-side fallback). `is_food=false` → `failed/not_food`.
5. Sanitize (non-negative, clamp absurd values), compute totals; in one transaction delete existing items → insert items → update meal `complete` + token usage.
6. `onFailure` (after retries) → `failed/ai_error`. Errors to Sentry.

**`generate-plan`** (payload `{ userId }`)
1. Compute formula baseline (Mifflin-St Jeor × activity factor ± goal adjustment) in `src/shared/nutrition.ts`.
2. Claude (`PLAN_MODEL`) with profile + baseline → structured `{ calories, protein_g, carbs_g, fat_g, rationale, projected_weeks }`.
3. **Guardrails:** calories ≥ 1200 (F) / 1500 (M) and within ±25% of baseline; macro kcal (4P+4C+9F) within 5% of calories, else renormalize. Any failure/refusal → insert formula plan with `source=formula_fallback` so onboarding never blocks.
4. Deactivate previous plan, insert new active plan.

### State & data flow
- TanStack Query keys: `['me']`, `['meals', localDate]`, `['meal', id]`, `['progress', range]`.
- Optimistic: after upload, inject pending meal (with local image URI) into `['meals', today]`.
- Realtime: one `useRealtimeRunsWithTag("user_{id}")` subscription at app root (token from `/api/realtime-token`, refreshed on expiry); on any run status change → invalidate affected queries. Polling fallback: refetch every 3s while any meal is `pending/analyzing`.
- Signed image URLs change per request → `expo-image` with `cacheKey = image_file_id`.
- Day bucketing by client-sent `local_date`; user `timezone` stored for server-side quota day.

### Auth & authorization
- Clerk session token sent as `Authorization: Bearer`; every API route verifies with `@clerk/backend` and resolves `users.id`. Every query filters by `user_id` (ownership enforced server-side; never trust client IDs).
- iOS: native Apple + native Google. Android: native Google; Apple button hidden (ASSUMPTION).
- Token cache: `expo-secure-store`.
- Route guard in root layout: signed-out & no draft → onboarding; signed-in & no profile → submit draft or resume onboarding; signed-in & profile → tabs.

---

## 2. Assumptions (no firm answer given — revisit any)
1. "Cloak" = **Clerk**, "ImageCode" = **ImageKit**, "air tracking" = **error tracking**.
2. Expo **SDK 58** (latest stable at time of writing); confirm Clerk/Sentry/NativeWind compatibility at scaffold.
3. AI plan is **guardrailed by a Mifflin-St Jeor formula** baseline and falls back to it on failure.
4. Haiku 5.5 run at effort `low` (meals) / `medium` (plan); swap model via env if accuracy disappoints.
5. Image is fetched by the task and sent to Claude as base64 (not URL) — avoids Anthropic needing to reach private ImageKit URLs.
6. Android hides Sign in with Apple.
7. Existing-profile wins over local draft on sign-in.
8. Plan regeneration capped at 5/day; retries count toward the 20/day scan cap.
9. No offline capture queue — offline shows an error with retry; photo kept in memory until success.
10. Light theme only in v1 (NativeWind tokens structured for dark mode later); English only.
11. ImageKit: one account, env separated by folder prefix (`/dev`, `/prod`).
12. Charts via `react-native-gifted-charts`.
13. Onboarding asks: sex, birth date, units, height, weight, activity, goal, target weight, pace. No other questions (e.g., diet type) in v1.
14. Users must be 13+ (age validation); app shows "estimates, not medical advice" disclaimer.

## 3. Open Risks / Unknowns
1. **Trigger.dev Realtime on React Native is unverified** — docs are web-oriented; transport relies on streaming fetch. Spike in M1 (try `expo/fetch`); fallback = polling (already designed).
2. **EAS Hosting runtime** is a Workers-like environment: `@clerk/backend`, ImageKit signing (Node `crypto`), Neon WebSocket transactions, and Sentry SDK may need web-standard alternatives (Web Crypto HMAC, Neon HTTP driver + batch). Spike in M0.
3. **Haiku accuracy** on mixed plates/portions and plan quality — cheapest model; mitigated by editable items, guardrails, and env-swappable model.
4. **Safety-classifier refusals** on Haiku 5.5 have no server-side fallback → surfaced as failed card with retry.
5. **App Store review**: health-related claims (guideline 1.4.1), account deletion, privacy nutrition labels, Sign in with Apple parity.
6. **Cost abuse via multiple accounts** — per-user quota only; monitor Anthropic spend + set console spend limit.
7. **Neon scale-to-zero cold starts** may add latency to first request; consider disabling on prod.
8. **Timezone edge cases** (travel, midnight) in day bucketing and quota.
9. Clerk native Google is slated to move to `@clerk/expo-google-signin` in the next major — pin versions.

---

## 4. Implementation Milestones

**M0 — Foundations**
Expo SDK 58 project already scaffolded (Expo Router in `src/app`, `web.output: "server"` set, Trigger.dev SDK + `trigger.config.ts` present). Remaining: clear the template screens (`npm run reset-project`), NativeWind, EAS dev builds (iOS + Android), Sentry plugin, env management (`.env`, EAS env vars). Neon project with `main` + `dev` branches; Drizzle schema + first migration. Trigger.dev init (`trigger.config.ts`, dev env). ImageKit keys. GitHub Actions: typecheck, lint, jest. **Spike:** deploy a hello-world API route to EAS Hosting that verifies a Clerk token, queries Neon, and signs an ImageKit param.

**M1 — Onboarding, Auth, Plan**
Onboarding screens + persisted draft store + unit conversion (`src/shared/units.ts`). Clerk native Apple/Google. `/api/me`, `/api/onboarding`, `generate-plan` task + guardrails, `/api/realtime-token`, plan-building + reveal screens. **Spike:** Realtime in RN → decide Realtime vs polling.

**M2 — Scan pipeline**
Camera + library + permission handling, compression, ImageKit auth + direct upload, `/api/meals` with quota, `analyze-meal` task, realtime/polling update loop, optimistic pending card, failed card with retry/delete.

**M3 — Dashboard & meal detail**
Week strip, calorie ring, macro bars, meal list, meal detail/edit/add item/delete, signed thumbnails with stable cache keys, empty states.

**M4 — Progress**
Weight log (upsert), `/api/progress`, weight chart, daily calories vs target chart.

**M5 — Profile & account**
Edit profile, unit toggle, manual target override, regenerate plan, sign out, delete account (DB + ImageKit + Clerk).

**M6 — Polish & release**
Error/offline states, accessibility (labels, Dynamic Type, contrast), Sentry alerts, privacy policy + disclaimer, app icons/splash, production Clerk/Trigger/Neon envs, EAS production builds, TestFlight + Play internal testing.

## 5. Observability
- Sentry: app crashes/errors + performance trace for scan flow (capture → upload → result); API route errors; task failures (tagged `mealId`, `userId`).
- Per-meal `input_tokens`/`output_tokens`/`model` stored for cost analysis.
- Trigger.dev dashboard for run failures/durations; Sentry alert when `analyze-meal` failure rate > 10%/hour.
- Anthropic console spend limit + alert.

## 6. Environments & Delivery
- **Dev:** Neon `dev` branch, Clerk dev instance, Trigger.dev dev (`npx trigger.dev dev`), EAS development build, local `expo start`.
- **Prod:** Neon `main`, Clerk prod instance, Trigger.dev prod (`trigger deploy`), API on EAS Hosting (`eas deploy --prod`), store builds via EAS Build/Submit.
- Migrations: `drizzle-kit generate` → reviewed SQL → applied to dev, then prod in deploy step.

## 7. Verification / Definition of Done (v1)
- **Unit tests:** unit conversions, Mifflin-St Jeor baseline, plan guardrails/renormalization, meal-analysis sanitization + totals, quota logic, local-date bucketing.
- **Integration tests** (Neon test branch, Claude + ImageKit mocked): each API route (auth required, ownership enforced, 429 on quota), `analyze-meal` (success, not-food, refusal, retry idempotency), `generate-plan` (success, guardrail clamp, fallback).
- **Manual QA checklist on real iOS + Android devices:** full new-user journey; returning user on new device; scan via camera and library; permission denied paths; airplane-mode scan; edit/delete meal; pending meal survives app restart; quota hit message; weight logging + charts; unit toggle; delete account removes all data.
- CI green (typecheck, lint, tests). No unhandled errors in Sentry during a 1-week internal beta.
