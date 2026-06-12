# MCP Hub (`packages/mcp-hub`)

**Status**: Canonical — matches current code

## Purpose
Central registry and management for MCP (Model Context Protocol) servers. Discovers, registers, monitors health, and enforces permissions for external MCP tools.

## Key Concepts
- **MCP Server**: External service providing tools via MCP protocol (stdio or SSE)
- **Registry**: Local SQLite-backed registry of known MCP servers
- **Health Checks**: Periodic health monitoring of registered servers
- **Permission Gates**: Each MCP tool has a permission level that requires approval for dangerous operations

## API Endpoints
- `GET /api/mcp/servers` — List registered MCP servers
- Health check integration at server level

## Current Status
- Local discovery and registration: Implemented
- Health checks: Implemented
- Permission gates: Implemented
- Network install/update/remove: Pending (requires approval UX stabilization)

## Tables (SQLite)
- `mcp_servers` — registered MCP servers with health status
