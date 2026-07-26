# Static title pages for search acquisition

## Goal

Create a search-entry page for every currently listed Nintendo Switch domestic package title. Each page answers the immediate purchase or sale question with verified price comparisons, update conditions, and price-history status.

## Scope

- Generate a static page and a stable canonical URL for each of the 300 listed titles, for example `/games/<game-id>`.
- Rebuild all 300 pages after the daily full-price refresh.
- Generate page-specific HTML title and meta description for every title.
- Add every live title URL to the sitemap.
- Preserve the existing demand-driven 300-title rotation. A newly listed title gains a page on the next successful catalog refresh.

## Page content

1. Title identity: game title, Nintendo Switch domestic package designation, JAN, genre, and price verification timestamp.
2. Practical play cost: verified cheapest purchase price minus verified highest sale price. If either value is unavailable, show `算出できません` rather than inferring a value.
3. Price trend: show 30-day, 90-day, and 365-day changes plus a chart only from stored daily observed prices. The daily trend baseline is the median of eligible prices from multiple listed sellers, not a single seller price or the minimum price. If sufficient history or enough eligible seller prices is absent, show `価格推移を収集中` and do not draw an invented trend or change value.
4. Purchase comparison: only verified, eligible ordinary-used offers. The `最安` label is shown only among offers that satisfy the stated price basis.
5. Sale comparison: only verified reference purchase prices. The `最高` label is shown only among the displayed verified prices.
6. Price-basis disclosure: state that the current `最安` price is the lowest eligible price among the displayed sellers, while price trends use the median of eligible used-price offers across multiple sellers. State that purchase comparisons require confirmed shipping conditions and ordinary used condition; sale values are reference prices, can differ by condition, and show the confirmation time.

## Price-source and history rules

- Start with multiple verified Yahoo! Shopping sellers only. Add other marketplaces or specialist retailers only after the same eligibility and validation rules can be applied.
- A daily median purchase-price snapshot requires at least three eligible sellers. With fewer than three eligible sellers, do not record a market-trend value for that date.
- Show a 30-day, 90-day, or 365-day change only when the corresponding amount of observed history exists. Show `価格推移を収集中` independently for each unavailable period.
- Exclude offers with unconfirmed shipping, unknown condition, overseas packages, download-only editions, implausible prices, or incorrect JAN matching from both the current-price comparison and trend calculation. Record exclusions in a generated administrator report.

## Retired-title handling

- When a title leaves the demand-selected active 300, keep its canonical URL as an archive page rather than returning a 404.
- The archive page clearly states that it is no longer a daily refresh target, retains its last verified update time, and is excluded from the active-title daily snapshot job.
## Explicit exclusions

- Do not fabricate store offers, sale values, price trends, or price-change commentary.
- Do not show FAQ content or generic explanatory copy on the individual-page template.
- Do not include Switch 2, download-only, or overseas-package listings.

## URL and index management

- Render static HTML so search crawlers receive the title-specific body, title, and meta description without depending on client-side routing.
- The canonical URL, Open Graph title, description, and structured data use the same title-specific values.
- Pages for titles leaving the active 300 are retained as no-longer-updated archive pages or redirected to a relevant directory page; they are not abruptly turned into soft-404 pages.

## Data model additions

- Store one verified daily snapshot per active title: observed date, lowest eligible purchase price, median eligible purchase price across multiple sellers, highest verified sale price, eligible seller count, source counts, and catalog status.
- Keep sufficient historical snapshots for 365-day calculations.
- Derive 30/90/365 trend changes from median-purchase-price snapshots rather than storing generated summary values.

## Daily workflow

1. Rebalance the active 300 from demand signals.
2. Refresh and validate all active-title prices.
3. Append verified daily price snapshots.
4. Build catalog data, static title pages, sitemap, and structured metadata.
5. Test that every page has a unique canonical URL/title/description and no unavailable value is presented as a price.
6. Commit generated data only after the full job succeeds, then deploy.

## Failure behavior

- A price source or validation failure preserves the preceding verified data and marks the page with its actual latest confirmation time.
- A failed trend calculation renders the collecting state, never a placeholder chart.
- A failed full job does not publish partially refreshed static pages.