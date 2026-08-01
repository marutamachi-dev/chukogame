export function medianPurchasePrice(offers = []) {
  if (offers.length < 3) return null;
  const prices = offers.map(({ price }) => price).filter(Number.isFinite).sort((a, b) => a - b);
  if (prices.length < 3) return null;
  const middle = prices.length / 2;
  return prices.length % 2 ? prices[Math.floor(middle)] : (prices[middle - 1] + prices[middle]) / 2;
}

export function trendState(snapshots = [], days) {
  if (!Number.isInteger(days) || days < 1) throw new TypeError("days must be a positive integer");
  if (snapshots.length < 2) return { status: "collecting", change: null };
  const sorted = [...snapshots].sort((a, b) => a.observedOn.localeCompare(b.observedOn));
  const latest = sorted.at(-1);
  const target = new Date(`${latest.observedOn}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() - days);
  const baseline = sorted.find((snapshot) => snapshot.observedOn === target.toISOString().slice(0, 10));
  if (!baseline || !Number.isFinite(baseline.medianPurchasePrice) || !Number.isFinite(latest.medianPurchasePrice)) return { status: "collecting", change: null };
  return { status: "ready", change: latest.medianPurchasePrice - baseline.medianPurchasePrice };
}

export function observedDateInJst(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

const TREND_PERIODS = [
  { label: "直近7日", days: 7 },
  { label: "直近14日", days: 14 },
  { label: "直近28日", days: 28 },
];

export function buildTrendPeriods(snapshots = []) {
  return TREND_PERIODS.map(({ label, days }) => ({ label, days, ...trendState(snapshots, days) }));
}

export function groupHistorySnapshots(rows = [], activeJans = new Set()) {
  const grouped = {};
  for (const row of rows) {
    const jan = String(row.game_jan);
    const medianPurchasePrice = Number(row.median_purchase_price);
    if (!activeJans.has(jan) || !row.observed_on || !Number.isFinite(medianPurchasePrice)) continue;
    (grouped[jan] ||= []).push({ observedOn: row.observed_on, medianPurchasePrice });
  }
  for (const snapshots of Object.values(grouped)) snapshots.sort((a, b) => a.observedOn.localeCompare(b.observedOn));
  return grouped;
}
