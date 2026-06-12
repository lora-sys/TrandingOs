# Trading Pi Data Sources Specification (MVP)
Version: v1.0
Status: MVP Approved
---
# Philosophy

Trading Pi 的目标不是成为 Bloomberg，也不是自动交易机器人。
Trading Pi 的目标是：

帮助用户发现 Alpha
↓
研究 Alpha
↓
制定计划
↓
模拟执行
↓
复盘成长

因此，数据源设计必须围绕：

* Alpha Discovery
* Research
* Decision Making
* Paper Trading
* Review

展开。

---

# Data Architecture

Market Feed
↓
Information Feed
↓
Event Feed
↓
Prediction Feed
↓
Social Feed
↓
Browser Feed (Fallback)
↓
Alpha Radar
↓
Research
↓
Trade Plan
↓
Paper Trading
↓
Journal
↓
Review

---

# Layer 1: Market Feed

负责：

"市场发生了什么？"

## CoinGecko ⭐

用途：

* 实时价格
* 市值
* 成交量
* Historical OHLC
* Trending Coins
* DEX 数据

免费情况：

* 免费 Demo Key
* 无需信用卡

额度：

* 100 requests/min

文档：

https://docs.coingecko.com/

定位：

MVP 主行情源

备注：

推荐替代 CCXT。

---

## CoinLore

用途：

* 实时价格
* 历史价格
* 市值
* 交易所列表

免费情况：

* 完全免费
* 无需 API Key

文档：

https://www.coinlore.com/cryptocurrency-data-api

定位：

行情兜底源

---

## GeckoTerminal

用途：

* DEX 行情
* Meme Coin
* 流动性池
* 新币发现

免费情况：

* 免费

文档：

https://www.geckoterminal.com/

定位：

Meme Radar

---

# Layer 2: Information Feed

负责：

"世界发生了什么？"

## Exa

用途：

* 新闻搜索
* 博客搜索
* Github 搜索
* 网页搜索
* Research

免费情况：

* 免费额度

文档：

https://docs.exa.ai/

定位：

Research 核心数据源

---

## Jina Reader

用途：

* 网页转 Markdown
* 网页正文提取
* LLM Friendly Parsing

免费情况：

* 免费

调用方式：

https://r.jina.ai/http://目标网址

定位：

Research 提取器

---

# Layer 3: Prediction Feed

负责：

"市场如何定价事件？"

## Polymarket

用途：

* 热门预测市场
* YES/NO 概率
* 成交量
* Odds

免费情况：

* 免费公开读取

文档：

https://docs.polymarket.com/

定位：

Alpha Radar 核心数据源

应用场景：

* 世界杯
* ETF
* 大选
* FOMC
* 宏观事件

---

## Kalshi

用途：

* 美国监管预测市场
* 宏观事件定价

免费情况：

* 免费公开读取

文档：

https://docs.kalshi.com/

定位：

Macro Radar

---

# Layer 4: Event Feed

负责：

"未来会发生什么？"

## CoinMarketCal

用途：

* 上币
* 解锁
* 空投
* 升级
* 活动

免费情况：

* 免费额度

文档：

https://coinmarketcal.com/

定位：

Crypto Event Radar

---

## TradingEconomics

用途：

* FOMC
* CPI
* 非农
* GDP

免费情况：

* 免费开发额度

文档：

https://developer.tradingeconomics.com/

定位：

Macro Event Radar

---

## Football API

用途：

* 世界杯赛程
* 球队数据
* 比赛结果

免费情况：

* 免费额度

文档：

https://www.api-football.com/

定位：

World Cup Radar

---

# Layer 5: Social Feed

负责：

"人们在讨论什么？"

## Reddit

用途：

* 热门帖子
* 评论
* 情绪分析

免费情况：

* 官方 API 免费

文档：

https://www.reddit.com/dev/api/

重点社区：

* r/CryptoCurrency
* r/PredictionMarkets
* r/soccer

定位：

Sentiment Radar

---

## Hacker News

用途：

* AI 热点
* 科技热点

免费情况：

* 完全免费

文档：

https://github.com/HackerNews/API

定位：

AI Alpha Radar

---

# Layer 6: Browser Feed

负责：

"没有 API 怎么办？"

## AIO Sandbox

用途：

* 打开网页
* 点击
* 滚动
* DOM 提取
* 截图
* Markdown 转换

免费情况：

* 自部署

定位：

万能适配器

原则：

优先使用 API。

API 不存在时：

AIO Sandbox 自动采集。

---

# Alpha Radar MVP

目标：

每天自动发现值得研究的机会。

输入：

"最近有什么值得关注的事件？"

输出：

Top 5 Opportunities

每条包含：

* 事件名称
* 市场
* 当前概率
* 热度
* 风险评级
* 原因摘要

例如：

① 世界杯：美国 vs 巴拉圭
来源：Polymarket
概率：51%
风险：★★☆☆☆

② SOL ETF
来源：Exa + Polymarket
概率：42%
风险：★★★☆☆

③ FOMC
来源：TradingEconomics
风险：★★★★☆

用户点击：

Research
↓
Trade Plan
↓
Paper Trade
↓
Review

形成闭环。

---

# MVP Required Sources (P0)

必须接入：

* CoinGecko
* Exa
* Jina
* Polymarket
* Reddit
* AIO Sandbox

支持：

* Alpha Radar
* Research
* Trade Plan
* Paper Trading
* Review

---

# Enhanced Sources (P1)

增强：

* CoinMarketCal
* TradingEconomics
* Football API
* Kalshi
* GeckoTerminal

支持：

* 世界杯 Radar
* Macro Radar
* Crypto Event Radar

---

# Future Sources (P2)

暂不接入：

* Glassnode
* Nansen
* Santiment
* Arkham
* Dune
* TradingView
* Bloomberg
* Twitter Official API

原因：

* 成本高
* 维护复杂
* MVP 阶段不需要

---

# Design Principle

优先级：

API
↓
公开数据源
↓
Jina 提取
↓
AIO Sandbox

目标：

以最低成本获得最高质量的 Alpha。

Trading Pi 的核心不是交易。

而是：

每天告诉用户：

"今天世界上哪里可能有值得研究和赚钱的机会。"

这就是 Personal Alpha OS。
