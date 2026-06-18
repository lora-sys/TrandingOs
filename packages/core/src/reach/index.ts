/**
 * AgentReach — multi-platform internet access toolkit (TypeScript port).
 *
 * Pure-HTTP channels: xueqiu (stock quotes/search/hot posts/hot stocks)
 * Doctor: aggregated health check for all data sources
 */

export { checkXueqiuHealth, getHotPosts, getHotStocks, getStockQuote, searchStock, setXueqiuCookie } from "./xueqiu.js";
export { runDoctor } from "./doctor.js";
export type { DataSourceStatus, DoctorReport, SourceStatus } from "./doctor.js";
export type { XueqiuHotPost, XueqiuHotStock, XueqiuSearchResult, XueqiuStockQuote } from "./xueqiu.js";
