// Streaks count consecutive local days (`YYYY-MM-DD`) with at least one analyzed meal.
// A streak that ended yesterday is still alive today until the day is over.

/** `YYYY-MM-DD` shifted by `days`, using calendar math only (no time zones involved). */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** `loggedDates`: days with an analyzed meal, any order, duplicates allowed. */
export function computeStreak(loggedDates: Iterable<string>, today: string) {
  const logged = new Set(loggedDates);
  const loggedToday = logged.has(today);

  let current = 0;
  for (let day = loggedToday ? today : addDays(today, -1); logged.has(day); day = addDays(day, -1)) {
    current += 1;
  }
  return { current, loggedToday };
}
