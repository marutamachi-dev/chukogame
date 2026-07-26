# Static Title Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 300 search-indexable title pages with verified multi-seller price comparisons and factual price-history states.

**Architecture:** Keep React detail rendering for interactivity, add a build-time static renderer that emits each `/games/<id>/index.html` with title-specific metadata and data. Store verified daily multi-seller snapshot rows in Supabase; daily workflow writes a snapshot only where at least three eligible sellers exist, then generates static pages and sitemap after the complete refresh succeeds.

**Tech Stack:** Vite, React, Node.js test runner, Supabase Postgres, GitHub Actions, Vercel.

## Global Constraints

- Only domestic Nintendo Switch package titles are eligible.
- Current lowest price is the lowest valid displayed offer; trend price is the median of at least three eligible Yahoo! Shopping seller offers.
- Never infer a purchase, sale, or trend price; incomplete history displays `価格推移を収集中`.
- Retired titles retain an archive URL, never become soft 404s.

---

### Task 1: Model current-price and trend calculations

**Files:**
- Create: `src/lib/price-history.js`
- Test: `test/price-history.test.mjs`

- [ ] Write tests for median from three valid purchase offers, insufficient-offer collecting state, and period availability.
- [ ] Run `node --test test/price-history.test.mjs` and confirm RED.
- [ ] Implement `medianPurchasePrice(offers)`, `trendState(snapshots, days)`, and `buildTrendSummary(game, snapshots)`.
- [ ] Re-run `node --test test/price-history.test.mjs` and confirm GREEN.
- [ ] Commit the isolated calculation change.

### Task 2: Store verified daily snapshots securely

**Files:**
- Create: `supabase/migrations/<generated>_create_chukogame_price_history.sql`
- Create: `scripts/record-price-history.mjs`
- Test: `test/price-history-workflow.test.mjs`

- [ ] Write a failing workflow test that accepts three qualifying offers and rejects fewer than three.
- [ ] Run the targeted test and confirm RED.
- [ ] Add a RLS-protected history table, service-role-only aggregate/read path, unique `(game_jan, observed_on)` snapshot, and script that upserts only verified median/current values.
- [ ] Apply and inspect the migration in Supabase; verify no anonymous read/write policy exists.
- [ ] Run targeted and full tests, then commit.

### Task 3: Add factual detail-page content

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Test: `test/detail-page.test.mjs`

- [ ] Write failing component/data tests for price-basis disclosure, unavailable comparison state, and collecting trend state.
- [ ] Run the targeted test and confirm RED.
- [ ] Add the approved layout: price-basis formula, 30/90/365 cards above the chart, no FAQ/generic explanation, and verified-only comparison labels.
- [ ] Run targeted and full tests, then commit.

### Task 4: Generate static title HTML and sitemap

**Files:**
- Create: `scripts/generate-static-title-pages.mjs`
- Modify: `scripts/generate-seo.mjs`
- Modify: `package.json`
- Test: `test/static-title-pages.test.mjs`

- [ ] Write failing tests for 300 distinct title pages, title-specific metadata, canonical URLs, and sitemap coverage.
- [ ] Run the targeted test and confirm RED.
- [ ] Generate `/games/<id>/index.html` from catalog data, with archive handling and matching title/description/canonical JSON-LD.
- [ ] Wire the generation after catalog build and run build plus full tests.
- [ ] Commit.

### Task 5: Make the daily workflow atomic and deploy

**Files:**
- Modify: `.github/workflows/daily-catalog.yml`
- Test: `test/demand-workflow.test.mjs`

- [ ] Write/extend a failing workflow test requiring history recording and static generation after full successful refresh only.
- [ ] Run targeted test and confirm RED.
- [ ] Add service-role snapshot step and stage generated static pages/sitemap only after refresh, catalog build, and tests pass.
- [ ] Run `npm test` and `npm run build`; commit and push main.
- [ ] Run the full GitHub Actions refresh, inspect generated 300-page output, deploy production, and verify a public title URL, metadata, sitemap, and no fabricated trend value.