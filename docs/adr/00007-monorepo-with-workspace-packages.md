# ADR-007: Monorepo with workspace Packages

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- `apps/web` for frontend + API server
- `packages/core` for agent runtime, skills, workflows
- `packages/*` for domain-specific libraries (browser-layer, journal, mcp-hub, etc.)

## Consequences
- Shared types and utilities
- Single `npm run check` across all packages
- Coordinated versioning (all internal packages at 0.1.0)

---
