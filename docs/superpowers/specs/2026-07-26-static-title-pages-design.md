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
3. Price trend: show 30-day, 90-day, and 365-day changes plus a chart only from stored daily observed prices. If sufficient history is absent, show `価格推移を収集中` and do not draw an invented trend or change value.
4. Purchase comparison: only verified, eligible ordinary-used offers. The `最安` label is shown only among offers that satisfy the stated price basis.
5. Sale comparison: only verified reference purchase prices. The `最高` label is shown only among the displayed verified prices.
6. Price-basis disclosure: state that purchase comparisons require confirmed shipping conditions and ordinary used condition; sale values are reference prices, can differ by condition, and show the confirmation time.

## Explicit exclusions

- Do not fabricate store offers, sale values, price trends, or price-change commentary.
- Do not show FAQ content or generic explanatory copy on the individual-page template.
- Do not include Switch 2, download-only, or overseas-package listings.

## URL and index management

- Render static HTML so search crawlers receive the title-specific body, title, and meta description without depending on client-side routing.
- The canonical URL, Open Graph title, description, and structured data use the same title-specific values.
- Pages for titles leaving the active 300 are retained as no-longer-updated archive pages or redirected to a relevant directory page; they are not abruptly turned into soft-404 pages.

## Data model additions

- Store one verified daily snapshot per active title: observed date, lowest eligible purchase price, highest verified sale price, source counts, and catalog status.
- Keep sufficient historical snapshots for 365-day calculations.
- Derive 30/90/365 changes from snapshots rather than storing generated summary values.

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