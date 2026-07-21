import test from "node:test";
import assert from "node:assert/strict";
import { matchesTitle, normalizeGameTitle } from "../src/lib/game-match.js";

const game = {
  title: "ゼルダの伝説 ティアーズ オブ ザ キングダム",
  aliases: ["ティアキン", "ゼルダ ティアキン", "TotK"],
};

test("matches formal title, aliases, and normalized spelling variants", () => {
  assert.equal(matchesTitle(game, "ティアキン"), true);
  assert.equal(matchesTitle(game, "ＴＯＴＫ"), true);
  assert.equal(matchesTitle(game, "ティアーズオブザキングダム"), true);
  assert.equal(matchesTitle(game, "ブレワイ"), false);
});

test("normalizes spaces, punctuation, width, and case", () => {
  assert.equal(normalizeGameTitle("ＡＢＣ： Game!"), "abcgame");
});
