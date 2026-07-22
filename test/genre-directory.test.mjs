import test from "node:test";
import assert from "node:assert/strict";
import { buildGenreDirectory } from "../src/lib/genre-directory.js";

test("lists every assigned genre and its count", () => {
  const directory = buildGenreDirectory([
    { genre: "RPG" }, { genre: "RPG" }, { genre: "その他" },
  ]);

  assert.deepEqual(directory, [
    { name: "RPG", count: 2 },
    { name: "その他", count: 1 },
  ]);
  assert.equal(directory.reduce((sum, genre) => sum + genre.count, 0), 3);
});
