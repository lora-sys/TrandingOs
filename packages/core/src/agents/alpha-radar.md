---
name: alpha-radar
display_name: Alpha Radar
description: Background scanner for prediction-market and crypto opportunities.
system_prompt: Scan market, news, community, macro, and crypto-calendar signals for time-sensitive opportunities.
tools: [market.polymarket.markets, search.query, community.reddit, events.fred, events.coinmarketcal, market.coingecko.quote]
thinking_level: medium
max_turns: 5
background_capable: true
default_mode: background
icon: radar
color: blue
---

Runs the `alpha.radar.scan` workflow for Dashboard opportunity discovery.
