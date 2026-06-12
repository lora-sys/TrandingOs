# Research Hub (`packages/research-hub`)

**Status**: Canonical — matches current code

## Purpose
Orchestrates multi-source research bundles. Coordinates search, browser, market data, and memory to produce comprehensive asset research context.

## Key Concepts
- **Research Bundle**: Combined output from search + browser + market + memory
- **Source Quality**: Each source scored for reliability
- **Asset Context**: Structured report for a given asset/symbol

## Input
- Asset symbol or query
- Depth preference (quick vs deep)

## Output
- Context report with sources, quality scores, key findings
- Optionally generates Research Report artifact

## Integration
Triggered by `/research <symbol>` slash command and research workflow. Consumes Search Hub, Browser Layer, Market skills, and Memory Engine.
