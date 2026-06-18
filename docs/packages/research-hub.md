> **⚠️ DEPRECATED (v5.0 — 2026-06-14)**
>
> This package has been consolidated into `@trading-pi/core`. See `packages/core/src/research/bundle.ts`.
> The original package is kept as a backward-compat shim only.
> **New code should import from `@trading-pi/core` directly.**
>
> See ADR-010 for details.

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

## Migration

| Before (v4.x) | After (v5.0+) |
|---------------|---------------|
| `import { ResearchBundle } from "@trading-pi/research-hub"` | `import { ResearchBundle } from "@trading-pi/core/src/research/bundle"` |
| `import { createResearchBundle } from "@trading-pi/research-hub"` | `import { createResearchBundle } from "@trading-pi/core/src/research/bundle"` |
