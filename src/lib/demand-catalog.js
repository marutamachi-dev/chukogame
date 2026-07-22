const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REPLACEMENTS = 10;
const MIN_LISTED_DAYS = 7;

export function scoreDemand({ searchCount = 0, missCount = 0, viewCount = 0 }) {
  return Number(searchCount) + Number(missCount) * 2 + Number(viewCount);
}

function listedDays(listedFrom, today) {
  return Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${listedFrom}T00:00:00Z`)) / DAY_MS);
}

export function planCatalogReplacement({ listed, candidates, today }) {
  const listedJans = new Set(listed.map((game) => game.jan));
  const removable = listed
    .map((game) => ({ ...game, listedDays: listedDays(game.listedFrom, today) }))
    .filter((game) => game.listedDays >= MIN_LISTED_DAYS)
    .sort((a, b) => a.demandScore - b.demandScore || a.jan.localeCompare(b.jan));
  const verifiedCandidates = candidates
    .filter((game) => !listedJans.has(game.jan))
    .sort((a, b) => b.demandScore - a.demandScore || a.jan.localeCompare(b.jan));

  const removals = [];
  const additions = [];
  for (const candidate of verifiedCandidates) {
    const removal = removable.find((game) => !removals.some((selected) => selected.jan === game.jan) && candidate.demandScore > game.demandScore);
    if (!removal) continue;
    removals.push(removal);
    additions.push(candidate);
    if (removals.length === MAX_REPLACEMENTS) break;
  }
  return { removals, additions };
}
