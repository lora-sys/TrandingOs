# Phase 10 - Real MCP Hub

## Goal
Upgrade MCP from a health shell into a Skill Registry extension layer.

## Scope
MCP Registry, Discovery, Health Check, Permission, Marketplace activation, audit records.

## Tasks
- [x] Add `packages/mcp-hub`.
- [x] Add MCP discovery and permission persistence.
- [x] Add MCP public APIs for discovery, registration, health, and approval.
- [x] Keep MCP calls behind Skills.
- [x] Surface MCP controls in Marketplace UI.

## Deliverables
MCP Hub package, API, Skill Registry entries, audit trail, and Marketplace UI controls.

## Acceptance Criteria
MCP candidates can be discovered, registered, health checked, and permission-gated without creating a second agent.

## Test Plan
Run typecheck/tests/build, API smoke for `/api/mcp/discover`, `/api/mcp/servers`, `/api/mcp/servers/:id/health`, then Playwright Marketplace demo.

## Demo Requirement
Save `output/playwright/phase-10-mcp-hub.png` and video when available.
