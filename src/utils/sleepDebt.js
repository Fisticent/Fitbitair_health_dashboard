/** Cumulative sleep debt over the last N days (sum of daily deficits in hours). */
export function cumulativeSleepDebt(history, days = 7) {
  if (!history?.length) return null;
  const slice = history.slice(-days);
  const debts = slice
    .filter((d) => (d.sleep_hours ?? 0) > 0)
    .map((d) => d.sleep_debt)
    .filter((v) => v != null && v > 0);
  if (!debts.length) return 0;
  return Math.round(debts.reduce((a, b) => a + b, 0) * 10) / 10;
}
