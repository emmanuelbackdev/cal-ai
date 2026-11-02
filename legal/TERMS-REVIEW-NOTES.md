# Terms of Service — evidence, open questions and reviewer notes

Internal companion to `terms.html`. **Do not publish.** It records what the Terms are based on so each clause can be
checked against the product. Line numbers refer to the codebase as of the commit after `6bb178c` (Nov 2, 2026).

> This draft is not legal advice. Have it reviewed by a qualified attorney in your jurisdiction before publishing.

## 1. Evidence inventory

| Topic | What the code does | Evidence | Terms section |
|---|---|---|---|
| What the service is | Onboarding → AI daily targets; photo → AI nutrition estimate; daily totals, recent days, streak | `src/trigger/generate-plan.ts`, `src/trigger/analyze-meal.ts:34-38`, `src/app/(tabs)/home.tsx`, `src/app/api/streak+api.ts` | 2 |
| Agreement shown at sign-in | "By continuing, you agree to our Terms of Service and Privacy Policy." | `src/app/sign-in.tsx:149` | 1 |
| Sign-in methods | Apple or Google only, via Clerk SSO; session token in secure storage | `src/app/sign-in.tsx:10,83`, `src/app/_layout.tsx:64` | 4, 11 |
| Minimum age | 13–100 enforced in onboarding UI and API validation | `src/app/onboarding/birth-date.tsx:10-11,66`, `src/shared/profile.ts:8-9,25` | 3 |
| Onboarding is mandatory | Signed-in users without a profile are routed to onboarding | `src/hooks/use-me.ts:99-103` | 4 |
| Data collected (user content) | Email, name, avatar URL, time zone; sex, birth date, height, weight, activity, goal, target weight, pace, units; meal photos and nutrition results | `src/server/db/schema.ts:50-55,69-72,127`, `src/hooks/use-scan-meal.ts` | 7 |
| Paid features | **None.** No payment, subscription or IAP code; plan.md: "Free in v1" | repo-wide search (no matches); `plan.md:16` | 10 |
| Usage limit | 20 meal analyses per account per rolling 24 h → HTTP 429 with message | `src/server/meals.ts:11`, `src/app/api/meals+api.ts:49-57` | 9 |
| Upload restricted to own folder | Server rejects photos outside the user's folder | `src/app/api/meals+api.ts:45` | 8 |
| Photo storage | Uploaded to ImageKit as private files; shown via expiring signed URLs | `src/hooks/use-scan-meal.ts:10,49`, `src/server/imagekit.ts:27,44` | 7, 11 |
| Photo pre-processing | Device resizes to ≤1280 px wide JPEG; model receives ≤1024×1024 JPEG | `src/hooks/use-scan-meal.ts:23-24`, `src/trigger/analyze-meal.ts:56` | 6 |
| AI provider | Anthropic (Claude Haiku 5.5) for meal analysis and plans | `src/trigger/analyze-meal.ts:13,86`, `src/trigger/generate-plan.ts:13` | 6, 11 |
| AI limits / failure modes | Model may refuse; non-food → `not_food`; errors → failed; user can retry | `src/trigger/analyze-meal.ts:109-120`, `src/app/api/meals/[id]/retry+api.ts:20` | 6 |
| Output sanitizing | Per-item caps (e.g. 3,000 kcal), non-negative values | `src/shared/meal-analysis.ts:13,25` | 6 |
| Plan guardrails | Calories ≥ 1,200 (F) / 1,500 (M), within ±25% of formula; formula fallback | `src/shared/nutrition.ts:39`, `src/shared/plan.ts:4`, `src/trigger/generate-plan.ts:113,127` | 5, 6 |
| Medical disclaimer in app | "Calorie and macro values are estimates, not medical advice." | `src/app/(tabs)/profile.tsx:276` | 5 |
| Other processors | Clerk (`@clerk/expo`, `@clerk/backend`), Neon (`@neondatabase/serverless`), Trigger.dev (`@trigger.dev/sdk`), Anthropic (`@anthropic-ai/sdk`), ImageKit (REST) | `package.json:6-15` | 11 |
| Account deletion | In-app Delete account → deletes Clerk user, then DB user row; cascades to profile, plans, meals, items, weight logs | `src/app/api/account+api.ts:15-16`, `src/server/db/schema.ts:68,97,124,163,191`, `src/trigger/clerk-users.ts:61` | 13 |
| **Photo deletion** | **Not implemented**: ImageKit files remain after account deletion | `src/app/api/account+api.ts:12` (TODO) | 13 (placeholder) |
| Suspension / bans | **No in-app mechanism.** Possible operationally (Clerk dashboard user ban/delete) | repo-wide search (no matches) | 13 |
| Not present (deliberately omitted) | Editing or deleting individual meals, progress/weight tracking UI, paid plans, family plans, languages other than English, Sentry | absence in `src/app/api/`, `plan.md` scope | — |

## 2. Open questions (placeholders in `terms.html`)

| Placeholder | Needed for | Assumption used in the draft |
|---|---|---|
| `[Company Legal Name]`, `[Registered address]` | Parties, contact | — |
| `[support email]` | Account issues, disputes, contact | — |
| `[Month Day, 2026]` effective / updated dates | Header | — |
| `[18 / the age of majority where you live]` | Eligibility, minors | 13+ (enforced in code), parent/guardian supervision for minors |
| `[State/Country]`, `[City, State/Country]` | Governing law and venue | Courts, **no arbitration / class-action waiver** (add only if you want one) |
| `[US$50]` | Liability cap | Greater of 12 months' fees (currently $0) or a fixed amount |
| Meal-photo deletion sentence | Section 13 | See reviewer note 1 |

## 3. Reviewer notes

1. **Fix or disclose photo retention before publishing.** The in-app confirmation says deletion removes "your account,
   profile and meal history" (`src/app/(tabs)/profile.tsx:169`), but uploaded photos stay in ImageKit. Either implement
   deletion of the user's ImageKit folder in `DELETE /api/account` (and on the `user.deleted` webhook), or state a
   retention period in section 13 and in the Privacy Policy.
2. **Termination right is operational, not in-app.** Section 13 reserves the right to suspend accounts; today that can
   only be done from the Clerk dashboard. That is normal, but confirm you're comfortable with it.
3. **Health positioning.** The draft treats the app as a general wellness tool (not a medical device). Keep marketing
   and App Store copy consistent with that (no claims about treating conditions).
4. **Minors.** The app allows ages 13+. Users under 18 using a calorie-tracking app may raise additional obligations
   (e.g. COPPA does not apply at 13+, but state and EU/UK children's codes may). Confirm the age policy with counsel.
5. **App Store clauses (section 19)** follow Apple's minimum terms for a custom EULA. Remove them if you adopt Apple's
   standard EULA instead.
6. **Anthropic named as AI provider.** Section 6 says "currently Anthropic". Update it if `MEAL_MODEL`/`PLAN_MODEL` ever
   point to a different provider.
7. **Usage limit** (section 9) is env-configurable (`MEAL_SCAN_DAILY_LIMIT`). Keep the published number in sync.
8. **Privacy Policy** is a placeholder (`privacy.html`) and is referenced throughout the Terms; publish it before
   these Terms go live.
9. Once hosted, set `EXPO_PUBLIC_TERMS_OF_SERVICE_URL` (and later `EXPO_PUBLIC_PRIVACY_POLICY_URL`) so Profile → About
   opens these pages.
