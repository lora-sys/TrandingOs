export const predictionCategories = ["All", "Sports", "Politics", "Crypto", "Macro", "Entertainment"] as const;
export const cryptoSymbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"] as const;

export type NormalizedMarket = {
  id: string;
  title: string;
  yes: number;
  no: number;
  volume: number;
  change24h: number;
  settlement: string;
  category?: string;
  raw?: any;
};
