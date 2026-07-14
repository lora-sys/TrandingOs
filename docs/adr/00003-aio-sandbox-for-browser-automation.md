# ADR-003: AIO Sandbox for Browser Automation

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Browser actions run through Docker sandbox at :8080
- Not direct Playwright in the agent process
- Evidence artifacts persisted for all browser actions

## Consequences
- Safe execution of untrusted operations
- Requires aio-sandbox container running for browser features
- Network isolation for browser automation

---
