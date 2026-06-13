export interface CacheOptions<T> {
  /** 缓存最大有效时间（毫秒） */
  maxAgeMs: number;
  /** 从外部数据源获取最新数据 */
  fetchFresh: () => Promise<T>;
  /** 将最新数据存入缓存（可选，也可在 fetchFresh 内部完成存储） */
  storeCache?: (data: T) => Promise<void>;
  /** 将缓存数据转换为 API 响应格式 */
  transformCache: (cached: any) => T;
  /** 外部获取失败时是否回退到过期缓存，默认 true */
  shouldFallbackOnError?: boolean;
  /**
   * 无缓存且外部获取失败时的兜底返回值。
   * 若不提供，默认抛出原始错误。
   * OHLCV 等技能可利用此字段返回空数据而非异常。
   */
  onErrorNoCache?: () => T;
  /**
   * 自定义缓存新鲜度判断。
   * 默认行为：检查 cached.fetched_at 是否在 maxAgeMs 内。
   * 对于数组缓存（如 OHLCV），可自定义检查逻辑。
   */
  isCachedFresh?: (cached: any, maxAgeMs: number) => boolean;
}

/**
 * 统一的缓存策略处理器
 *
 * 封装了"检查缓存 → 过期判断 → 获取新数据 → 存储缓存 → 错误回退"
 * 的完整流程，消除各市场数据技能中的重复逻辑。
 */
export async function withCacheStrategy<T>(
  getCached: () => Promise<any | null>,
  options: CacheOptions<T>,
): Promise<T> {
  const cached = await getCached();

  // 检查缓存是否存在且新鲜
  if (cached && (options.isCachedFresh?.(cached, options.maxAgeMs) ?? isCacheFresh(cached, options.maxAgeMs))) {
    return options.transformCache(cached);
  }

  // 获取新数据
  try {
    const freshData = await options.fetchFresh();
    if (options.storeCache) await options.storeCache(freshData);
    return freshData;
  } catch (error) {
    // 回退到缓存数据（即使已过期）
    if (options.shouldFallbackOnError !== false && cached) {
      return options.transformCache(cached);
    }
    // 无缓存时的兜底返回
    if (options.onErrorNoCache) {
      return options.onErrorNoCache();
    }
    throw error;
  }
}

/** 检查单条缓存记录是否新鲜 */
function isCacheFresh(cached: { fetched_at: string }, maxAgeMs: number): boolean {
  const fetchedAt = new Date(cached.fetched_at).getTime();
  return Date.now() - fetchedAt < maxAgeMs;
}
