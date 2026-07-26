# カタログジャンル再分類 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 国内Nintendo Switchパッケージ版300タイトルを明示的な主ジャンルへ再分類し、「その他」への不適切な集中を解消する。

**Architecture:** ジャンル名称・許可リスト・判定規則を `src/lib/genre-classifier.js` に集約する。マスター生成時はこの分類器で仮分類する一方、現在の300件は再分類スクリプトが明示した `genre` を `game-master.json` に書き込む。`validateGameMaster` は許可外ジャンルを拒否し、再分類スクリプトは「その他」候補を必ず出力する。

**Tech Stack:** Node.js ESM、Node test runner、JSONデータ、Vite/React

## Global Constraints

- 対象は国内Nintendo Switchパッケージ版の検証済み300タイトルだけとし、Switch 2・ダウンロード専売・海外版を追加しない。
- 各タイトルは許可ジャンルのいずれか一つだけを持つ。重複掲載はしない。
- 価格取得・需要による300件選定・買取価格の取得元は変更しない。
- 不確かなジャンルを推測表示せず、新規候補で未分類なら「その他」としてレビュー対象に出力する。
- 既存の価格データとJAN・ID・URL・チャンクは変更しない。

---

### Task 1: ジャンル分類器とマスター検証を追加する

**Files:**
- Create: `src/lib/genre-classifier.js`
- Modify: `src/lib/game-master.js:1-170`
- Modify: `test/game-master.test.mjs:1-110`
- Create: `test/genre-classifier.test.mjs`

**Interfaces:**
- Produces: `GENRES`, `OTHER_GENRE`, `classifyGameGenre(title)`, `isSupportedGenre(genre)` from `src/lib/genre-classifier.js`.
- Consumes: `validateGameMaster(games, options)` from `src/lib/game-master.js`.

- [ ] **Step 1: Write the failing classification and allowed-genre tests**

```js
import { classifyGameGenre, isSupportedGenre } from "../src/lib/genre-classifier.js";

test("classifies representative Switch titles into a single primary genre", () => {
  assert.equal(classifyGameGenre("大乱闘スマッシュブラザーズ SPECIAL"), "格闘");
  assert.equal(classifyGameGenre("ピクミン4"), "アドベンチャー");
  assert.equal(classifyGameGenre("Minecraft"), "アドベンチャー");
  assert.equal(classifyGameGenre("ポケットモンスター スカーレット"), "RPG");
  assert.equal(classifyGameGenre("太鼓の達人 ドンダフルフェスティバル"), "音楽・リズム");
});

test("only the published genre vocabulary is accepted", () => {
  assert.equal(isSupportedGenre("格闘"), true);
  assert.equal(isSupportedGenre("未分類"), false);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test test/genre-classifier.test.mjs`

Expected: FAIL because `src/lib/genre-classifier.js` does not exist.

- [ ] **Step 3: Implement the classifier and validation hook**

```js
export const GENRES = Object.freeze([
  "アクション", "RPG", "アドベンチャー", "シミュレーション", "スポーツ", "レース",
  "パズル", "パーティー", "音楽・リズム", "格闘", "シューティング", "テーブル・学習", "その他",
]);
export const OTHER_GENRE = "その他";
export function classifyGameGenre(title) {
  const normalized = String(title || "").normalize("NFKC");
  return rules.find(([pattern]) => pattern.test(normalized))?.[1] || OTHER_GENRE;
}
export function isSupportedGenre(genre) { return GENRES.includes(String(genre || "").trim()); }
```

Implement an ordered series/title rule list. Place distinctive series before broad keywords. In `validateGameMaster`, append `${prefix}: unsupported genre ${game.genre}` when `isSupportedGenre(game.genre)` is false.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test test/genre-classifier.test.mjs test/game-master.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the independently testable classification layer**

Run: `git add src/lib/genre-classifier.js src/lib/game-master.js test/genre-classifier.test.mjs test/game-master.test.mjs && git commit -m "feat: add explicit game genre classifier"`

### Task 2: マスター生成と既存300件の再分類を安全に行う

**Files:**
- Modify: `scripts/build-game-master.mjs:1-125`
- Create: `scripts/reclassify-game-genres.mjs`
- Modify: `src/data/game-master.json`
- Create: `test/genre-reclassification.test.mjs`

**Interfaces:**
- Consumes: `classifyGameGenre(title)`, `GENRES`, `OTHER_GENRE`.
- Produces: 明示ジャンルを持つ `src/data/game-master.json` と、`[genre] other candidates=...` のレビュー可能な標準出力。

- [ ] **Step 1: Write a failing master-data reclassification test**

```js
import games from "../src/data/game-master.json" with { type: "json" };
import { GENRES, OTHER_GENRE } from "../src/lib/genre-classifier.js";

test("the 300 published games use one supported explicit genre", () => {
  assert.equal(games.length, 300);
  assert.ok(games.every((game) => GENRES.includes(game.genre)));
  assert.equal(games.find((game) => game.title.includes("大乱闘スマッシュブラザーズ"))?.genre, "格闘");
  assert.equal(games.find((game) => game.title === "ピクミン4")?.genre, "アドベンチャー");
  assert.ok(games.filter((game) => game.genre === OTHER_GENRE).length < 30);
});
```

- [ ] **Step 2: Run the test to verify it fails on the current 218-item その他 state**

Run: `node --test test/genre-reclassification.test.mjs`

Expected: FAIL at the explicit representative genres or the `< 30` threshold.

- [ ] **Step 3: Replace the generator-local classifier and add a deterministic reclassification script**

In `scripts/build-game-master.mjs`, remove `classifyGenre`, import `classifyGameGenre`, and set `genre: classifyGameGenre(item.title)`.

Create `scripts/reclassify-game-genres.mjs` to read `game-master.json`, apply `classifyGameGenre(game.title)` while preserving all other record fields, write UTF-8 JSON, and emit:

```js
console.log(`[genre] total=${updated.length} other=${otherTitles.length}`);
console.log(`[genre] other candidates=${JSON.stringify(otherTitles)}`);
```

Extend only the ordered rule list until all existing titles are accurately classified. Avoid generic marketing-word or single-character matches. Leave genuinely ambiguous entries as `その他`.

- [ ] **Step 4: Run the script and test the resulting master**

Run: `node scripts/reclassify-game-genres.mjs && node --test test/genre-reclassification.test.mjs`

Expected: PASS; output gives the exact small residual `その他` list.

- [ ] **Step 5: Build the generated catalog and run master/directory tests**

Run: `npm.cmd run build:catalog && node --test test/game-master.test.mjs test/genre-directory.test.mjs`

Expected: PASS; generated catalog continues to contain 300 entries.

- [ ] **Step 6: Commit reclassification and generated catalog data**

Run: `git add scripts/build-game-master.mjs scripts/reclassify-game-genres.mjs src/data/game-master.json src/data/generated-catalog.js test/genre-reclassification.test.mjs && git commit -m "fix: classify Switch catalog genres explicitly"`

### Task 3: 回帰検証と本番配信

**Files:**
- Verify: `src/data/game-master.json`, `src/data/generated-catalog.js`, `src/lib/genre-directory.js`, production routes

**Interfaces:**
- Consumes: generated 300-title catalog and genre directory.
- Produces: Vercel production deployment verified through public routes.

- [ ] **Step 1: Run complete automated tests and production build**

Run: `npm.cmd test && npm.cmd run build`

Expected: all tests pass and Vite build exits 0.

- [ ] **Step 2: Inspect the final genre distribution before publishing**

Run: `node -e "import('./src/data/game-master.json',{with:{type:'json'}}).then(({default:g})=>console.table(Object.entries(g.reduce((m,x)=>(m[x.genre]=(m[x.genre]||0)+1,m),{})).sort((a,b)=>b[1]-a[1])))"`

Expected: total is 300, all values are permitted genres, and その他 is below 30 with no obviously classifiable title.

- [ ] **Step 3: Push commits and deploy**

Run: `git push origin main && npx.cmd vercel@latest --prod --yes`

Expected: remote main accepts the commits and Vercel returns a production deployment URL aliased to `https://chukogame.vercel.app`.

- [ ] **Step 4: Verify public routes and report factual results**

Check `https://chukogame.vercel.app/genres`, `https://chukogame.vercel.app/games/nsw-3-550337`, and `https://chukogame.vercel.app/ranking`. Report final per-genre counts, residual その他 count, commit(s), production URL, and test/build/public-route verification. Do not claim price-data changes.
