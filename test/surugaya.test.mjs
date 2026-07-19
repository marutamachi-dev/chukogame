import test from "node:test";
import assert from "node:assert/strict";
import { extractSurugayaOffers } from "../scripts/adapters/surugaya.mjs";

const game = {
  id: "mariokart8dx", jan: "4902370551927", title: "マリオカート８ デラックス",
  genre: "レース", cover: "MK", searches: 12245,
};

const row = (category, title, jan, id, price) => `
  <tr class="listap">
    <td><div class="category">${category}</div><div class="title"><a href="/kaitori/kaitori_detail/${id}"><h3 class="product-name">${title}</h3></a></div></td>
    <td>2020/01/01<br>${jan}<br>${id}</td>
    <td><input type="hidden" name="kakaku" value="${price}" class="kakaku-${id}"></td>
  </tr>`;

test("uses only an exact Switch software result with a numeric trade-in price", () => {
  const html = [
    row("ニンテンドースイッチソフト", "マリオカート8 デラックス", "4902370536485", "109000004", 2100),
    row("WiiUソフト", "マリオカート8", "4902370521894", "106000077", 900),
    row("ニンテンドースイッチソフト", "マリオカート8 デラックス + コース追加パス", "4902370551815", "109003254", 6500),
  ].join("");

  const offers = extractSurugayaOffers(html, game, "2026-07-20T00:00:00.000Z");

  assert.equal(offers.length, 1);
  assert.equal(offers[0].price, 2100);
  assert.equal(offers[0].sourceJan, "4902370536485");
  assert.equal(offers[0].directUrl, "https://www.suruga-ya.jp/kaitori/kaitori_detail/109000004");
});

test("excludes items without a published trade-in price", () => {
  const html = row("ニンテンドースイッチソフト", "マリオカート8 デラックス", "4902370536485", "109000004", -1);
  assert.deepEqual(extractSurugayaOffers(html, game), []);
});
