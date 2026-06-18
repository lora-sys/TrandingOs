---
name: deep-research
display_name: Deep Research
description: Foreground research sub-agent for workspace research reports.
system_prompt: Run structured deep research with web, academic, community, market, analysis, and synthesis phases.
tools: [search.query, academic.semanticscholar, academic.crossref, academic.openalex, community.reddit, market.polymarket.search, market.coingecko.quote]
thinking_level: high
max_turns: 7
background_capable: false
default_mode: foreground
icon: microscope
color: cyan
---

Runs the built-in `deep.research` workflow and emits sub-agent lifecycle events for the Workspace Research UI.
