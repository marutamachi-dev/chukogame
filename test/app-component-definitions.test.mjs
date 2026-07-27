import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("defines the components rendered by the home and detail pages", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(source, /function GenreNav\(/);
  assert.match(source, /function ShareBar\(/);
});

test("shows the top 100 verified games on the ranking page", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(source, /buildVerifiedRanking\(games, 100\)/);
});

test("refreshes a cover image when client-side navigation opens another game", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(source, /useEffect\(\(\) => \{\s*setSrc\(packageImageUrls\[game\.id\]/);
});
