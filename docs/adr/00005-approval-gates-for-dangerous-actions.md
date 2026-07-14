# ADR-005: Approval Gates for Dangerous Actions

**Date**: 2026-06-11
**Status**: Accepted

## Decision
- Skills marked `riskLevel: "high"` or `permission: "dangerous"` require approval
- Paper trading default; live trading disabled by default
- Real order execution blocked until explicit approval

## Consequences
- Safety barrier for financial actions
- User must explicitly enable risky operations
- Audit trail for all gated actions

---
