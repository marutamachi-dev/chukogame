import test from "node:test";
import assert from "node:assert/strict";
import { extractSurugayaOffers } from "../scripts/adapters/surugaya.mjs";

test("accepts a different display title when the official trade-in result has the same JAN", () => {
  const game = { id: "sample", jan: "4900000000000", title: "サンプルゲーム 通常版", genre: "RPG", cover: "SP" };
  const html = '<tr class="listap"><div class="category">ニンテンドースイッチソフト</div><h3 class="product-name">サンプルゲーム</h3><a href="/kaitori/kaitori_detail/123"></a><input name="kakaku" value="2000" class="kakaku-123">4900000000000</tr>';

  assert.equal(extractSurugayaOffers(html, game).length, 1);
});
