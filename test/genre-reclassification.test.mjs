import test from "node:test";
import assert from "node:assert/strict";
import games from "../src/data/game-master.json" with { type: "json" };
import { GENRES, OTHER_GENRE } from "../src/lib/genre-classifier.js";

test("the 300 published games use a supported explicit primary genre", () => {
  assert.equal(games.length, 300);
  assert.ok(games.every((game) => GENRES.includes(game.genre)));
  assert.equal(games.find((game) => game.title.includes("大乱闘スマッシュブラザーズ"))?.genre, "格闘");
  assert.equal(games.find((game) => /ピクミン4|Pikmin 4/.test(game.title))?.genre, "アドベンチャー");
  assert.ok(games.filter((game) => game.genre === OTHER_GENRE).length < 30);
});
