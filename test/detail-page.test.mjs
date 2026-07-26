import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
test("detail pages disclose collecting price-trend status and median basis", () => {
  assert.match(app, /中古相場の推移/);
  assert.match(app, /価格推移を収集中/);
  assert.match(app, /中央値/);
});