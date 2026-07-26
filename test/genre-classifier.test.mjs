import test from "node:test";
import assert from "node:assert/strict";
import { classifyGameGenre, isSupportedGenre } from "../src/lib/genre-classifier.js";

test("classifies representative Switch titles into a single primary genre", () => {
  assert.equal(classifyGameGenre("大乱闘スマッシュブラザーズ SPECIAL"), "格闘");
  assert.equal(classifyGameGenre("ピクミン4"), "アドベンチャー");
  assert.equal(classifyGameGenre("Minecraft"), "アドベンチャー");
  assert.equal(classifyGameGenre("ポケットモンスター スカーレット"), "RPG");
  assert.equal(classifyGameGenre("太鼓の達人 ドンダフルフェスティバル"), "音楽・リズム");
});

test("accepts only the published genre vocabulary", () => {
  assert.equal(isSupportedGenre("格闘"), true);
  assert.equal(isSupportedGenre("未分類"), false);
});
