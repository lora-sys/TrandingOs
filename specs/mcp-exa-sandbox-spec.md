# mcp-exa-sandbox-spec.md

# MCP / Exa / AIO Sandbox Spec v4.1

## 1. Purpose

This spec restores the originally discussed core capabilities:

- MCP Hub
- Exa Search
- AIO Sandbox browser/runtime
- Search Hub
- Browser preview
- Safe execution boundary

These are first-class modules, not optional plugins.

## 2. MCP Hub

MCP Hub manages external tools and MCP servers.

Required modules:

```txt
packages/mcp-hub/
  registry/
  discovery/
  health/
  permissions/
  marketplace/
  client/
```

### MCP Registry

Stores:

- server id
- name
- version
- capabilities
- permissions
- status
- health
- cost
- risk level

### MCP Discovery

Can discover available MCP servers from:

- local config
- marketplace
- workspace config
- user-installed tools

### MCP Health Check

Runs:

- startup check
- periodic ping
- capability check
- permission check

### MCP Marketplace

Supports:

- install
- enable
- disable
- update
- remove

## 3. Exa Search

Exa is a core research provider.

Skills:

```txt
research.exa_search
research.exa_news
research.exa_similar
research.exa_docs
research.exa_github
```

Exa outputs must become Research Evidence items.

## 4. Search Hub

Search Hub unifies:

- Exa
- Tavily
- Jina Reader
- Browser extraction
- Reddit/X optional integrations
- News sources

Unified API:

```ts
search.query(input)
search.extract(url)
search.summarize(source)
search.rankSources(results)
```

## 5. AIO Sandbox

AIO Sandbox is the safe runtime.

Capabilities:

- Browser
- Shell
- Python
- Jupyter
- Files
- Screenshot
- PDF export
- MCP client

All untrusted operations must happen inside AIO Sandbox.

Do not run arbitrary browser/code on host.

## 6. Browser Skills

```txt
browser.search
browser.open
browser.extract
browser.screenshot
browser.pdf
browser.render_html
browser.preview_markdown
browser.form_fill_guarded
```

Browser skills must:

- run in AIO Sandbox
- emit execution events
- produce artifacts or evidence
- be visible in Browser Preview Panel

## 7. Acceptance Criteria

- MCP registry works.
- Exa search creates evidence.
- Browser open/extract/screenshot works via sandbox.
- Frontend can preview browser output.
- Agent cannot bypass MCP/Sandbox.
