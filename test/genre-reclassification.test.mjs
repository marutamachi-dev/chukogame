import test from "node:test";
import assert from "node:assert/strict";
import games from "../src/data/game-master.json" with { type: "json" };
import { GENRES, OTHER_GENRE } from "../src/lib/genre-classifier.js";
import { GAME_COUNT } from "../src/lib/game-master.js";

test("every published game uses a supported explicit primary genre", () => {
  assert.equal(games.length, GAME_COUNT);
  assert.ok(games.every((game) => GENRES.includes(game.genre)));
  assert.equal(games.find((game) => game.title.includes("大乱闘スマッシュブラザーズ"))?.genre, "格闘");
  assert.equal(games.find((game) => /ピクミン4|Pikmin 4/.test(game.title))?.genre, "アドベンチャー");
  assert.ok(games.filter((game) => game.genre === OTHER_GENRE).length < 30);
});
