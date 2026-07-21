export function normalizeGameTitle(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・:：!！?？'"「」]/g, "");
}

export function matchesTitle(game, query) {
  const normalizedQuery = normalizeGameTitle(query);
  if (!normalizedQuery) return true;
  return [game.title, ...(game.aliases || [])]
    .some((value) => normalizeGameTitle(value).includes(normalizedQuery));
}
