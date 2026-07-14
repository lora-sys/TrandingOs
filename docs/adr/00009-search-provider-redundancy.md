# ADR-009: Search Provider Redundancy

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Exa, Jina, Tavily as search providers
- 15-minute cache TTL for search results
- Research Hub orchestrates across search/browser/market/memory

## Consequences
- Redundant search with cost optimization
- Search results cached to avoid redundant API calls
- Research bundles include source quality scores
