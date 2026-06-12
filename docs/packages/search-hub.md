# Search Hub (`packages/search-hub`)

**Status**: Canonical — matches current code

## Purpose
Multi-provider search orchestration with caching. Provides unified search interface across Exa, Jina, and Tavily providers.

## Key Concepts
- **Provider Redundancy**: Multiple search providers for resilience
- **15-Minute Cache TTL**: Search results cached to reduce API costs
- **Source Quality**: Results include source quality scores

## Providers
| Provider | Purpose | Auth |
|----------|---------|------|
| Exa | Semantic search, news, social | API key |
| Jina | Document reader | API key |
| Tavily | Web search | API key |

## Integration
Consumed by Research Hub for asset research context generation. Cache uses `repos.setCache()` with `namespace/key/ttlMs` pattern.
