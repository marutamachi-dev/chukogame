# Data operations

1. Copy `.env.example` to `.env` and set the marketplace credentials.
2. Run `npm.cmd run refresh:sources` to fetch purchase offers.
3. Run `npm.cmd run build:catalog` to filter offers and build the frontend catalog.

The refresh job keeps the previous successful raw data if no credentials are set. The catalog builder excludes unavailable, non-package, non-Switch, and non-standard-used offers. Sale-price adapters will be added only when a permitted partner feed is available.
## Daily automation

The repository includes `.github/workflows/daily-catalog.yml`. Add these GitHub Actions secrets before enabling the workflow:

- `RAKUTEN_APPLICATION_ID`
- `RAKUTEN_ACCESS_KEY`
- `RAKUTEN_AFFILIATE_ID` (optional until affiliate approval)
- `YAHOO_SHOPPING_APP_ID`

It runs at 06:00 JST, regenerates the catalog, validates it, and commits changed price data. A Vercel project connected to the repository will deploy that commit automatically.