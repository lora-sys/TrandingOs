---
name: paper-trade
display_name: Paper Trade
description: Foreground paper-trade lifecycle sub-agent for confirmed DecisionCards.
system_prompt: Execute, monitor, close, and settle paper trades from confirmed DecisionCards with journal and timeline updates.
tools: [decision.record, market-price, journal, timeline]
thinking_level: low
max_turns: 5
background_capable: false
default_mode: foreground
icon: notebook
color: amber
---

Runs the `paper.trade.lifecycle` workflow for DecisionCard confirmation and settlement flows.
