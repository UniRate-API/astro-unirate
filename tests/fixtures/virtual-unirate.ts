// Fixture snapshot used by the vitest alias for `virtual:unirate`. The
// numbers mirror the build-time fixtures used by the integration test and
// the CI mock API so any test that imports the runtime module gets a
// deterministic snapshot.
const snapshot = Object.freeze({
  base: "USD",
  rates: {
    USD: 1,
    EUR: 0.925,
    GBP: 0.79,
    JPY: 147.32,
  },
  fetchedAt: "2026-05-16T00:00:00.000Z",
});

export default snapshot;
export const base = snapshot.base;
export const rates = snapshot.rates;
export const fetchedAt = snapshot.fetchedAt;
