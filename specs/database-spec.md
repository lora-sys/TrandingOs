# database-spec.md

# Database Spec v4.1

## 1. Core Tables

- users
- workspaces
- sessions
- messages
- workflow_runs
- skill_runs
- artifacts
- approvals
- mcp_servers
- mcp_runs
- sandbox_runs
- browser_snapshots
- memory_entries
- trades
- orders
- positions
- journal_entries
- reviews
- strategies
- strategy_versions
- evolution_jobs
- skill_proposals
- skill_ratings
- data_cache

## 2. Important Fields

### workspaces

- id
- user_id
- name
- type
- context_json
- created_at

### artifacts

- id
- workspace_id
- run_id
- type
- title
- content_type
- content_json
- preview_ready
- evidence_json
- created_at

### skill_runs

- id
- skill_id
- workflow_run_id
- status
- input_json
- output_json
- error
- started_at
- completed_at

### mcp_servers

- id
- name
- capabilities_json
- permissions_json
- status
- health_status
- created_at

### sandbox_runs

- id
- run_id
- type
- status
- input_json
- output_json
- artifacts_json
- created_at

### journal_entries

- id
- workspace_id
- trade_id
- emotion
- reason
- screenshot_artifact_id
- discipline_tags
- created_at

### skill_proposals

- id
- workspace_id
- name
- manifest_json
- generated_code
- tests_json
- status
- validation_report_json
- created_at

## 3. Cache

Data cache should store:

- market data
- search results
- browser extracts
- onchain results
- research evidence

Cache keys must include provider, query, symbol, timeframe, and timestamp.
