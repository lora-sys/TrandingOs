export type McpLifecycleStatus = "discovered" | "registered" | "enabled" | "disabled" | "testing" | "failed";
export type McpPermission = "read" | "write" | "dangerous";

export interface McpServerManifest {
  id?: string;
  name: string;
  command?: string;
  url?: string;
  description?: string;
  permission?: McpPermission;
  marketplaceKind?: "mcp";
  capabilities?: string[];
}

export interface McpHealthResult {
  status: McpLifecycleStatus;
  checkedAt: string;
  configured: boolean;
  reason?: string;
  capabilities: string[];
}

export const localMcpDiscoveryCatalog: McpServerManifest[] = [
  {
    id: "mcp_exa_search",
    name: "Exa Search MCP",
    description: "External search MCP candidate for research workflows.",
    permission: "read",
    capabilities: ["search.query", "search.extract"],
  },
  {
    id: "mcp_aio_sandbox",
    name: "AIO Sandbox MCP",
    description: "Sandbox browser and tool execution MCP candidate.",
    permission: "write",
    capabilities: ["browser.open", "browser.screenshot", "browser.pdf"],
  },
  {
    id: "mcp_local_files",
    name: "Local Files MCP",
    description: "Local document and artifact inspection MCP candidate.",
    permission: "read",
    capabilities: ["artifact.read", "document.extract"],
  },
];

export function discoverMcpServers(query = "") {
  const normalized = query.trim().toLowerCase();
  const candidates = normalized
    ? localMcpDiscoveryCatalog.filter((item) =>
        [item.name, item.description, ...(item.capabilities ?? [])].join(" ").toLowerCase().includes(normalized),
      )
    : localMcpDiscoveryCatalog;
  return {
    status: "completed" as const,
    provider: "local-catalog",
    query,
    candidates,
    discoveredAt: new Date().toISOString(),
  };
}

export function checkMcpHealth(manifest: McpServerManifest): McpHealthResult {
  const configured = Boolean(manifest.url || manifest.command);
  return {
    status: configured ? "enabled" : "registered",
    checkedAt: new Date().toISOString(),
    configured,
    reason: configured ? undefined : "MCP server is registered in the local catalog but has no command or URL configured.",
    capabilities: manifest.capabilities ?? [],
  };
}

export function requiresMcpApproval(permission: McpPermission | string | undefined) {
  return permission === "write" || permission === "dangerous";
}
