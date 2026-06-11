# Agent Collaboration Rules

## Project
Trading Pi OS — Single Agent Architecture

## Roles
- main: TradingPiAgent — the only agent, handles all user interaction
- assistant: Claude Code (AI assistant) — implements features, runs alignment loop

## Conflict Resolution
1. CLAUDE.md wins
2. spec.md second
3. User decision final

## AI Permissions
- Commit: allowed (with user approval)
- Push: forbidden (user handles deployment)
- npm install/test: allowed
- File editing: allowed
- Branch management: allowed (with user approval)