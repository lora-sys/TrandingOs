# ADR-002: Local-First Persistence

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- SQLite via node:sqlite for all persistence
- JSONL for session logs
- File system for artifacts

## Consequences
- No external database dependency
- Reproducible local development
- Docker only for aio-sandbox, not for main app
- Future PostgreSQL migration documented but not implemented

---
