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