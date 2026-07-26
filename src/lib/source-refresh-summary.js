export function summarizeSourceRefresh({ adapters, attemptsBySource, failuresBySource, refreshed }) {
  return adapters
    .filter((adapter) => adapter.enabled)
    .map((adapter) => {
      const sourceOffers = refreshed.filter((offer) => offer.source === adapter.source);
      const titles = new Set(sourceOffers.map((offer) => offer.slug || offer.jan).filter(Boolean));
      return {
        name: adapter.name,
        source: adapter.source,
        attempts: attemptsBySource.get(adapter.source) || 0,
        failures: failuresBySource.get(adapter.source) || 0,
        offers: sourceOffers.length,
        titles: titles.size,
      };
    });
}
