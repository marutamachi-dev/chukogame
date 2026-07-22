export function buildGenreDirectory(games) {
  const counts = new Map();
  for (const game of games) {
    const name = String(game.genre || "その他").trim() || "その他";
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}
