// Stub for ccxt - server-only module, not actually used in browser
const stub = {
  pro: {},
  async: () => ({}),
  exchanges: [],
  Exchange: class { async loadMarkets() { return {}; } },
};
export default stub;
export const pro = {};
export const async = () => ({});