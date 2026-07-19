export function normalizeGameTitle(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・:：!！?？'"「」]/g, "");
}

export function matchesTitle(game, query) {
  const normalizedQuery = normalizeGameTitle(query);
  return !normalizedQuery || normalizeGameTitle(game.title).includes(normalizedQuery);
}
