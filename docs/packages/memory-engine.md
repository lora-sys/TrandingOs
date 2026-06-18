> **⚠️ DEPRECATED (v5.0 — 2026-06-14)**
>
> This package has been consolidated into `@trading-pi/core`. See `packages/core/src/memory/types.ts`.
> The original package is kept as a backward-compat shim only.
> **New code should import from `@trading-pi/core` directly.**
>
> See ADR-010 for details.

# Memory Engine (`packages/memory-engine`)

**Status**: Canonical — matches current code

## Purpose
Domain-scoped memory with workspace context. Stores and retrieves structured memory entries across different domains (market, trade, review, skill, research).

## Key Concepts
- **Domain**: Memory scope (e.g., market, trade, review, workspace)
- **Workspace**: Context namespace for memory entries
- **Source Tracking**: Each memory write includes sourceType + sourceId for traceability
- **Importance Scoring**: Memory entries scored by importance for retrieval prioritization

## API
- `POST /api/memory/write` — Write memory entry
- `POST /api/memory/query` — Query memory by domain/workspace
- `GET /api/memory` — List all memory entries

## Integration
- Automatically written from: workspace, research, trade, journal, review, strategy paths
- Consumed by: TradingPiAgent context, Review Engine, Evolution Engine

## Migration

| Before (v4.x) | After (v5.0+) |
|---------------|---------------|
| `import { MemoryEntry } from "@trading-pi/memory-engine"` | `import { MemoryEntry } from "@trading-pi/core/src/memory/types"` |
| `import { writeMemory } from "@trading-pi/memory-engine"` | `import { writeMemory } from "@trading-pi/core/src/memory/types"` |
