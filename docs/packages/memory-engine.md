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
