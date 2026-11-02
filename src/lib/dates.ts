const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` in the device's time zone. Meals are bucketed by the user's local day (`meals.local_date`). */
export function toLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The seven days (Sunday first) of the week containing `date`, at local midnight. */
export function weekOf(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
