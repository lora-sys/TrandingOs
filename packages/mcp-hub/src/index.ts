import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Backward-compatible types (used by @trading-pi/core skills)
// ---------------------------------------------------------------------------

export type McpLifecycleStatus =
  | "discovered"
  | "registered"
  | "enabled"
  | "disabled"
  | "testing"
  | "failed";

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

// ---------------------------------------------------------------------------
// New types for real MCP connections
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "sse";
  command?: string;
  args?: string[];
  url?: string;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpConnection {
  id: string;
  config: McpServerConfig;
  connected: boolean;
  tools: McpToolDefinition[];
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 helpers
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  id: number;
  result: unknown;
}

interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccessResponse
  | JsonRpcErrorResponse;

// ---------------------------------------------------------------------------
// McpHub
// ---------------------------------------------------------------------------

export class McpHub {
  private connections = new Map<string, McpConnection>();
  private processes = new Map<string, ChildProcess>();
  private sseAbortControllers = new Map<string, AbortController>();
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private nextId = 1;
  private requestTimeoutMs: number;

  constructor(options?: { requestTimeoutMs?: number }) {
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 30_000;
  }

  // ---- Public API ---------------------------------------------------------

  async connect(config: McpServerConfig): Promise<void> {
    if (this.connections.has(config.id)) {
      throw new Error(`MCP server "${config.id}" is already connected`);
    }

    const connection: McpConnection = {
      id: config.id,
      config,
      connected: false,
      tools: [],
    };
    this.connections.set(config.id, connection);

    try {
      if (config.transport === "stdio") {
        await this.connectStdio(config);
      } else if (config.transport === "sse") {
        await this.connectSse(config);
      } else {
        throw new Error(
          `Unsupported transport "${config.transport}" for server "${config.id}"`,
        );
      }
    } catch (error) {
      this.connections.delete(config.id);
      throw error;
    }
  }

  async disconnect(id: string): Promise<void> {
    this.cleanupPendingRequests(id);

    const proc = this.processes.get(id);
    if (proc) {
      proc.kill();
      this.processes.delete(id);
    }

    const controller = this.sseAbortControllers.get(id);
    if (controller) {
      controller.abort();
      this.sseAbortControllers.delete(id);
    }

    this.connections.delete(id);
  }

  disconnectAll(): void {
    for (const id of [...this.connections.keys()]) {
      this.disconnect(id).catch(() => {});
    }
  }

  getConnections(): McpConnection[] {
    return [...this.connections.values()];
  }

  getConnection(id: string): McpConnection | undefined {
    return this.connections.get(id);
  }

  getTools(serverId: string): McpToolDefinition[] {
    return this.connections.get(serverId)?.tools ?? [];
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: unknown,
  ): Promise<unknown> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`MCP server "${serverId}" is not connected`);
    }
    if (!connection.connected) {
      throw new Error(`MCP server "${serverId}" is not connected`);
    }
    return this.sendRequest(serverId, "tools/call", {
      name: toolName,
      arguments: args,
    });
  }

  async initialize(config: McpServerConfig): Promise<McpConnection> {
    await this.connect(config);
    const connection = this.connections.get(config.id);
    if (!connection) throw new Error(`Failed to initialize "${config.id}"`);
    return connection;
  }

  // ---- Stdio transport ----------------------------------------------------

  private async connectStdio(config: McpServerConfig): Promise<void> {
    if (!config.command) {
      throw new Error(
        `stdio transport requires "command" for server "${config.id}"`,
      );
    }

    const proc = spawn(config.command, config.args ?? [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.processes.set(config.id, proc);

    const emitter = new EventEmitter();
    let buffer = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            const msg = JSON.parse(trimmed) as JsonRpcMessage;
            this.dispatchMessage(config.id, msg);
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    });

    proc.stderr?.on("data", (_chunk: Buffer) => {
      // stderr is implementation-defined logging, not JSON-RPC
    });

    proc.on("error", (error) => {
      emitter.emit("error", error);
    });

    proc.on("exit", (code, signal) => {
      emitter.emit("exit", code, signal);
      this.cleanupPendingRequests(config.id);
      this.processes.delete(config.id);
    });

    // Perform MCP initialization handshake
    const initResult = await this.sendRequest(config.id, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "trading-pi-mcp-hub",
        version: "0.1.0",
      },
    });

    await this.sendNotification(config.id, "notifications/initialized", {});

    // Fetch available tools
    const toolsResult = (await this.sendRequest(
      config.id,
      "tools/list",
      {},
    )) as { tools?: { name: string; description?: string; inputSchema?: Record<string, unknown> }[] };

    const connection = this.connections.get(config.id)!;
    connection.connected = true;
    connection.tools = (toolsResult.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema ?? {},
    }));
  }

  // ---- SSE transport ------------------------------------------------------

  private async connectSse(config: McpServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error(
        `SSE transport requires "url" for server "${config.id}"`,
      );
    }

    const controller = new AbortController();
    this.sseAbortControllers.set(config.id, controller);

    // We need two endpoints for SSE transport:
    //   - GET stream:  receives SSE events (messages from server)
    //   - POST stream: sends JSON-RPC messages to server
    // The SSE endpoint may return an "endpoint" event telling us where to POST.
    let postEndpoint = config.url;

    // Start the SSE stream reader in the background
    const streamResponse = await fetch(config.url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "text/event-stream" },
    });

    if (!streamResponse.ok || !streamResponse.body) {
      throw new Error(
        `SSE connection failed for "${config.id}": HTTP ${streamResponse.status}`,
      );
    }

    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let currentEvent = "";
    let currentData = "";

    // Read the SSE stream in a non-blocking way
    const readLoop = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const parts = sseBuffer.split("\n");
          sseBuffer = parts.pop() ?? "";

          for (const line of parts) {
            const trimmed = line.trim();

            if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith("data:")) {
              currentData = trimmed.slice(5).trim();
            } else if (trimmed === "") {
              // Empty line = end of event
              if (currentEvent === "endpoint" && currentData) {
                postEndpoint = currentData;
              } else if (currentEvent === "message" && currentData) {
                try {
                  const msg = JSON.parse(currentData) as JsonRpcMessage;
                  this.dispatchMessage(config.id, msg);
                } catch {
                  // Skip malformed JSON
                }
              }
              currentEvent = "";
              currentData = "";
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        this.cleanupPendingRequests(config.id);
      }
    };

    readLoop();

    // Perform MCP initialization handshake via POST
    const initResult = await this.sendRequestHttp(
      config.id,
      postEndpoint,
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "trading-pi-mcp-hub",
          version: "0.1.0",
        },
      },
    );

    await this.sendNotificationHttp(
      postEndpoint,
      "notifications/initialized",
      {},
    );

    // Fetch tools
    const toolsResult = (await this.sendRequestHttp(
      config.id,
      postEndpoint,
      "tools/list",
      {},
    )) as {
      tools?: { name: string; description?: string; inputSchema?: Record<string, unknown> }[];
    };

    const connection = this.connections.get(config.id)!;
    connection.connected = true;
    connection.tools = (toolsResult.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema ?? {},
    }));

    // Override sendRequest for SSE to use HTTP POST
    const originalSendRequest = this.sendRequest.bind(this);
    this.sendRequest = async (
      serverId: string,
      method: string,
      params: unknown,
    ): Promise<unknown> => {
      const conn = this.connections.get(serverId);
      if (conn?.config.transport === "sse") {
        return this.sendRequestHttp(serverId, postEndpoint, method, params);
      }
      return originalSendRequest(serverId, method, params);
    };
  }

  // ---- JSON-RPC message dispatch ------------------------------------------

  private dispatchMessage(serverId: string, msg: JsonRpcMessage): void {
    if ("id" in msg && msg.id != null) {
      // This is a response (success or error)
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(msg.id);
        if ("error" in msg && msg.error) {
          pending.reject(
            new Error(
              `MCP error ${msg.error.code}: ${msg.error.message}`,
            ),
          );
        } else if ("result" in msg) {
          pending.resolve(msg.result);
        }
      }
    }
    // Notifications (no id) are ignored for now
  }

  // ---- Sending JSON-RPC over stdio ----------------------------------------

  private async sendRequest(
    serverId: string,
    method: string,
    params: unknown,
  ): Promise<unknown> {
    const proc = this.processes.get(serverId);
    if (!proc || !proc.stdin?.writable) {
      throw new Error(
        `MCP server "${serverId}" process is not running or stdin is not writable`,
      );
    }

    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `MCP request "${method}" to "${serverId}" timed out after ${this.requestTimeoutMs}ms`,
          ),
        );
      }, this.requestTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      proc.stdin!.write(JSON.stringify(request) + "\n", (writeError) => {
        if (writeError) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          reject(writeError);
        }
      });
    });
  }

  private async sendNotification(
    serverId: string,
    method: string,
    params: unknown,
  ): Promise<void> {
    const proc = this.processes.get(serverId);
    if (!proc || !proc.stdin?.writable) return;

    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    return new Promise<void>((resolve, reject) => {
      proc.stdin!.write(
        JSON.stringify(notification) + "\n",
        (writeError) => {
          if (writeError) reject(writeError);
          else resolve();
        },
      );
    });
  }

  // ---- Sending JSON-RPC over HTTP (SSE transport) ------------------------

  private async sendRequestHttp(
    serverId: string,
    endpoint: string,
    method: string,
    params: unknown,
  ): Promise<unknown> {
    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    // For HTTP transport, we send the request and expect a direct HTTP response
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `MCP HTTP request failed for "${serverId}": HTTP ${response.status}`,
      );
    }

    const text = await response.text();
    if (!text) {
      // Some SSE endpoints may return empty responses; the actual
      // response comes through the SSE stream
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(
            new Error(
              `MCP request "${method}" to "${serverId}" timed out waiting for SSE response`,
            ),
          );
        }, this.requestTimeoutMs);

        this.pendingRequests.set(id, { resolve, reject, timer });
      });
    }

    const parsed = JSON.parse(text) as JsonRpcMessage;

    if ("error" in parsed && parsed.error) {
      throw new Error(
        `MCP error ${parsed.error.code}: ${parsed.error.message}`,
      );
    }

    if ("result" in parsed) {
      return parsed.result;
    }

    return undefined;
  }

  private async sendNotificationHttp(
    endpoint: string,
    method: string,
    params: unknown,
  ): Promise<void> {
    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Notifications are fire-and-forget
    }
  }

  // ---- Cleanup -----------------------------------------------------------

  private cleanupPendingRequests(serverId: string): void {
    // We can't easily correlate pending requests to servers by ID alone,
    // but when disconnecting we clear everything
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
    }
    this.pendingRequests.clear();
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible exports (used by @trading-pi/core skills)
// ---------------------------------------------------------------------------

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
    capabilities: [
      "browser.open",
      "browser.screenshot",
      "browser.pdf",
    ],
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
        [item.name, item.description, ...(item.capabilities ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
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

export function checkMcpHealth(
  manifest: McpServerManifest,
): McpHealthResult {
  const configured = Boolean(manifest.url || manifest.command);
  return {
    status: configured ? "enabled" : "registered",
    checkedAt: new Date().toISOString(),
    configured,
    reason: configured
      ? undefined
      : "MCP server is registered in the local catalog but has no command or URL configured.",
    capabilities: manifest.capabilities ?? [],
  };
}

export function requiresMcpApproval(
  permission: McpPermission | string | undefined,
) {
  return permission === "write" || permission === "dangerous";
}
