import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, calculatePlayCost, isEligibleOffer } from "../src/lib/price-rules.js";

const eligible = { slug: "sample", jan: "123", title: "Sample", platform: "Nintendo Switch", format: "package", edition: "standard", condition: "used-standard", inStock: true, kind: "purchase", source: "Source", priceWithShipping: 1200, genre: "RPG", cover: "SP", url: "https://example.com/item/123", directUrl: "https://example.com/item/123", verification: "direct-listing", observedAt: "2026-07-20T00:00:00.000Z" };

test("excludes non-standard used offers", () => {
  assert.equal(isEligibleOffer({ ...eligible, title: "Sample ジャンク" }), false);
  assert.equal(isEligibleOffer({ ...eligible, inStock: false }), false);
  assert.equal(isEligibleOffer({ ...eligible, format: "download" }), false);
});

test("calculates cost from lowest purchase and highest sale", () => {
  assert.equal(calculatePlayCost([{ priceWithShipping: 1400 }, { priceWithShipping: 1200 }], [{ price: 800 }, { price: 950 }]), 250);
  assert.equal(calculatePlayCost([{ priceWithShipping: 1200 }], []), null);
});

test("groups matching JAN records into one catalog game", () => {
  const catalog = buildCatalog([eligible, { ...eligible, kind: "sale", price: 900, priceWithShipping: undefined }], "2026-07-20T00:00:00.000Z");
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].purchase[0].price, 1200);
  assert.equal(catalog[0].sale[0].price, 900);
});

test("retains the first available package image URL", () => {
  const catalog = buildCatalog([{ ...eligible, imageUrl: "https://images.example.com/cover.jpg" }], "2026-07-20T00:00:00.000Z");
  assert.equal(catalog[0].imageUrl, "https://images.example.com/cover.jpg");
});

test("does not publish unverified legacy prices", () => {
  assert.equal(isEligibleOffer({ ...eligible, verification: "legacy" }, new Date("2026-07-20T00:00:00.000Z")), false);
  assert.equal(isEligibleOffer({ ...eligible, observedAt: "2026-07-12T00:00:00.000Z" }, new Date("2026-07-20T00:00:00.000Z")), false);
});
